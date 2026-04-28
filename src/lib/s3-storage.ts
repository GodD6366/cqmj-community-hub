import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { buildPublicImageUrl, normalizeUploadPrefix } from "./post-images";

const ENV_KEYS = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_BASE_URL",
  "S3_UPLOAD_PREFIX",
] as const;

type RequiredStorageEnv = Record<(typeof ENV_KEYS)[number], string>;

let cachedClient: S3Client | null = null;

function readStorageEnv(): RequiredStorageEnv {
  const values = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]?.trim() ?? ""]),
  ) as RequiredStorageEnv;

  const missing = ENV_KEYS.filter((key) => !values[key]);
  if (missing.length > 0) {
    throw new Error(`对象存储配置缺失：${missing.join(", ")}`);
  }

  return values;
}

function getS3Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const env = readStorageEnv();
  cachedClient = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return cachedClient;
}

export function getPublicImageBaseUrl() {
  return readStorageEnv().S3_PUBLIC_BASE_URL.replace(/\/+$/g, "");
}

export function resolvePublicImageUrl(objectKey: string, fallbackUrl: string) {
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();
  return publicBaseUrl ? buildPublicImageUrl(publicBaseUrl, objectKey) : fallbackUrl;
}

export function getUploadPrefix() {
  return normalizeUploadPrefix(readStorageEnv().S3_UPLOAD_PREFIX);
}

export async function createPresignedImageUpload(input: {
  userId: string;
  contentType: string;
}) {
  const env = readStorageEnv();
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const objectKey = `${normalizeUploadPrefix(env.S3_UPLOAD_PREFIX)}/${input.userId}/${now.getUTCFullYear()}/${month}/${randomUUID()}.webp`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: objectKey,
    ContentType: input.contentType,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 300 });

  return {
    objectKey,
    uploadUrl,
    publicUrl: buildPublicImageUrl(env.S3_PUBLIC_BASE_URL, objectKey),
    headers: {
      "Content-Type": input.contentType,
    },
  };
}
