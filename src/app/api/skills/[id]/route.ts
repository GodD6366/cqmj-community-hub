import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { updateNeighborSkill } from "@/lib/skill-server";
import { isNeighborSkillCategory, type NeighborSkillDraft } from "@/lib/types";

function parseDraft(body: unknown): NeighborSkillDraft | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  
  const category = isNeighborSkillCategory(value.category) ? value.category : "other";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const tags = Array.isArray(value.tags) ? value.tags.filter((item): item is string => typeof item === "string") : [];
  const availability = typeof value.availability === "string" ? value.availability.trim() : null;
  const active = typeof value.active === "boolean" ? value.active : true;

  if (!title || !description) return null;

  return { category, title, description, tags, availability, active };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const draft = parseDraft(await request.json().catch(() => null));
  if (!draft) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  try {
    const success = await updateNeighborSkill(id, currentUser.id, draft);
    if (!success) {
      return NextResponse.json({ error: "无权限或记录不存在" }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "更新技能失败" }, { status: 500 });
  }
}
