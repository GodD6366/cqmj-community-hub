import { skillJson, withSkillAuth } from "@/lib/skill-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withSkillAuth(request, (_request, { viewer }) => skillJson({ user: viewer }));
}
