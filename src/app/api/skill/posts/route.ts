import { createSkillPostFromRequest, listSkillPostsFromRequest, withSkillAuth } from "@/lib/skill-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withSkillAuth(request, (_request, { viewer }) => listSkillPostsFromRequest(request, viewer));
}

export async function POST(request: Request) {
  return withSkillAuth(request, (_request, { viewer }) => createSkillPostFromRequest(request, viewer));
}
