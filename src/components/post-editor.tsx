"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Alert, Button, Card, Chip, Input, ScrollShadow, TextArea } from "@heroui/react";
import {
  ACCEPTED_POST_IMAGE_TYPES,
  MAX_POST_IMAGES,
  MAX_POST_IMAGE_BYTES,
  MAX_POST_IMAGE_DIMENSION,
  POST_IMAGE_OUTPUT_TYPE,
  type PostImageInput,
} from "../lib/post-images";
import type { DraftPostImage, PostCategory, PostDraft, PostImage, VisibilityScope } from "../lib/types";
import { categoryMeta, isPostCategory, visibilityMeta } from "../lib/types";
import { splitTags } from "../lib/utils";
import { SectionCard } from "./ui";

interface PostEditorProps {
  onSubmit: (draft: PostDraft) => void | Promise<void>;
}

interface UploadPresignResponse {
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
}

interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

interface EditorImageItem extends PostImage {
  clientId: string;
  previewUrl: string;
  status: "uploading" | "uploaded" | "error";
  error?: string;
}

const categoryOptions = Object.entries(categoryMeta) as [PostCategory, (typeof categoryMeta)[PostCategory]][];
const visibilityOptions = Object.entries(visibilityMeta) as [VisibilityScope, (typeof visibilityMeta)[VisibilityScope]][];
const STORAGE_KEY = "community-hub-post-draft";
const TITLE_MAX = 60;
const CONTENT_MAX = 1200;
const DEFAULT_TAGS = "求助, 邻里互助";
const WEBP_EXT = ".webp";

function isBlobUrl(value: string) {
  return value.startsWith("blob:");
}

function revokeBlobUrl(value: string) {
  if (isBlobUrl(value)) {
    URL.revokeObjectURL(value);
  }
}

function createClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getFilenameStem(name: string) {
  const normalized = name.replace(/\.[^.]+$/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "image";
}

function readResponseError(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body) {
    return String((body as { error?: unknown }).error ?? fallback);
  }
  return fallback;
}

async function loadImageElement(file: File) {
  const blobUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("图片读取失败"));
      element.src = blobUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("图片压缩失败"));
      },
      POST_IMAGE_OUTPUT_TYPE,
      quality,
    );
  });
}

