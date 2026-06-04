import { z } from "zod";

export const MAX_POST_ATTACHMENTS = 8;
export const MAX_POST_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const POST_ATTACHMENT_FALLBACK_TYPE = "application/octet-stream";

export const ACCEPTED_POST_ATTACHMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".md",
  ".csv",
  ".zip",
] as const;

export const ACCEPTED_POST_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
] as const;

const keySafePattern = /^[a-zA-Z0-9/_\-.]+$/;
const filenameControlPattern = /[\u0000-\u001f\u007f]/g;

export function normalizePostAttachmentFilename(value: string) {
  const filename = value.replace(filenameControlPattern, "").trim().replace(/\s+/g, " ");
  return filename.slice(0, 180) || "attachment";
}

export function getPostAttachmentExtension(filename: string) {
  const match = normalizePostAttachmentFilename(filename).toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function isAcceptedPostAttachmentFile(filename: string, mimeType: string) {
  const normalizedMimeType = mimeType.trim().toLowerCase();
  const extension = getPostAttachmentExtension(filename);
  const hasAcceptedExtension = (ACCEPTED_POST_ATTACHMENT_EXTENSIONS as readonly string[]).includes(extension);

  if ((ACCEPTED_POST_ATTACHMENT_TYPES as readonly string[]).includes(normalizedMimeType)) {
    return true;
  }

  return hasAcceptedExtension && (!normalizedMimeType || normalizedMimeType === POST_ATTACHMENT_FALLBACK_TYPE);
}

export const postAttachmentSchema = z.object({
  id: z.string().min(1).optional(),
  objectKey: z.string().min(1),
  url: z.string().url(),
  filename: z.string().min(1).max(180).transform(normalizePostAttachmentFilename),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(MAX_POST_ATTACHMENT_BYTES),
  sortOrder: z.number().int().min(0),
}).refine((attachment) => isAcceptedPostAttachmentFile(attachment.filename, attachment.mimeType), {
  message: "附件格式不支持",
});

export type PostAttachmentInput = z.infer<typeof postAttachmentSchema>;

export function validatePostAttachments(input: unknown) {
  const schema = z.array(postAttachmentSchema).max(MAX_POST_ATTACHMENTS);
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "附件数据不合法" };
  }

  const attachments = [...parsed.data].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortOrders = attachments.map((attachment) => attachment.sortOrder);
  const hasSequentialSortOrder = sortOrders.every((value, index) => value === index);

  if (!hasSequentialSortOrder) {
    return { ok: false as const, error: "附件顺序不合法" };
  }

  return { ok: true as const, attachments };
}

export function validateAttachmentStorageFields(
  attachments: PostAttachmentInput[],
  options: { publicBaseUrl: string; uploadPrefix: string },
) {
  const publicBaseUrl = options.publicBaseUrl.replace(/\/+$/g, "");
  const uploadPrefix = options.uploadPrefix.replace(/^\/+|\/+$/g, "");

  for (const attachment of attachments) {
    if (!attachment.url.startsWith(`${publicBaseUrl}/`)) {
      return { ok: false as const, error: "附件地址不在允许的资源域名下" };
    }
    if (!attachment.objectKey.startsWith(`${uploadPrefix}/`)) {
      return { ok: false as const, error: "附件对象 key 不合法" };
    }
    if (!keySafePattern.test(attachment.objectKey)) {
      return { ok: false as const, error: "附件对象 key 包含非法字符" };
    }
  }

  return { ok: true as const };
}
