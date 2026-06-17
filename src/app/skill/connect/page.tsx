import { redirect } from "next/navigation";
import { SkillConnectClient } from "@/components/skill-connect-client";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { getAppOrigin } from "@/lib/app-origin";
import { ensureUserSkillAccess, issueUserSkillBundleDownloadToken } from "@/lib/skill-auth";

export const dynamic = "force-dynamic";

interface SkillConnectPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function parseSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadSkillConnectPageState(
  searchParams: SkillConnectPageProps["searchParams"]
): Promise<
  | { kind: "guest" }
  | {
      kind: "ready";
      user: Awaited<ReturnType<typeof ensureUserSkillAccess>>["user"];
      appOrigin: string;
      bundleDownloadToken: string;
      bundleDownloadTokenExpiresAt: string;
      token: string;
      welcome: boolean;
    }
  | { kind: "unavailable" }
> {
  try {
    const currentUser = await getCurrentUserFromCookie();
    if (!currentUser) return { kind: "guest" };
    const [{ token, user }, appOrigin, params] = await Promise.all([
      ensureUserSkillAccess(currentUser.id),
      getAppOrigin(),
      searchParams,
    ]);
    const bundle = issueUserSkillBundleDownloadToken({
      id: user.id,
      skillTokenVersion: user.skillTokenVersion,
    });
    return {
      kind: "ready",
      user,
      appOrigin,
      token,
      bundleDownloadToken: bundle.token,
      bundleDownloadTokenExpiresAt: bundle.expiresAt,
      welcome: parseSingle(params?.welcome) === "1",
    };
  } catch (error) {
    console.error("Failed to load /skill/connect page", error);
    return { kind: "unavailable" };
  }
}

export function SkillConnectUnavailableFallback() {
  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">AI 助手接入</h1>
      <p className="mt-2 text-muted-foreground">接入页不可用</p>
    </main>
  );
}

export default async function SkillConnectPage({ searchParams }: SkillConnectPageProps) {
  const state = await loadSkillConnectPageState(searchParams);
  if (state.kind === "guest") redirect("/login?next=/skill/connect");
  if (state.kind === "unavailable") {
    return <SkillConnectUnavailableFallback />;
  }
  return (
    <SkillConnectClient
      currentUser={state.user}
      apiBaseUrl={`${state.appOrigin}/api/skill`}
      skillBundleUrl={`${state.appOrigin}/api/skill/bundle?token=${encodeURIComponent(state.bundleDownloadToken)}`}
      bundleDownloadToken={state.bundleDownloadToken}
      bundleDownloadTokenExpiresAt={state.bundleDownloadTokenExpiresAt}
      initialToken={state.token}
      welcome={state.welcome}
    />
  );
}
