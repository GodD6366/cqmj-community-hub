import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { getAppOrigin } from "@/lib/app-origin";
import { ensureUserSkillAccess, verifyUserSkillBundleDownloadToken } from "@/lib/skill-auth";
import type { CommunityUser } from "@/lib/types";

export const runtime = "nodejs";

const skillRoot = path.join(process.cwd(), "skills", "community-hub");
const bundledFiles = [
  { source: "SKILL.md", target: "community-hub/SKILL.md", mode: 0o644 },
  { source: "agents/openai.yaml", target: "community-hub/agents/openai.yaml", mode: 0o644 },
  { source: "scripts/community_hub.py", target: "community-hub/scripts/community_hub.py", mode: 0o755 },
] as const;

function writeOctal(buffer: Buffer, value: number, offset: number, length: number) {
  const text = value.toString(8).padStart(length - 1, "0").slice(0, length - 1) + "\0";
  buffer.write(text, offset, length, "ascii");
}

function createHeader(name: string, size: number, mode: number) {
  const header = Buffer.alloc(512, 0);
  header.write(name, 0, 100, "utf8");
  writeOctal(header, mode, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, size, 124, 12);
  writeOctal(header, 0, 136, 12);
  header.fill(" ", 148, 156);
  header.write("0", 156, 1, "ascii");
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");

  let checksum = 0;
  for (const byte of header) checksum += byte;
  const checksumText = checksum.toString(8).padStart(6, "0") + "\0 ";
  header.write(checksumText, 148, 8, "ascii");
  return header;
}

function padToBlock(buffer: Buffer) {
  const remainder = buffer.length % 512;
  return remainder === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - remainder, 0);
}

function pushTarFile(parts: Buffer[], target: string, content: Buffer, mode: number) {
  parts.push(createHeader(target, content.length, mode), content, padToBlock(content));
}

async function buildTarball(config: { apiBaseUrl: string; apiKey: string; username: string }) {
  const parts: Buffer[] = [];
  for (const file of bundledFiles) {
    const content = await readFile(path.join(skillRoot, file.source));
    pushTarFile(parts, file.target, content, file.mode);
  }

  pushTarFile(
    parts,
    "community-hub/config.json",
    Buffer.from(`${JSON.stringify(config, null, 2)}\n`, "utf8"),
    0o600,
  );
  parts.push(Buffer.alloc(1024, 0));
  return Buffer.concat(parts);
}

async function loadBundleAccess(request: Request): Promise<{ user: CommunityUser; token: string } | null> {
  const downloadToken = new URL(request.url).searchParams.get("token")?.trim();
  if (downloadToken) {
    return verifyUserSkillBundleDownloadToken(downloadToken);
  }

  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return null;
  }

  return ensureUserSkillAccess(currentUser.id);
}

export async function GET(request: Request) {
  let access;
  try {
    access = await loadBundleAccess(request);
  } catch (error) {
    if (error instanceof Error && error.message === "USER_DISABLED") {
      return Response.json({ error: "该账号已被管理员禁用" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "生成 Skill Bundle 失败" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!access) {
    return Response.json({ error: "请先登录或提供有效的 Bundle 临时下载 Token" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const appOrigin = await getAppOrigin();
    const tarball = await buildTarball({
      apiBaseUrl: `${appOrigin}/api/skill`,
      apiKey: access.token,
      username: access.user.username,
    });

    return new Response(tarball, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="community-hub-skill.tar"',
        "Content-Type": "application/x-tar",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "生成 Skill Bundle 失败" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
