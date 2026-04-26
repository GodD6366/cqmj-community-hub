import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const createPresignedImageUploadMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
}));

vi.mock("../src/lib/s3-storage", () => ({
  createPresignedImageUpload: createPresignedImageUploadMock,
}));

describe("/api/uploads/presign route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated uploads", async () => {
    const { POST } = await import("../src/app/api/uploads/presign/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "chair.webp",
          mimeType: "image/webp",
          sizeBytes: 1000,
          width: 1200,
          height: 900,
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects unsupported mime types", async () => {
    const { POST } = await import("../src/app/api/uploads/presign/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1" });

    const response = await POST(
      new Request("http://localhost/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "chair.gif",
          mimeType: "image/gif",
          sizeBytes: 1000,
          width: 800,
          height: 600,
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns a presigned upload payload for valid requests", async () => {
    const { POST } = await import("../src/app/api/uploads/presign/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1" });
    createPresignedImageUploadMock.mockResolvedValueOnce({
      objectKey: "posts/user-1/2026/04/demo.webp",
      uploadUrl: "https://storage.example.com/upload",
      publicUrl: "https://cdn.example.com/posts/user-1/2026/04/demo.webp",
      headers: {
        "Content-Type": "image/webp",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "chair.webp",
          mimeType: "image/webp",
          sizeBytes: 1000,
          width: 1200,
          height: 900,
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      objectKey: "posts/user-1/2026/04/demo.webp",
      uploadUrl: "https://storage.example.com/upload",
      publicUrl: "https://cdn.example.com/posts/user-1/2026/04/demo.webp",
      headers: {
        "Content-Type": "image/webp",
      },
    });
    expect(createPresignedImageUploadMock).toHaveBeenCalledWith({
      userId: "user-1",
      contentType: "image/webp",
    });
  });
});
