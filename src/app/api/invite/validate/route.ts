import { NextResponse } from "next/server";
import { validateInviteCode } from "@/lib/invite";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";
  const result = await validateInviteCode(code);
  return NextResponse.json(result);
}
