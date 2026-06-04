import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function setStorageEnv(overrides: Record<string, string | undefined> = {}) {
  process.env.S3_ENDPOINT = "https://s3.example.com";
  process.env.S3_REGION = "cn-east-1";
  process.env.S3_BUCKET = "community-hub-assets";
  process.env.S3_ACCESS_KEY_ID = "test-access-key";
  process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com/assets";
  process.env.S3_UPLOAD_PREFIX = "posts";
  delete process.env.S3_FORCE_PATH_STYLE;

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
}

afterEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

describe("createPresignedImageUpload", () => {
  it("uses path-style upload URLs for custom S3 endpoints by default", async () => {
    setStorageEnv();

    const { createPresignedImageUpload } = await import("../src/lib/s3-storage");
    const upload = await createPresignedImageUpload({
      userId: "user-1",
      contentType: "image/webp",
    });

    const uploadUrl = new URL(upload.uploadUrl);

    expect(uploadUrl.origin).toBe("https://s3.example.com");
    expect(uploadUrl.pathname).toMatch(/^\/community-hub-assets\/posts\/user-1\/\d{4}\/\d{2}\/.+\.webp$/);
    expect(upload.publicUrl).toMatch(/^https:\/\/cdn\.example\.com\/assets\/posts\/user-1\/\d{4}\/\d{2}\/.+\.webp$/);
  });

  it("supports opting out of path-style URLs explicitly", async () => {
    setStorageEnv({
      S3_FORCE_PATH_STYLE: "false",
    });

    const { createPresignedImageUpload } = await import("../src/lib/s3-storage");
    const upload = await createPresignedImageUpload({
      userId: "user-1",
      contentType: "image/webp",
    });

    const uploadUrl = new URL(upload.uploadUrl);

    expect(uploadUrl.hostname).toBe("community-hub-assets.s3.example.com");
    expect(uploadUrl.pathname).toMatch(/^\/posts\/user-1\/\d{4}\/\d{2}\/.+\.webp$/);
  });
});

describe("createPresignedAttachmentUpload", () => {
  it("keeps a safe attachment extension in generated object keys", async () => {
    setStorageEnv();

    const { createPresignedAttachmentUpload } = await import("../src/lib/s3-storage");
    const upload = await createPresignedAttachmentUpload({
      userId: "user-1",
      contentType: "application/pdf",
      filename: "guide.pdf",
    });

    const uploadUrl = new URL(upload.uploadUrl);

    expect(uploadUrl.pathname).toMatch(/^\/community-hub-assets\/posts\/user-1\/\d{4}\/\d{2}\/.+\.pdf$/);
    expect(upload.publicUrl).toMatch(/^https:\/\/cdn\.example\.com\/assets\/posts\/user-1\/\d{4}\/\d{2}\/.+\.pdf$/);
  });
});
