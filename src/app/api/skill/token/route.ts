import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { issueUserSkillBundleDownloadToken, rotateUserSkillToken } from "@/lib/skill-auth";

export async function POST() {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const result = await rotateUserSkillToken(currentUser.id);
    const bundleDownloadToken = issueUserSkillBundleDownloadToken({
      id: result.user.id,
      skillTokenVersion: result.user.skillTokenVersion,
    });
    return NextResponse.json({
      ...result,
      bundleDownloadToken: bundleDownloadToken.token,
      bundleDownloadTokenExpiresAt: bundleDownloadToken.expiresAt,
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_DISABLED") {
      return NextResponse.json({ error: "该账号已被管理员禁用" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "重置 Skill API key 失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
