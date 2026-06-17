"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button, Input, TextArea, ListBox, Select, Switch, cn } from "@heroui/react";
import {
  ACCEPTED_POST_IMAGE_TYPES,
  MAX_POST_IMAGES,
  MAX_POST_IMAGE_BYTES,
  MAX_POST_IMAGE_DIMENSION,
  POST_IMAGE_OUTPUT_TYPE,
} from "@/lib/post-images";
import {
  ACCEPTED_POST_ATTACHMENT_EXTENSIONS,
  MAX_POST_ATTACHMENTS,
  MAX_POST_ATTACHMENT_BYTES,
  isAcceptedPostAttachmentFile,
  normalizePostAttachmentFilename,
} from "@/lib/post-attachments";
import type {
  DraftPostAttachment,
  DraftPostImage,
  PostAttachment,
  PostCategory,
  PostDraft,
  PostImage,
  VisibilityScope,
} from "@/lib/types";
import { categoryMeta, isPostCategory, visibilityMeta } from "@/lib/types";
import { splitTags } from "@/lib/utils";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, ImagePlusIcon, PlusIcon } from "@/components/app-icons";

const TITLE_MAX = 60;
const STORAGE_KEY = "community-hub-post-draft";

const categoryEditorCopy: Record<PostCategory, {
  titlePlaceholder: string;
  contentPlaceholder: string;
  tagsPlaceholder: string;
  defaultTags: string;
}> = {
  request: {
    titlePlaceholder: "例如：求推荐靠谱的空调清洗师傅",
    contentPlaceholder: "写清需求、预算、时间、地点，以及希望怎么联系你",
    tagsPlaceholder: "如：维修, 家政, 跑腿",
    defaultTags: "求助, 邻里互助",
  },
  secondhand: {
    titlePlaceholder: "例如：九成新餐椅，自提",
    contentPlaceholder: "补充成色、价格、交易方式、自提地点和方便时间",
    tagsPlaceholder: "如：闲置, 转让, 自提",
    defaultTags: "闲置, 转让",
  },
  discussion: {
    titlePlaceholder: "例如：关于地库充电桩使用的建议",
    contentPlaceholder: "说明背景、现状和你的想法，也可以补充希望大家讨论的点",
    tagsPlaceholder: "如：社区讨论, 建议, 公告",
    defaultTags: "社区讨论, 邻里交流",
  },
  play: {
    titlePlaceholder: "例如：周六晚羽毛球 3 缺 1",
    contentPlaceholder: "写清时间、地点、人数、费用，以及怎么报名或集合",
    tagsPlaceholder: "如：约玩, 运动, 亲子",
    defaultTags: "约玩, 邻里活动",
  },
};

function getDefaultTags(category: PostCategory) {
  return categoryEditorCopy[category].defaultTags;
}

// ── 工具函数 ───────────────────────────

function createClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(sizeBytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))}KB`;
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (from === to || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ── 图片压缩 ───────────────────────────

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
        if (blob) { resolve(blob); return; }
        reject(new Error("图片压缩失败"));
      },
      POST_IMAGE_OUTPUT_TYPE,
      quality,
    );
  });
}

async function compressImage(file: File) {
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
    if (!context) throw new Error("浏览器不支持图片压缩");
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_POST_IMAGE_BYTES) {
        return { blob, width: targetWidth, height: targetHeight };
      }
    }
    scale *= 0.85;
    attempt += 1;
  }
  throw new Error("压缩后仍超过 2MB，请换一张更小的图片");
}

// ── 编辑器图片/附件条目类型 ───────────────────────────

interface EditorImageItem extends PostImage {
  clientId: string;
  previewUrl: string;
  status: "uploading" | "uploaded" | "error";
  error?: string;
}

interface EditorAttachmentItem extends PostAttachment {
  clientId: string;
  status: "uploading" | "uploaded" | "error";
  error?: string;
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

function toDraftAttachments(items: EditorAttachmentItem[]): DraftPostAttachment[] {
  return items
    .filter((item) => item.status === "uploaded")
    .map((item, index) => ({
      id: item.id,
      objectKey: item.objectKey,
      url: item.url,
      filename: item.filename,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      sortOrder: index,
    }));
}

// ── 组件 Props ───────────────────────────

interface PostEditorProps {
  onSubmit: (draft: PostDraft) => void | Promise<void>;
  initialDraft?: PostDraft;
  initialCategory?: PostCategory;
  visibleCategories?: PostCategory[];
  categoryLocked?: boolean;
  editorTitle?: string;
  submitLabel?: string;
  submittingLabel?: string;
  clearLabel?: string;
  persistDraft?: boolean;
  compactMobile?: boolean;
}

// ── 主组件 ───────────────────────────

export function PostEditor({
  onSubmit,
  initialDraft,
  initialCategory = "request",
  visibleCategories = ["request", "secondhand", "discussion", "play"],
  categoryLocked = false,
  submitLabel = "立即发布",
  submittingLabel = "发布中...",
  clearLabel = "清空草稿",
  persistDraft = true,
  compactMobile = false,
}: PostEditorProps) {
  const [category, setCategory] = useState<PostCategory>(initialDraft?.category ?? initialCategory);
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [content, setContent] = useState(initialDraft?.content ?? "");
  const [tags, setTags] = useState(
    initialDraft?.tags.join(", ") ?? getDefaultTags(initialDraft?.category ?? initialCategory),
  );
  const [visibility, setVisibility] = useState<VisibilityScope>(initialDraft?.visibility ?? "community");
  const [anonymous, setAnonymous] = useState(initialDraft?.anonymous ?? false);
  const [images, setImages] = useState<EditorImageItem[]>(() =>
    (initialDraft?.images ?? []).map((img, i) => ({
      ...img,
      id: img.id ?? createClientId(),
      clientId: img.id ?? createClientId(),
      previewUrl: img.url,
      status: "uploaded" as const,
      sortOrder: i,
    }))
  );
  const [attachments, setAttachments] = useState<EditorAttachmentItem[]>(() =>
    (initialDraft?.attachments ?? []).map((att, i) => ({
      ...att,
      id: att.id ?? createClientId(),
      clientId: att.id ?? createClientId(),
      status: "uploaded" as const,
      sortOrder: i,
    }))
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydratedDraft, setHydratedDraft] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<EditorImageItem[]>([]);
  const previousCategoryRef = useRef(category);

  const parsedTags = useMemo(() => splitTags(tags), [tags]);
  const titleLength = title.trim().length;
  const uploadingImageCount = images.filter((i) => i.status === "uploading").length;
  const failedImageCount = images.filter((i) => i.status === "error").length;
  const uploadingAttachmentCount = attachments.filter((a) => a.status === "uploading").length;
  const failedAttachmentCount = attachments.filter((a) => a.status === "error").length;
  const uploadingCount = uploadingImageCount + uploadingAttachmentCount;
  const failedCount = failedImageCount + failedAttachmentCount;
  const showCategoryInHeader = visibleCategories.length > 1 && !categoryLocked;
  const copy = categoryEditorCopy[category];

  // 同步 images ref
  useEffect(() => { imagesRef.current = images; }, [images]);

  // 分类切换时自动替换默认标签
  useEffect(() => {
    const prev = previousCategoryRef.current;
    if (prev === category) return;
    setTags((current) => {
      const isDefault = !current.trim() || current.trim() === getDefaultTags(prev);
      return isDefault ? getDefaultTags(category) : current;
    });
    previousCategoryRef.current = category;
  }, [category]);

  // 草稿持久化
  useEffect(() => {
    if (!persistDraft || !hydratedDraft) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          category, title, content, tags, visibility, anonymous,
        }));
      } catch { /* 忽略存储失败 */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [category, title, content, tags, visibility, anonymous, persistDraft, hydratedDraft]);

  // 初始化草稿
  useEffect(() => {
    if (initialDraft) { setHydratedDraft(true); return; }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { setHydratedDraft(true); return; }
      const draft = JSON.parse(raw);
      if (draft.category && isPostCategory(draft.category)) setCategory(draft.category);
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.content === "string") setContent(draft.content);
      if (typeof draft.tags === "string") setTags(draft.tags);
      if (draft.visibility && ["community", "building", "private"].includes(draft.visibility)) setVisibility(draft.visibility);
      if (typeof draft.anonymous === "boolean") setAnonymous(draft.anonymous);
    } catch { /* 忽略 */ }
    setHydratedDraft(true);
  }, [initialDraft]);

  function clearDraft() {
    setTitle(""); setContent(""); setTags(getDefaultTags(category));
    setVisibility("community"); setAnonymous(false); setImages([]); setAttachments([]); setError("");
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* 忽略 */ }
  }

  // ── 图片上传 ───────────────────────────

  async function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const file = files[0];
    if (!file) return;
    if (!ACCEPTED_POST_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_POST_IMAGE_TYPES[number])) {
      setError("不支持该图片格式，请上传 JPEG / PNG / WebP 图片"); return;
    }
    if (images.length >= MAX_POST_IMAGES) { setError(`最多上传 ${MAX_POST_IMAGES} 张图片`); return; }
    const clientId = createClientId();
    const previewUrl = URL.createObjectURL(file);
    const uploadingItem: EditorImageItem = {
      id: "", objectKey: "", url: "", mimeType: file.type, width: 0, height: 0,
      sizeBytes: file.size, sortOrder: images.length, clientId, previewUrl, status: "uploading",
    };
    setImages((prev) => [...prev, uploadingItem]);
    setError("");

    try {
      const compressed = await compressImage(file);
      const presignResp = await fetch("/api/uploads/presign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "image", mimeType: POST_IMAGE_OUTPUT_TYPE }),
      });
      const presignData = await presignResp.json();
      if (!presignResp.ok) throw new Error(readResponseError(presignData, "获取上传凭证失败"));
      const { objectKey, uploadUrl, publicUrl, headers } = presignData as {
        objectKey: string; uploadUrl: string; publicUrl: string; headers: Record<string, string>;
      };

      await fetch(uploadUrl, {
        method: "PUT", body: compressed.blob, headers: { ...headers, "Content-Type": POST_IMAGE_OUTPUT_TYPE },
      });

      setImages((prev) => prev.map((item) =>
        item.clientId === clientId
          ? { ...item, status: "uploaded" as const, id: objectKey, objectKey, url: publicUrl, width: compressed.width, height: compressed.height, sizeBytes: compressed.blob.size }
          : item
      ));
    } catch (err) {
      setImages((prev) => prev.map((item) =>
        item.clientId === clientId ? { ...item, status: "error" as const, error: err instanceof Error ? err.message : "上传失败" } : item
      ));
    }
  }

  // ── 附件上传 ───────────────────────────

  async function handleAttachmentSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const file = files[0];
    if (!file) return;
    if (!isAcceptedPostAttachmentFile(file.name, file.type)) { setError("不支持该附件格式"); return; }
    if (file.size > MAX_POST_ATTACHMENT_BYTES) { setError(`附件不能超过 ${formatFileSize(MAX_POST_ATTACHMENT_BYTES)}`); return; }
    if (attachments.length >= MAX_POST_ATTACHMENTS) { setError(`最多上传 ${MAX_POST_ATTACHMENTS} 个附件`); return; }

    const clientId = createClientId();
    const filename = normalizePostAttachmentFilename(file.name);
    const uploadingItem: EditorAttachmentItem = {
      id: "", objectKey: "", url: "", filename, mimeType: file.type,
      sizeBytes: file.size, sortOrder: attachments.length, clientId, status: "uploading",
    };
    setAttachments((prev) => [...prev, uploadingItem]);
    setError("");

    try {
      const presignResp = await fetch("/api/uploads/presign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "attachment", mimeType: file.type, filename }),
      });
      const presignData = await presignResp.json();
      if (!presignResp.ok) throw new Error(readResponseError(presignData, "获取上传凭证失败"));
      const { objectKey, uploadUrl, publicUrl, headers } = presignData as {
        objectKey: string; uploadUrl: string; publicUrl: string; headers: Record<string, string>;
      };

      await fetch(uploadUrl, {
        method: "PUT", body: file, headers: { ...headers, "Content-Type": file.type || "application/octet-stream" },
      });

      setAttachments((prev) => prev.map((item) =>
        item.clientId === clientId ? { ...item, status: "uploaded" as const, id: objectKey, objectKey, url: publicUrl } : item
      ));
    } catch (err) {
      setAttachments((prev) => prev.map((item) =>
        item.clientId === clientId ? { ...item, status: "error" as const, error: err instanceof Error ? err.message : "上传失败" } : item
      ));
    }
  }

  // ── 提交 ───────────────────────────

  async function handleSubmit() {
    const nextTitle = title.trim();
    if (!nextTitle) { setError("标题不能为空"); return; }
    if (nextTitle.length > TITLE_MAX) { setError(`标题请控制在 ${TITLE_MAX} 字以内`); return; }
    if (!content.trim()) { setError("内容不能为空"); return; }
    if (parsedTags.length === 0) { setError("请至少填写一个标签"); return; }
    if (uploadingCount > 0) { setError("还有文件正在上传，请稍候再发布"); return; }
    if (failedCount > 0) { setError("有文件上传失败，请先移除"); return; }

    setSubmitting(true); setError("");
    try {
      const draft: PostDraft = {
        title: nextTitle, content: content.trim(), category, tags: parsedTags,
        visibility, anonymous, images: toDraftImages(images), attachments: toDraftAttachments(attachments),
      };
      await onSubmit(draft);
      if (persistDraft) { try { localStorage.removeItem(STORAGE_KEY); } catch { /* 忽略 */ } }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  }

  const sectionClassName = cn(
    "border border-border/70 bg-white/72",
    compactMobile ? "rounded-[1.05rem] p-3 md:rounded-2xl md:p-4" : "rounded-2xl p-4",
  );

  return (
    <div className={cn(compactMobile ? "space-y-3 md:space-y-5" : "space-y-5")}>
      {/* 错误提示 */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm font-medium text-danger" role="alert">{error}</div>
      )}

      {/* 标签 + 可见范围 */}
      <section className={sectionClassName}>
        <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", compactMobile ? "mb-2" : "mb-3")}>
          <div>
            <h3 className="text-sm font-bold">内容类型</h3>
            <p className={cn("text-xs text-muted-foreground", compactMobile && "hidden md:block")}>选择最接近的发布场景，系统会自动带出标签建议。</p>
          </div>
        </div>
        <div className={cn("flex flex-wrap items-center md:gap-3", compactMobile ? "gap-1.5" : "gap-2.5")}>
        {showCategoryInHeader && (
          <div className={cn("flex flex-wrap", compactMobile ? "gap-1.5" : "gap-2")}>
            {visibleCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${compactMobile ? "app-chip app-chip-compact" : "app-chip"} ${
                  category === cat
                    ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/15"
                    : "border-default-200 text-muted-foreground hover:border-default-400"
                }`}
                onClick={() => setCategory(cat)}
              >
                {categoryMeta[cat].label}
              </button>
            ))}
          </div>
        )}

        <Select
          aria-label="可见范围"
          className={cn("min-w-0", compactMobile ? "w-full mobile-compact-select sm:w-40" : "w-full sm:w-40")}
          value={visibility}
          onChange={(key) => {
            if (key && ["community", "building", "private"].includes(key as string)) {
              setVisibility(key as VisibilityScope);
            }
          }}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {Object.entries(visibilityMeta).map(([key, meta]) => (
                <ListBox.Item key={key} id={key} textValue={meta.label}>
                  {meta.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
      </section>

      <section className={sectionClassName}>
        <div className={cn(compactMobile ? "mb-2.5" : "mb-4")}>
          <h3 className="text-sm font-bold">正文信息</h3>
          <p className={cn("text-xs text-muted-foreground", compactMobile && "hidden md:block")}>用标题承载关键信息，正文补足背景和期望。</p>
        </div>
        <div className={cn("grid min-w-0", compactMobile ? "gap-3 md:gap-4" : "gap-4")}>
          {/* 标题 */}
          <div className="grid min-w-0 gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-xs font-bold text-foreground" htmlFor="post-editor-title">标题</label>
              <p className="text-xs text-muted-foreground">{titleLength}/{TITLE_MAX}</p>
            </div>
            <Input
              id="post-editor-title"
              aria-label="帖子标题"
              placeholder={copy.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              fullWidth
              className="min-w-0 text-lg"
            />
          </div>

          {/* 正文 */}
          <div className="grid min-w-0 gap-1.5">
            <label className="block text-xs font-bold text-foreground" htmlFor="post-editor-content">正文</label>
            <TextArea
              id="post-editor-content"
              aria-label="帖子正文"
              placeholder={copy.contentPlaceholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={compactMobile ? 5 : 7}
              fullWidth
              className="min-w-0"
            />
          </div>

          {/* 标签 */}
          <div className="grid min-w-0 gap-1.5">
            <label className="block text-xs font-bold text-foreground" htmlFor="post-editor-tags">标签</label>
            <Input
              id="post-editor-tags"
              aria-label="标签"
              placeholder={copy.tagsPlaceholder}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              fullWidth
              className="min-w-0"
            />
            <p className="text-xs text-muted-foreground">
              {parsedTags.length > 0 ? `已输入 ${parsedTags.length} 个标签：${parsedTags.join("、")}` : "使用逗号分隔多个标签"}
            </p>
          </div>
        </div>
      </section>

      {/* 图片上传区域 */}
      <section className={sectionClassName}>
        <div className={cn("flex items-center justify-between gap-3", compactMobile ? "mb-2" : "mb-3")}>
          <div>
            <h3 className="text-sm font-bold">图片</h3>
            <p className={cn("text-xs text-muted-foreground", compactMobile && "hidden md:block")}>最多 {MAX_POST_IMAGES} 张，上传后可调整顺序。</p>
          </div>
          <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-bold text-primary">{images.length}/{MAX_POST_IMAGES}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {images.map((img, index) => (
            <div key={img.clientId} className="relative">
              <div className={cn(
                "overflow-hidden rounded-2xl border bg-muted/20",
                compactMobile ? "h-20 w-20 md:h-24 md:w-24" : "h-24 w-24",
                img.status === "error" ? "border-danger" : "border-border",
              )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.previewUrl} alt={`图片 ${index + 1}`} className="h-full w-full object-cover" />
              </div>
              {img.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 text-xs text-white">上传中</div>
              )}
              {img.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-danger/20 px-2 text-center text-xs font-semibold text-danger">
                  {img.error ?? "失败"}
                </div>
              )}
              <button
                type="button"
                className="absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger text-white shadow-md shadow-danger/20 transition-transform active:scale-95"
                onClick={() => { URL.revokeObjectURL(img.previewUrl); setImages((prev) => prev.filter((i) => i.clientId !== img.clientId)); }}
                aria-label="删除图片"
              >
                <CloseIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              {/* 排序按钮 */}
              <div className="absolute bottom-1 left-1 right-1 flex justify-between gap-1">
                <button type="button" className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-black/65 text-white transition-transform active:scale-95 disabled:opacity-40" onClick={() => setImages((prev) => moveItem(prev, index, index - 1))} disabled={index === 0} aria-label="图片前移">
                  <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-black/65 text-white transition-transform active:scale-95 disabled:opacity-40" onClick={() => setImages((prev) => moveItem(prev, index, index + 1))} disabled={index === images.length - 1} aria-label="图片后移">
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {images.length < MAX_POST_IMAGES && (
            <button
              type="button"
              className={cn(
                "flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/25 bg-primary/5 text-2xl text-primary transition-colors hover:border-primary/50 hover:bg-primary/10",
                compactMobile ? "h-20 w-20 md:h-24 md:w-24" : "h-24 w-24",
              )}
              onClick={() => fileInputRef.current?.click()}
              aria-label="添加图片"
            >
              <ImagePlusIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
      </section>

      {/* 附件上传区域 */}
      <section className={sectionClassName}>
        <div className={cn("flex items-center justify-between gap-3", compactMobile ? "mb-2" : "mb-3")}>
          <div>
            <h3 className="text-sm font-bold">附件</h3>
            <p className={cn("text-xs text-muted-foreground", compactMobile && "hidden md:block")}>上传说明文档、清单或交易凭证。</p>
          </div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">{attachments.length}/{MAX_POST_ATTACHMENTS}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div key={att.clientId} className={`relative flex min-h-11 max-w-full items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs shadow-sm ${att.status === "error" ? "border-danger" : "border-border"}`}>
              <span className="max-w-[180px] truncate font-medium">{att.filename}</span>
              <span className="text-muted-foreground">{formatFileSize(att.sizeBytes)}</span>
              {att.status === "uploading" && <span className="text-primary">上传中...</span>}
              {att.status === "error" && <span className="text-danger">{att.error ?? "失败"}</span>}
              <button type="button" className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger/10" onClick={() => setAttachments((prev) => prev.filter((a) => a.clientId !== att.clientId))} aria-label="删除附件">
                <CloseIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {attachments.length < MAX_POST_ATTACHMENTS && (
            <button
              type="button"
              className="flex min-h-11 items-center gap-1 rounded-xl border-2 border-dashed border-accent/25 bg-accent/5 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:border-accent/50 hover:bg-accent/10"
              onClick={() => attachmentInputRef.current?.click()}
              aria-label="添加附件"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              添加附件
            </button>
          )}
        </div>
        <input ref={attachmentInputRef} type="file" accept={ACCEPTED_POST_ATTACHMENT_EXTENSIONS.join(",")} className="hidden" onChange={handleAttachmentSelect} />
      </section>

      {/* 匿名开关 */}
      <section className={sectionClassName}>
        <Switch isSelected={anonymous} onChange={setAnonymous}>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>
            <span className="text-sm font-semibold">匿名发布</span>
            <span className="block text-xs text-muted-foreground">隐藏昵称后仍会遵循社区规则。</span>
          </Switch.Content>
        </Switch>
      </section>

      {/* 操作按钮 */}
      <div className={cn(
        "sticky z-10 flex gap-3 border border-border/70 bg-white/88 shadow-lg backdrop-blur-xl md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0",
        compactMobile ? "bottom-20 -mx-0.5 rounded-[1.05rem] p-2 md:bottom-24 md:mx-0 md:rounded-2xl md:p-3" : "bottom-24 rounded-2xl p-3",
      )}>
        <Button
          className="min-h-12 flex-1 font-bold"
          variant="primary"
          isDisabled={submitting || uploadingCount > 0}
          onPress={() => { void handleSubmit(); }}
        >
          {submitting ? submittingLabel : uploadingCount > 0 ? `文件上传中 (${uploadingCount})` : submitLabel}
        </Button>
        {clearLabel && (
          <Button className="min-h-12 font-bold" variant="secondary" onPress={clearDraft} isDisabled={submitting}>
            {clearLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
