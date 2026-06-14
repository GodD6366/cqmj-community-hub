import { Card } from "@heroui/react";
import { redirect } from "next/navigation";
import { SkillConnectClient } from "@/components/skill-connect-client";
import { ButtonLink, PageShell } from "@/components/ui";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { getAppOrigin } from "@/lib/app-origin";
import { ensureUserSkillAccess, issueUserSkillBundleDownloadToken } from "@/lib/skill-auth";

export const dynamic = "force-dynamic";

interface SkillConnectPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

type SkillConnectPageState =
  | { kind: "guest" }
  | {
      kind: "ready";
      token: string;
      user: Awaited<ReturnType<typeof ensureUserSkillAccess>>["user"];
      appOrigin: string;
      bundleDownloadToken: string;
      bundleDownloadTokenExpiresAt: string;
      welcome: boolean;
    }
  | { kind: "unavailable" };

function parseSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function SkillConnectUnavailableFallback() {
  return (
    <PageShell className="max-w-3xl py-8">
      <div className="mobile-resident-only mobile-resident-stack">
        <section
          className="mobile-resident-hero mobile-resident-enter text-white"
          style={{
            animationDelay: "40ms",
            background:
              "radial-gradient(circle at 16% 18%, rgba(237,170,92,0.28), transparent 24%), radial-gradient(circle at 84% 12%, rgba(96,188,255,0.22), transparent 22%), linear-gradient(160deg, #151f34 0%, #233d63 46%, #31598e 100%)",
          }}
        >
          <div className="mobile-resident-kicker text-white/72">Skill 接入</div>
          <h1 className="mobile-resident-title mt-5 max-w-[8ch]">接入页不可用</h1>
        </section>

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "120ms" }}>
          <div className="mobile-resident-kicker text-[#315d8f]">入口</div>
          <h2 className="mobile-resident-panel-title">常用入口</h2>

          <div className="mt-4 grid gap-2.5">
            <ButtonLink href="/me">返回个人中心</ButtonLink>
            <ButtonLink href="/neighbors" variant="secondary">
              返回邻里
            </ButtonLink>
          </div>
        </section>
      </div>

      <Card className="app-card hidden p-6 sm:p-8 md:block">
        <Card.Header className="p-0">
          <div>
            <p className="section-kicker">Skill 接入</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">接入页不可用</h1>
          </div>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 p-0 pt-6 sm:flex-row">
          <ButtonLink href="/me">返回个人中心</ButtonLink>
          <ButtonLink href="/neighbors" variant="secondary">
            返回邻里
          </ButtonLink>
        </Card.Content>
      </Card>
    </PageShell>
  );
}

async function loadSkillConnectPageState(searchParams: SkillConnectPageProps["searchParams"]): Promise<SkillConnectPageState> {
  try {
    const currentUser = await getCurrentUserFromCookie();
    if (!currentUser) {
      return { kind: "guest" };
    }

    const [{ token, user }, appOrigin, params] = await Promise.all([
      ensureUserSkillAccess(currentUser.id),
      getAppOrigin(),
      searchParams,
    ]);

    const bundleDownloadToken = issueUserSkillBundleDownloadToken({
      id: user.id,
      skillTokenVersion: user.skillTokenVersion,
    });

    return {
      kind: "ready",
      token,
      user,
      appOrigin,
      bundleDownloadToken: bundleDownloadToken.token,
      bundleDownloadTokenExpiresAt: bundleDownloadToken.expiresAt,
      welcome: parseSingle(params?.welcome) === "1",
    };
  } catch (error) {
    console.error("Failed to load /skill/connect page", error);
    return { kind: "unavailable" };
  }
}

export default async function SkillConnectPage({ searchParams }: SkillConnectPageProps) {
  const state = await loadSkillConnectPageState(searchParams);

  if (state.kind === "guest") {
    redirect("/login?next=/skill/connect");
  }

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
