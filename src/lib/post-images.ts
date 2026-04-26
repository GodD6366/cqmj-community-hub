import { z } from "zod";

export const MAX_POST_IMAGES = 9;
export const MAX_POST_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_POST_IMAGE_DIMENSION = 2048;
export const ACCEPTED_POST_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const POST_IMAGE_OUTPUT_TYPE = "image/webp";

export const postImageSchema = z.object({
  id: z.string().min(1).optional(),
  objectKey: z.string().min(1),
  url: z.string().url(),
  mimeType: z.enum(ACCEPTED_POST_IMAGE_TYPES),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive().max(MAX_POST_IMAGE_BYTES),
  sortOrder: z.number().int().min(0),
});

export type PostImageInput = z.infer<typeof postImageSchema>;

const keySafePattern = /^[a-zA-Z0-9/_\-.]+$/;

export function normalizeUploadPrefix(value: string | undefined) {
  return (value ?? "posts").replace(/^\/+|\/+$/g, "");
}

export function buildPublicImageUrl(baseUrl: string, objectKey: string) {
  return `${baseUrl.replace(/\/+$/g, "")}/${objectKey}`;
}

export function isAcceptedPostImageType(value: string): value is (typeof ACCEPTED_POST_IMAGE_TYPES)[number] {
  return ACCEPTED_POST_IMAGE_TYPES.includes(value as (typeof ACCEPTED_POST_IMAGE_TYPES)[number]);
}

export function validatePostImages(input: unknown) {
  const schema = z.array(postImageSchema).max(MAX_POST_IMAGES);
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "图片数据不合法" };
  }

  const images = [...parsed.data].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortOrders = images.map((image) => image.sortOrder);
  const hasSequentialSortOrder = sortOrders.every((value, index) => value === index);

  if (!hasSequentialSortOrder) {
    return { ok: false as const, error: "图片顺序不合法" };
  }

  return { ok: true as const, images };
}

export function validateImageStorageFields(
  images: PostImageInput[],
  options: { publicBaseUrl: string; uploadPrefix: string },
) {
  const publicBaseUrl = options.publicBaseUrl.replace(/\/+$/g, "");
  const uploadPrefix = normalizeUploadPrefix(options.uploadPrefix);

  for (const image of images) {
    if (!image.url.startsWith(`${publicBaseUrl}/`)) {
      return { ok: false as const, error: "图片地址不在允许的资源域名下" };
    }
    if (!image.objectKey.startsWith(`${uploadPrefix}/`)) {
      return { ok: false as const, error: "图片对象 key 不合法" };
    }
    if (!keySafePattern.test(image.objectKey)) {
      return { ok: false as const, error: "图片对象 key 包含非法字符" };
    }
  }

  return { ok: true as const };
}
