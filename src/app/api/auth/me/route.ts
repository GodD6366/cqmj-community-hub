import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";

export async function GET() {
  const user = await getCurrentUserFromCookie();
  return NextResponse.json({ user });
}
