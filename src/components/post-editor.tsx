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
  initialDraft?: PostDraft;
  initialCategory?: PostCategory;
  visibleCategories?: PostCategory[];
  categoryLocked?: boolean;
  editorTitle?: string;
  editorDescription?: string;
  submitLabel?: string;
  submittingLabel?: string;
  clearLabel?: string;
  persistDraft?: boolean;
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

const visibilityOptions = Object.entries(visibilityMeta) as [VisibilityScope, (typeof visibilityMeta)[VisibilityScope]][];
const STORAGE_KEY = "community-hub-post-draft";
const TITLE_MAX = 60;
const CONTENT_MAX = 1200;
const WEBP_EXT = ".webp";
const categoryEditorCopy: Record<
  PostCategory,
  {
    titlePlaceholder: string;
    contentPlaceholder: string;
    tagsPlaceholder: string;
    defaultTags: string;
    imageHint: string;
    emptyImageHint: string;
    previewTitlePlaceholder: string;
    previewContentPlaceholder: string;
    emptyTagsHint: string;
  }
> = {
  request: {
    titlePlaceholder: "例如：求推荐靠谱的空调清洗师傅",
    contentPlaceholder: "写清需求、预算、时间、地点，以及希望怎么联系你",
    tagsPlaceholder: "如：维修, 家政, 跑腿",
    defaultTags: "求助, 邻里互助",
    imageHint: "可上传现场照片、报错截图或参考图，方便邻居快速判断",
    emptyImageHint: "建议上传现场照片、报错截图或需求参考图。",
    previewTitlePlaceholder: "需求标题会显示在这里",
    previewContentPlaceholder: "把需求背景、预算、时间写清楚，会更容易得到回复。",
    emptyTagsHint: "推荐补充需求关键词",
  },
  secondhand: {
    titlePlaceholder: "例如：九成新餐椅，自提",
    contentPlaceholder: "补充成色、价格、交易方式、自提地点和方便时间",
    tagsPlaceholder: "如：闲置, 转让, 自提",
    defaultTags: "闲置, 转让",
    imageHint: "建议上传实拍图，展示成色、细节和配件情况",
    emptyImageHint: "建议上传实拍图，闲置更容易成交。",
    previewTitlePlaceholder: "闲置标题会显示在这里",
    previewContentPlaceholder: "把成色、价格和交易方式写完整，买家更容易决定。",
    emptyTagsHint: "推荐补充物品关键词",
  },
  discussion: {
    titlePlaceholder: "例如：关于地库充电桩使用的建议",
    contentPlaceholder: "说明背景、现状和你的想法，也可以补充希望大家讨论的点",
    tagsPlaceholder: "如：社区讨论, 建议, 公告",
    defaultTags: "社区讨论, 邻里交流",
    imageHint: "可上传公告截图、现场照片或示意图，方便大家理解",
    emptyImageHint: "可上传配图、公告截图或示意图。",
    previewTitlePlaceholder: "帖子标题会显示在这里",
    previewContentPlaceholder: "写下背景、观点和你希望大家讨论的重点。",
    emptyTagsHint: "推荐补充讨论关键词",
  },
  play: {
    titlePlaceholder: "例如：周六晚羽毛球 3 缺 1",
    contentPlaceholder: "写清时间、地点、人数、费用，以及怎么报名或集合",
    tagsPlaceholder: "如：约玩, 运动, 亲子",
    defaultTags: "约玩, 邻里活动",
    imageHint: "可上传活动海报、场地照片或路线图，方便大家报名",
    emptyImageHint: "可上传活动海报、场地照片或路线图。",
    previewTitlePlaceholder: "约玩标题会显示在这里",
    previewContentPlaceholder: "把时间、地点、人数和报名方式写清楚，更容易成团。",
    emptyTagsHint: "推荐补充活动关键词",
  },
};

function getDefaultTags(category: PostCategory) {
  return categoryEditorCopy[category].defaultTags;
}

