import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import {
  ACCEPTED_POST_IMAGE_TYPES,
  MAX_POST_IMAGE_BYTES,
  MAX_POST_IMAGE_DIMENSION,
  isAcceptedPostImageType,
} from "@/lib/post-images";
import {
  ACCEPTED_POST_ATTACHMENT_EXTENSIONS,
  MAX_POST_ATTACHMENT_BYTES,
  isAcceptedPostAttachmentFile,
  normalizePostAttachmentFilename,
} from "@/lib/post-attachments";
import { createPresignedAttachmentUpload, createPresignedImageUpload } from "@/lib/s3-storage";

const imageUploadRequestSchema = z.object({
  kind: z.literal("image").optional(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_POST_IMAGE_BYTES),
  width: z.number().int().positive().max(MAX_POST_IMAGE_DIMENSION),
  height: z.number().int().positive().max(MAX_POST_IMAGE_DIMENSION),
});

const attachmentUploadRequestSchema = z.object({
  kind: z.literal("attachment"),
  filename: z.string().min(1).transform(normalizePostAttachmentFilename),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_POST_ATTACHMENT_BYTES),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后再上传文件" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const isAttachmentRequest = Boolean(body && typeof body === "object" && (body as { kind?: unknown }).kind === "attachment");
  const parsed = isAttachmentRequest
    ? attachmentUploadRequestSchema.safeParse(body)
    : imageUploadRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "上传参数不合法" }, { status: 400 });
  }

  if (isAttachmentRequest) {
    if (!isAcceptedPostAttachmentFile(parsed.data.filename, parsed.data.mimeType)) {
      return NextResponse.json(
        { error: `仅支持 ${ACCEPTED_POST_ATTACHMENT_EXTENSIONS.join(" / ")} 附件` },
        { status: 400 },
      );
    }

    try {
      const upload = await createPresignedAttachmentUpload({
        userId: currentUser.id,
        contentType: parsed.data.mimeType,
        filename: parsed.data.filename,
      });

      return NextResponse.json(upload, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "生成上传地址失败" },
        { status: 500 },
      );
    }
  }

  if (!isAcceptedPostImageType(parsed.data.mimeType)) {
    return NextResponse.json(
      { error: `仅支持 ${ACCEPTED_POST_IMAGE_TYPES.join(" / ")} 格式` },
      { status: 400 },
    );
  }

  try {
    const upload = await createPresignedImageUpload({
      userId: currentUser.id,
      contentType: parsed.data.mimeType,
    });

    return NextResponse.json(upload, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成上传地址失败" },
      { status: 500 },
    );
  }
}