async function compressImage(file: File): Promise<CompressedImage> {
  const image = await loadImageElement(file);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  let scale = Math.min(1, MAX_POST_IMAGE_DIMENSION / Math.max(width, height));
  let attempt = 0;

  while (attempt < 6) {
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("浏览器不支持图片压缩");
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_POST_IMAGE_BYTES) {
        return {
          blob,
          width: targetWidth,
          height: targetHeight,
        };
      }
    }

    scale *= 0.85;
    attempt += 1;
  }

  throw new Error("压缩后仍超过 2MB，请换一张更小的图片");
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (from === to || to < 0 || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function toDraftImages(items: EditorImageItem[]): DraftPostImage[] {
  return items
    .filter((item) => item.status === "uploaded")
    .map((item, index) => ({
      id: item.id,
      objectKey: item.objectKey,
      url: item.url,
      mimeType: item.mimeType,
      width: item.width,
      height: item.height,
      sizeBytes: item.sizeBytes,
      sortOrder: index,
    }));
}

export function PostEditor({ onSubmit }: PostEditorProps) {
  const [category, setCategory] = useState<PostCategory>("request");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [visibility, setVisibility] = useState<VisibilityScope>("community");
  const [anonymous, setAnonymous] = useState(false);
  const [images, setImages] = useState<EditorImageItem[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<EditorImageItem[]>([]);

  const parsedTags = useMemo(() => splitTags(tags), [tags]);
  const titleLength = title.trim().length;
  const contentLength = content.trim().length;
  const uploadedImages = useMemo(() => toDraftImages(images), [images]);
  const uploadingCount = images.filter((item) => item.status === "uploading").length;
  const failedCount = images.filter((item) => item.status === "error").length;

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) {
        revokeBlobUrl(image.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydratedDraft(true);
        return;
      }
      const draft = JSON.parse(raw) as Partial<PostDraft> & { title?: string; content?: string; tags?: string[] };
      if (isPostCategory(draft.category)) setCategory(draft.category);
      if (draft.visibility === "community" || draft.visibility === "building" || draft.visibility === "private") setVisibility(draft.visibility);
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.content === "string") setContent(draft.content);
      if (Array.isArray(draft.tags)) setTags(draft.tags.join(", "));
      if (typeof draft.anonymous === "boolean") setAnonymous(draft.anonymous);
      if (Array.isArray(draft.images)) {
        setImages(
          draft.images.map((image, index) => {
            const draftImageId = image.id || createClientId();
            return {
              ...image,
              id: draftImageId,
              clientId: draftImageId,
              previewUrl: image.url,
              status: "uploaded" as const,
              sortOrder: index,
            };
          }),
        );
      }
    } catch {
      // ignore broken local draft
    } finally {
      setHydratedDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hydratedDraft) return;
    const payload = {
      category,
      title,
      content,
      tags: parsedTags,
      visibility,
      anonymous,
      images: uploadedImages,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [anonymous, category, content, hydratedDraft, uploadedImages, parsedTags, title, visibility]);

  const clearDraft = () => {
    for (const image of images) {
      revokeBlobUrl(image.previewUrl);
    }
    setCategory("request");
    setTitle("");
    setContent("");
    setTags(DEFAULT_TAGS);
    setVisibility("community");
    setAnonymous(false);
    setImages([]);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const removeImage = (clientId: string) => {
    setImages((current) => {
      const image = current.find((item) => item.clientId === clientId);
      if (image) {
        revokeBlobUrl(image.previewUrl);
      }
      return current
        .filter((item) => item.clientId !== clientId)
        .map((item, index) => ({ ...item, sortOrder: index }));
    });
  };

  const reorderImage = (from: number, to: number) => {
    setImages((current) =>
      moveItem(current, from, to).map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    );
  };

  const uploadOneFile = async (file: File) => {
    if (!ACCEPTED_POST_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_POST_IMAGE_TYPES)[number])) {
      throw new Error("仅支持 JPG、PNG、WebP 图片");
    }

    const compressed = await compressImage(file);
    const uploadMeta = {
      filename: `${getFilenameStem(file.name)}${WEBP_EXT}`,
      mimeType: POST_IMAGE_OUTPUT_TYPE,
      sizeBytes: compressed.blob.size,
      width: compressed.width,
      height: compressed.height,
    };

    const presignResponse = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(uploadMeta),
    });
    const presignBody = (await presignResponse.json().catch(() => null)) as UploadPresignResponse | { error?: string } | null;
    if (!presignResponse.ok || !presignBody || !("uploadUrl" in presignBody)) {
      throw new Error(readResponseError(presignBody, "生成上传地址失败"));
    }

    const uploadResponse = await fetch(presignBody.uploadUrl, {
      method: "PUT",
      headers: presignBody.headers,
      body: compressed.blob,
    });

    if (!uploadResponse.ok) {
      throw new Error("图片上传失败");
    }

    return {
      objectKey: presignBody.objectKey,
      url: presignBody.publicUrl,
      mimeType: POST_IMAGE_OUTPUT_TYPE,
      width: compressed.width,
      height: compressed.height,
      sizeBytes: compressed.blob.size,
    } satisfies Omit<PostImageInput, "sortOrder">;
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    if (images.length + selectedFiles.length > MAX_POST_IMAGES) {
      setError(`最多只能上传 ${MAX_POST_IMAGES} 张图片`);
      event.target.value = "";
      return;
    }

    setError("");

    for (const file of selectedFiles) {
      const clientId = createClientId();
      const previewUrl = URL.createObjectURL(file);
      const placeholder: EditorImageItem = {
        clientId,
        id: clientId,
        objectKey: "",
        url: "",
        mimeType: POST_IMAGE_OUTPUT_TYPE,
        width: 1,
        height: 1,
        sizeBytes: 1,
        sortOrder: 0,
        previewUrl,
        status: "uploading",
      };

      setImages((current) => [
        ...current,
        {
          ...placeholder,
          sortOrder: current.length,
        },
      ]);

      try {
        const uploaded = await uploadOneFile(file);
        setImages((current) =>
          current.map((item, index) =>
            item.clientId === clientId
              ? {
                  ...item,
                  id: clientId,
                  objectKey: uploaded.objectKey,
                  url: uploaded.url,
                  mimeType: uploaded.mimeType,
                  width: uploaded.width,
                  height: uploaded.height,
                  sizeBytes: uploaded.sizeBytes,
                  sortOrder: index,
                  previewUrl: uploaded.url,
                  status: "uploaded",
                  error: undefined,
                }
              : item,
          ),
        );
        revokeBlobUrl(previewUrl);
      } catch (uploadError) {
        setImages((current) =>
          current.map((item, index) =>
            item.clientId === clientId
              ? {
                  ...item,
                  sortOrder: index,
                  status: "error",
                  error: uploadError instanceof Error ? uploadError.message : "上传失败",
                }
              : item,
          ),
        );
      }
    }

    event.target.value = "";
  };

  return (
    <form
      className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextTitle = title.trim();
        const nextContent = content.trim();
        if (!nextTitle) {
          setError("标题不能为空");
          return;
        }
        if (nextTitle.length > TITLE_MAX) {
          setError(`标题请控制在 ${TITLE_MAX} 字以内`);
          return;
        }
        if (!nextContent) {
          setError("内容不能为空");
          return;
        }
        if (nextContent.length > CONTENT_MAX) {
          setError(`正文请控制在 ${CONTENT_MAX} 字以内`);
          return;
        }
        if (parsedTags.length === 0) {
          setError("请至少填写一个标签");
          return;
        }
        if (uploadingCount > 0) {
          setError("还有图片正在上传，请稍候再发布");
          return;
        }
        if (failedCount > 0) {
          setError("有图片上传失败，请删除失败项或重新上传");
          return;
        }
        setError("");
        setSubmitting(true);
        try {
          await onSubmit({
            title: nextTitle,
            content: nextContent,
            category,
            tags: parsedTags,
            visibility,
            anonymous,
            images: uploadedImages,
          });
          clearDraft();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "发布失败");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <SectionCard className="overflow-hidden">
        <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-4 sm:px-5">
          <div>
            <p className="section-kicker">发布内容</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">发一条对邻里有帮助的帖子</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              现在支持多图上传，适合闲置展示、活动说明和现场反馈。
            </p>
          </div>
        </Card.Header>

        <Card.Content className="space-y-5 p-4 sm:p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-[0.06em] text-slate-700 uppercase">1. 类型</h2>
              <Chip size="sm" variant="soft">{categoryMeta[category].label}</Chip>
            </div>
            <div className="sm:hidden">
              <ScrollShadow className="w-full max-w-full" hideScrollBar orientation="horizontal" size={42}>
                <div className="flex min-w-max gap-2 pb-1 pr-3">
                  {categoryOptions.map(([value, meta]) => (
                    <Button
                      key={value}
                      className="h-auto min-h-[6.25rem] w-[15rem] shrink-0 snap-start justify-start px-4 py-3 text-left"
                      onPress={() => setCategory(value)}
                      type="button"
                      variant={category === value ? "primary" : "secondary"}
                    >
                      <span className="flex flex-col items-start">
                        <span className="text-base font-semibold">{meta.label}</span>
                        <span className={`mt-1 text-sm leading-5 ${category === value ? "text-slate-200" : "text-slate-500"}`}>{meta.description}</span>
                      </span>
                    </Button>
                  ))}
                </div>
              </ScrollShadow>
            </div>
            <div className="hidden gap-2 sm:flex sm:flex-row sm:flex-wrap">
              {categoryOptions.map(([value, meta]) => (
                <Button
                  key={value}
                  className="h-auto justify-start px-4 py-3 text-left"
                  onPress={() => setCategory(value)}
                  type="button"
                  variant={category === value ? "primary" : "secondary"}
                >
                  <span className="flex flex-col items-start">
                    <span className="text-base font-semibold">{meta.label}</span>
                    <span className={`mt-1 text-sm leading-5 ${category === value ? "text-slate-200" : "text-slate-500"}`}>{meta.description}</span>
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <div className="gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="space-y-5">
              <label className="space-y-2 text-sm font-semibold text-slate-800">
                <span className="flex items-center justify-between gap-3">
                  <span>2. 标题</span>
                  <span className={`text-xs ${titleLength > TITLE_MAX ? "text-[var(--danger)]" : "text-slate-400"}`}>{titleLength}/{TITLE_MAX}</span>
                </span>
                <Input
                  aria-label="帖子标题"
                  fullWidth
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：闲置：九成新餐椅一套，可自提"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-800">
                <span className="flex items-center justify-between gap-3">
                  <span>3. 内容</span>
                  <span className={`text-xs ${contentLength > CONTENT_MAX ? "text-[var(--danger)]" : "text-slate-400"}`}>{contentLength}/{CONTENT_MAX}</span>
                </span>
                <TextArea
                  aria-label="帖子内容"
                  fullWidth
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={12}
                  placeholder="补充说明、价格范围、时间要求、交易方式等"
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">4. 图片</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      最多 {MAX_POST_IMAGES} 张，自动压缩为 WebP，最长边 {MAX_POST_IMAGE_DIMENSION}px，单图不超过 2MB。
                    </p>
                  </div>
                  <Button
                    onPress={() => fileInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    选择图片
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  accept={ACCEPTED_POST_IMAGE_TYPES.join(",")}
                  className="hidden"
                  multiple
                  onChange={handleFilesSelected}
                  type="file"
                />

                {images.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {images.map((image, index) => (
                      <div key={image.clientId} className="overflow-hidden rounded-[1rem] border border-[var(--separator)] bg-white">
                        <div className="aspect-[4/3] bg-[var(--surface-muted)]">
                          {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured CDN URLs are not a fit for static remotePatterns here. */}
                          <img
                            alt={`已选图片 ${index + 1}`}
                            className="h-full w-full object-cover"
                            src={image.previewUrl}
                          />
                        </div>
                        <div className="space-y-3 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Chip size="sm" variant="soft">
                              第 {index + 1} 张
                            </Chip>
                            <Chip
                              color={image.status === "uploaded" ? "success" : image.status === "uploading" ? "warning" : "danger"}
                              size="sm"
                              variant="soft"
                            >
                              {image.status === "uploaded" ? "已上传" : image.status === "uploading" ? "上传中" : "失败"}
                            </Chip>
                          </div>
                          <p className="text-xs leading-5 text-slate-500">
                            {image.status === "uploaded"
                              ? `${image.width}×${image.height} · ${(image.sizeBytes / 1024).toFixed(0)}KB`
                              : image.error ?? "正在处理图片"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              isDisabled={index === 0}
                              onPress={() => reorderImage(index, index - 1)}
                              size="sm"
                              type="button"
                              variant="secondary"
                            >
                              前移
                            </Button>
                            <Button
                              isDisabled={index === images.length - 1}
                              onPress={() => reorderImage(index, index + 1)}
                              size="sm"
                              type="button"
                              variant="secondary"
                            >
                              后移
                            </Button>
                            <Button
                              onPress={() => removeImage(image.clientId)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-[var(--separator)] px-4 py-5 text-sm leading-6 text-slate-500">
                    还没有上传图片。卖闲置时建议至少放 1 张清晰实拍图，交流或约玩也可以补现场照片。
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
                <label className="space-y-2 text-sm font-semibold text-slate-800">
                  <span>5. 标签</span>
                  <Input
                    aria-label="帖子标签"
                    fullWidth
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="使用逗号分隔，例如：家政, 周末, 推荐"
                  />
                </label>

                <div className="space-y-2">
                  <span className="block text-sm font-semibold text-slate-800">身份展示</span>
                  <Button
                    className="w-full justify-start"
                    onPress={() => setAnonymous((value) => !value)}
                    type="button"
                    variant={anonymous ? "primary" : "secondary"}
                  >
                    {anonymous ? "匿名发布已开启" : "使用实名发布"}
                  </Button>
                  <p className="text-xs leading-5 text-slate-500">
                    {anonymous ? "帖子和评论都会显示为匿名居民。" : "默认展示你的社区账号名称。"}
                  </p>
                </div>
              </div>
            </div>

            <div className="forum-sidebar">
              <div className="forum-panel rounded-[1rem] p-4">
                <p className="text-sm font-semibold text-slate-900">6. 可见范围</p>
                <div className="mt-3 grid gap-2">
                  {visibilityOptions.map(([value, meta]) => (
                    <Button
                      key={value}
                      className="justify-start"
                      onPress={() => setVisibility(value as VisibilityScope)}
                      size="sm"
                      type="button"
                      variant={visibility === value ? "primary" : "secondary"}
                    >
                      {meta.label}
                    </Button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{visibilityMeta[visibility].description}</p>
              </div>

              <div className="info-strip rounded-[1rem] p-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">发帖建议</div>
                <ul className="bullet-list mt-3 leading-6">
                  <li>标题先写清楚核心需求，方便邻居一眼判断能否帮忙。</li>
                  <li>交易或求助帖尽量写明时间、地点、预算和联系方式偏好。</li>
                  <li>多图时把最关键的一张放在第一位，它会作为列表缩略图。</li>
                </ul>
              </div>
            </div>
          </div>

          {error ? (
            <Alert status="danger">
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-[var(--separator)] pt-4">
            <div className="flex flex-wrap gap-2">
              {parsedTags.map((tag) => (
                <Chip key={tag} size="sm" variant="secondary">
                  #{tag}
                </Chip>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button onPress={clearDraft} size="sm" type="button" variant="secondary">
                清空草稿
              </Button>
              <Button isPending={submitting} size="sm" type="submit">
                {submitting ? "发布中..." : "立即发布"}
              </Button>
            </div>
          </div>
        </Card.Content>
      </SectionCard>

      <aside className="order-last forum-sidebar xl:sticky xl:top-24">
        <SectionCard className="overflow-hidden">
          <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3">
            <div>
              <p className="section-kicker">实时预览</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">这里会显示最终展示效果，首图会进入列表缩略图。</p>
            </div>
          </Card.Header>
          <Card.Content className="space-y-4 p-4">
            <div className="rounded-[1rem] bg-[var(--surface-muted)] p-4">
              {uploadedImages[0] ? (
                <div className="mb-4 aspect-[4/3] overflow-hidden rounded-[0.9rem] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured CDN URLs are not a fit for static remotePatterns here. */}
                  <img
                    alt="首图预览"
                    className="h-full w-full object-cover"
                    src={uploadedImages[0].url}
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <Chip color="accent" size="sm" variant="primary">{categoryMeta[category].badge}</Chip>
                <Chip size="sm" variant="soft">{visibilityMeta[visibility].label}</Chip>
                {anonymous ? <Chip size="sm" variant="soft">匿名</Chip> : null}
                {uploadedImages.length > 0 ? <Chip size="sm" variant="soft">{uploadedImages.length} 张图</Chip> : null}
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{title.trim() || "你的标题会显示在这里"}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {content.trim() || "你的正文预览会显示在这里，便于在手机上发帖时检查排版。"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {parsedTags.length > 0 ? (
                  parsedTags.map((tag) => (
                    <Chip key={tag} size="sm" variant="secondary">
                      #{tag}
                    </Chip>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">尚未填写标签</span>
                )}
              </div>
            </div>

            <div className="forum-panel rounded-[1rem] border-dashed px-4 py-3 text-xs leading-6 text-slate-500">
              当前状态：
              <span className="ml-2 font-semibold text-slate-700">
                {title.trim() && content.trim() && parsedTags.length > 0 && uploadingCount === 0 && failedCount === 0
                  ? "可以发布"
                  : "还需补全内容，或等待图片上传完成"}
              </span>
            </div>
          </Card.Content>
        </SectionCard>
      </aside>
    </form>
  );
}