function isDefaultTagsValue(value: string, category: PostCategory) {
  return value.trim() === getDefaultTags(category);
}

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

function readUploadError(error: unknown) {
  if (!(error instanceof Error)) {
    return "上传失败";
  }

  const message = error.message.trim();
  if (!message) {
    return "上传失败";
  }

  const normalized = message.toLowerCase();
  if (
    normalized === "load failed" ||
    normalized === "failed to fetch" ||
    normalized === "network request failed" ||
    normalized.includes("networkerror")
  ) {
    return "上传连接失败，请检查图片存储是否提供可访问的 HTTPS 地址";
  }

  return message;
}

async function loadImageElement(file: File) {
  const blobUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("图片读取失败，请检查文件是否损坏或格式不支持"));
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

export function PostEditor({
  onSubmit,
  initialDraft,
  initialCategory = "request",
  visibleCategories = ["request", "secondhand", "discussion", "play"],
  categoryLocked = false,
  editorTitle = "发布内容",
  editorDescription,
  submitLabel = "立即发布",
  submittingLabel = "发布中...",
  clearLabel = "清空草稿",
  persistDraft = true,
}: PostEditorProps) {
  const categoryOptions = useMemo(
    () =>
      visibleCategories.map((value) => [value, categoryMeta[value]] as [PostCategory, (typeof categoryMeta)[PostCategory]]),
    [visibleCategories],
  );
  const [category, setCategory] = useState<PostCategory>(initialDraft?.category ?? initialCategory);
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [content, setContent] = useState(initialDraft?.content ?? "");
  const [tags, setTags] = useState(
    initialDraft?.tags.join(", ") ?? getDefaultTags(initialDraft?.category ?? initialCategory),
  );
  const [visibility, setVisibility] = useState<VisibilityScope>(initialDraft?.visibility ?? "community");
  const [anonymous, setAnonymous] = useState(initialDraft?.anonymous ?? false);
  const [images, setImages] = useState<EditorImageItem[]>(() =>
    (initialDraft?.images ?? []).map((image, index) => {
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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<EditorImageItem[]>([]);
  const previousCategoryRef = useRef(category);

  const parsedTags = useMemo(() => splitTags(tags), [tags]);
  const titleLength = title.trim().length;
  const contentLength = content.trim().length;
  const uploadedImages = useMemo(() => toDraftImages(images), [images]);
  const uploadingCount = images.filter((item) => item.status === "uploading").length;
  const failedCount = images.filter((item) => item.status === "error").length;
  const currentCategoryCopy = categoryEditorCopy[category];
  const showCategoryInHeader = visibleCategories.length > 1 && !categoryLocked;
  const resolvedEditorTitle = showCategoryInHeader ? categoryMeta[category].label : editorTitle;
  const resolvedEditorDescription = showCategoryInHeader ? categoryMeta[category].description : editorDescription;

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    const previousCategory = previousCategoryRef.current;
    if (previousCategory === category) {
      return;
    }

    setTags((current) => {
      if (!current.trim() || isDefaultTagsValue(current, previousCategory)) {
        return getDefaultTags(category);
      }
      return current;
    });

    previousCategoryRef.current = category;
  }, [category]);

  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) {
        revokeBlobUrl(image.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (!persistDraft) {
      setHydratedDraft(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydratedDraft(true);
        return;
      }
      const draft = JSON.parse(raw) as Partial<PostDraft> & { title?: string; content?: string; tags?: string[] };
      if (!categoryLocked && isPostCategory(draft.category) && visibleCategories.includes(draft.category)) {
        setCategory(draft.category);
      }
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
  }, [categoryLocked, persistDraft, visibleCategories]);

  useEffect(() => {
    if (!hydratedDraft || !persistDraft) return;
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
  }, [anonymous, category, content, hydratedDraft, persistDraft, uploadedImages, parsedTags, title, visibility]);

  const clearDraft = () => {
    for (const image of images) {
      revokeBlobUrl(image.previewUrl);
    }
    setCategory(initialDraft?.category ?? initialCategory);
    setTitle(initialDraft?.title ?? "");
    setContent(initialDraft?.content ?? "");
    setTags(initialDraft?.tags.join(", ") ?? getDefaultTags(initialDraft?.category ?? initialCategory));
    setVisibility(initialDraft?.visibility ?? "community");
    setAnonymous(initialDraft?.anonymous ?? false);
    setImages(
      (initialDraft?.images ?? []).map((image, index) => {
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
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (persistDraft) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
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
                  error: readUploadError(uploadError),
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
        <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="section-kicker">发布</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{resolvedEditorTitle}</h1>
            {showCategoryInHeader && resolvedEditorDescription ? (
              <p className="mt-2 text-sm leading-6 text-[var(--muted)] hidden sm:block">{resolvedEditorDescription}</p>
            ) : null}
          </div>
        </Card.Header>

        <Card.Content className="space-y-5 bg-[rgba(8,16,16,0.9)] p-4 sm:p-5">
          {!categoryLocked && visibleCategories.length > 1 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-[0.06em] text-[var(--muted)] uppercase">1. 类型</h2>
                <Chip size="sm" variant="soft">{categoryMeta[category].label}</Chip>
              </div>
              <div className="sm:hidden">
                <ScrollShadow className="w-full max-w-full" hideScrollBar orientation="horizontal" size={42}>
                  <div className="flex min-w-max gap-3 pb-1 pr-3">
                    {categoryOptions.map(([value, meta]) => (
                      <Button
                        key={value}
                        className={`h-auto min-h-[6.5rem] w-[14rem] shrink-0 snap-start justify-start px-4 py-3.5 text-left rounded-[1.1rem] transition-all ${
                          category === value
                            ? "border border-[rgba(57,245,143,0.32)] bg-[rgba(57,245,143,0.12)]"
                            : "border border-[var(--border)] bg-[rgba(8,16,16,0.85)]"
                        }`}
                        isDisabled={categoryLocked}
                        onPress={() => setCategory(value)}
                        type="button"
                        variant="secondary"
                      >
                        <span className="flex flex-col items-start gap-1">
                          <span className={`text-lg font-semibold ${category === value ? "text-white" : "text-slate-800"}`}>{meta.label}</span>
                          <span className={`text-xs leading-5 ${category === value ? "text-white/80" : "text-[var(--muted)]"}`}>{meta.description}</span>
                        </span>
                      </Button>
                    ))}
                  </div>
                </ScrollShadow>
              </div>
              <div className="hidden gap-2.5 sm:flex sm:flex-row sm:flex-wrap">
                {categoryOptions.map(([value, meta]) => (
                  <Button
                    key={value}
                    className={`h-auto justify-start px-4 py-3 text-left rounded-[1rem] transition-all ${
                      category === value
                        ? "border border-[rgba(57,245,143,0.32)] bg-[rgba(57,245,143,0.12)]"
                        : "border border-[var(--border)] bg-[rgba(8,16,16,0.85)]"
                    }`}
                    isDisabled={categoryLocked}
                    onPress={() => setCategory(value)}
                    type="button"
                    variant="secondary"
                  >
                    <span className="flex flex-col items-start gap-1">
                      <span className={`text-base font-semibold ${category === value ? "text-white" : "text-slate-800"}`}>{meta.label}</span>
                      <span className={`text-sm leading-5 ${category === value ? "text-white/80" : "text-[var(--muted)]"}`}>{meta.description}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="space-y-5">
              <label className="space-y-2 text-sm font-semibold text-slate-950">
                <span className="flex items-center justify-between gap-3">
                  <span>{categoryLocked && visibleCategories.length <= 1 ? "1" : "2"}. 标题</span>
                  <span className={`text-xs ${titleLength > TITLE_MAX ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>{titleLength}/{TITLE_MAX}</span>
                </span>
                <Input
                  aria-label="帖子标题"
                  fullWidth
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={currentCategoryCopy.titlePlaceholder}
                  className="rounded-[1rem] bg-[rgba(8,16,16,0.85)] border border-[var(--border)]"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-950">
                <span className="flex items-center justify-between gap-3">
                  <span>{categoryLocked && visibleCategories.length <= 1 ? "2" : "3"}. 内容</span>
                  <span className={`text-xs ${contentLength > CONTENT_MAX ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>{contentLength}/{CONTENT_MAX}</span>
                </span>
                <TextArea
                  aria-label="帖子内容"
                  fullWidth
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={12}
                  placeholder={currentCategoryCopy.contentPlaceholder}
                  className="rounded-[1rem] bg-[rgba(8,16,16,0.85)] border border-[var(--border)]"
                />
              </label>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{categoryLocked && visibleCategories.length <= 1 ? "3" : "4"}. 图片</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      最多 {MAX_POST_IMAGES} 张 · 自动压缩 · 单图 ≤ 2MB
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      {currentCategoryCopy.imageHint}
                    </p>
                  </div>
                  <Button
                    className="min-h-11 w-full sm:w-auto rounded-[1rem] bg-[rgba(57,245,143,0.12)] border border-[rgba(57,245,143,0.32)] text-[var(--primary)] hover:bg-[rgba(57,245,143,0.18)] transition-colors"
                    onPress={() => fileInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    上传图片
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
                      <div key={image.clientId} className="overflow-hidden rounded-[1rem] border border-[var(--border)] bg-[rgba(8,16,16,0.96)]">
                        <div className="aspect-[16/10] bg-[rgba(6,14,12,0.96)] sm:aspect-[4/3]">
                          {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured CDN URLs are not a fit for static remotePatterns here. */}
                          <img
                            alt={`已选图片 ${index + 1}`}
                            className="h-full w-full object-cover"
                            src={image.previewUrl}
                          />
                        </div>
                        <div className="space-y-3 p-3 sm:p-4">
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
                          <p className={`text-xs leading-5 ${image.status === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
                            {image.status === "uploaded"
                              ? `${image.width}×${image.height} · ${(image.sizeBytes / 1024).toFixed(0)}KB`
                              : image.error ?? "正在处理图片"}
                          </p>
                          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                            <Button
                              className="min-h-11 w-full justify-center sm:w-auto"
                              isDisabled={index === 0}
                              onPress={() => reorderImage(index, index - 1)}
                              size="sm"
                              type="button"
                              variant="secondary"
                            >
                              前移
                            </Button>
                            <Button
                              className="min-h-11 w-full justify-center sm:w-auto"
                              isDisabled={index === images.length - 1}
                              onPress={() => reorderImage(index, index + 1)}
                              size="sm"
                              type="button"
                              variant="secondary"
                            >
                              后移
                            </Button>
                            <Button
                              className="min-h-11 w-full justify-center text-[var(--danger)] sm:w-auto"
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
                  <div className="rounded-[1rem] border border-dashed border-[var(--border)] bg-[rgba(8,16,16,0.72)] px-4 py-5 text-sm leading-6 text-[var(--muted)]">
                    {currentCategoryCopy.emptyImageHint}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
                <label className="space-y-2 text-sm font-semibold text-slate-950">
                  <span>{categoryLocked && visibleCategories.length <= 1 ? "4" : "5"}. 标签</span>
                  <Input
                    aria-label="帖子标签"
                    fullWidth
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder={currentCategoryCopy.tagsPlaceholder}
                    className="rounded-[1rem] bg-[rgba(8,16,16,0.85)] border border-[var(--border)]"
                  />
                </label>

                <div className="space-y-2">
                  <span className="block text-sm font-semibold text-slate-950">身份展示</span>
                  <Button
                    className="w-full min-h-11 justify-start"
                    onPress={() => setAnonymous((value) => !value)}
                    type="button"
                    variant={anonymous ? "primary" : "secondary"}
                  >
                    {anonymous ? "匿名发布" : "实名发布"}
                  </Button>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    {anonymous ? "显示为匿名居民。" : "显示账号名。"}
                  </p>
                </div>
              </div>
            </div>

            <div className="forum-sidebar">
              <div className="rounded-[1.1rem] border border-[var(--border)] bg-[rgba(8,16,16,0.92)] p-4">
                <p className="text-sm font-semibold text-slate-950">{categoryLocked && visibleCategories.length <= 1 ? "5" : "6"}. 可见范围</p>
                <div className="mt-3 grid gap-2">
                  {visibilityOptions.map(([value, meta]) => (
                    <Button
                      key={value}
                      className="min-h-11 justify-start"
                      onPress={() => setVisibility(value as VisibilityScope)}
                      size="sm"
                      type="button"
                      variant={visibility === value ? "primary" : "secondary"}
                    >
                      {meta.label}
                    </Button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{visibilityMeta[visibility].description}</p>
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
              <Button
                onPress={clearDraft}
                size="sm"
                type="button"
                variant="secondary"
                className="rounded-[1rem] bg-[rgba(8,16,16,0.85)] border border-[var(--border)]"
              >
                {clearLabel}
              </Button>
              <Button
                isPending={submitting}
                size="sm"
                type="submit"
                className="rounded-[1rem] bg-[rgba(57,245,143,0.12)] border border-[rgba(57,245,143,0.32)] text-[var(--primary)]"
              >
                {submitting ? submittingLabel : submitLabel}
              </Button>
            </div>
          </div>
        </Card.Content>
      </SectionCard>

      <aside className="order-last hidden forum-sidebar xl:sticky xl:top-24 xl:block">
        <SectionCard className="overflow-hidden">
          <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3">
            <div>
              <p className="section-kicker">预览</p>
            </div>
          </Card.Header>
          <Card.Content className="space-y-4 p-4">
            <div className="rounded-[1rem] border border-[var(--border)] bg-[rgba(8,16,16,0.92)] p-4">
              {uploadedImages[0] ? (
                <div className="mb-4 aspect-[4/3] overflow-hidden rounded-[0.9rem] bg-[rgba(6,14,12,0.96)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured CDN URLs are not a fit for static remotePatterns here. */}
                  <img
                    alt="首图预览"
                    className="h-full w-full object-cover"
                    src={uploadedImages[0].url}
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--muted)]">
                <Chip color="accent" size="sm" variant="primary">{categoryMeta[category].badge}</Chip>
                <Chip size="sm" variant="soft">{visibilityMeta[visibility].label}</Chip>
                {anonymous ? <Chip size="sm" variant="soft">匿名</Chip> : null}
                {uploadedImages.length > 0 ? <Chip size="sm" variant="soft">{uploadedImages.length} 张图</Chip> : null}
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                {title.trim() || currentCategoryCopy.previewTitlePlaceholder}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
                {content.trim() || currentCategoryCopy.previewContentPlaceholder}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {parsedTags.length > 0 ? (
                  parsedTags.map((tag) => (
                    <Chip key={tag} size="sm" variant="secondary">
                      #{tag}
                    </Chip>
                  ))
                ) : (
                  <span className="text-xs text-[var(--muted)]">{currentCategoryCopy.emptyTagsHint}</span>
                )}
              </div>
            </div>

            <div className="rounded-[1rem] border border-dashed border-[var(--border)] bg-[rgba(8,16,16,0.78)] px-4 py-3 text-xs leading-6 text-[var(--muted)]">
              当前状态：
              <span className="ml-2 font-semibold text-slate-950">
                {title.trim() && content.trim() && parsedTags.length > 0 && uploadingCount === 0 && failedCount === 0
                  ? "可发布"
                  : "继续补全"}
              </span>
            </div>
          </Card.Content>
        </SectionCard>
      </aside>
    </form>
  );
}
