import { Card } from "@heroui/react";
import { redirect } from "next/navigation";
import { AdminInviteClient } from "@/components/admin-invite-client";
import { ButtonLink, PageShell } from "@/components/ui";
import { getCurrentUserFromCookie, isAdminUser } from "@/lib/auth-server";
import { parseAdminTab, type AdminTab } from "@/lib/admin-tabs";

interface AdminPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

type AdminPageState =
  | { kind: "guest" }
  | { kind: "forbidden"; username: string }
  | { kind: "ready"; initialTab: AdminTab }
  | { kind: "unavailable" };

export function AdminPageUnavailableFallback() {
  return (
    <PageShell className="max-w-3xl py-8">
      <div className="mobile-resident-only mobile-resident-stack">
        <section
          className="mobile-resident-hero mobile-resident-enter text-white"
          style={{
            animationDelay: "40ms",
            background:
              "radial-gradient(circle at 16% 18%, rgba(237,170,92,0.28), transparent 24%), radial-gradient(circle at 84% 12%, rgba(140,118,255,0.22), transparent 22%), linear-gradient(160deg, #221f34 0%, #352c54 46%, #4d4477 100%)",
          }}
        >
          <div className="mobile-resident-kicker text-white/72">管理后台</div>
          <h1 className="mobile-resident-title mt-5 max-w-[8ch]">后台不可用</h1>
        </section>

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "120ms" }}>
          <div className="mobile-resident-kicker text-[#315d8f]">入口</div>
          <h2 className="mobile-resident-panel-title">返回常用入口</h2>

          <div className="mt-4 grid gap-2.5">
            <ButtonLink href="/">回到首页</ButtonLink>
            <ButtonLink href="/neighbors" variant="secondary">
              返回邻里
            </ButtonLink>
          </div>
        </section>
      </div>

      <Card className="glass-card hidden p-6 sm:p-8 md:block">
        <Card.Header className="p-0">
          <div>
            <p className="section-kicker">管理后台</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">后台不可用</h1>
          </div>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 p-0 pt-6 sm:flex-row">
          <ButtonLink href="/">回到首页</ButtonLink>
          <ButtonLink href="/neighbors" variant="secondary">
            返回邻里
          </ButtonLink>
        </Card.Content>
      </Card>
    </PageShell>
  );
}

async function loadAdminPageState(searchParams: AdminPageProps["searchParams"]): Promise<AdminPageState> {
  try {
    const currentUser = await getCurrentUserFromCookie();
    const { tab } = await searchParams;
    const initialTab = parseAdminTab(tab);

    if (!currentUser) {
      return { kind: "guest" };
    }

    if (!isAdminUser(currentUser)) {
      return { kind: "forbidden", username: currentUser.username };
    }

    return { kind: "ready", initialTab };
  } catch (error) {
    console.error("Failed to load /admin page", error);
    return { kind: "unavailable" };
  }
}

function AdminForbiddenFallback({ username }: { username: string }) {
  return (
    <PageShell className="max-w-3xl py-8">
      <div className="mobile-resident-only mobile-resident-stack">
        <section
          className="mobile-resident-hero mobile-resident-enter text-white"
          style={{
            animationDelay: "40ms",
            background:
              "radial-gradient(circle at 16% 18%, rgba(237,170,92,0.28), transparent 24%), radial-gradient(circle at 84% 12%, rgba(140,118,255,0.22), transparent 22%), linear-gradient(160deg, #221f34 0%, #352c54 46%, #4d4477 100%)",
          }}
        >
          <div className="mobile-resident-kicker text-white/72">无权限</div>
          <h1 className="mobile-resident-title mt-5 max-w-[8ch]">无法进入后台</h1>
        </section>

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "120ms" }}>
          <div className="mobile-resident-kicker text-[#315d8f]">账号</div>
          <h2 className="mobile-resident-panel-title">{username}</h2>

          <div className="mt-4 grid gap-2.5">
            <ButtonLink href="/posts" variant="secondary">
              返回帖子广场
            </ButtonLink>
            <ButtonLink href="/login?next=/admin">切换账号</ButtonLink>
          </div>
        </section>
      </div>

      <Card className="glass-card hidden p-6 sm:p-8 md:block">
        <Card.Header className="p-0">
          <div>
            <p className="section-kicker">无权限</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">无法进入后台</h1>
          </div>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 p-0 pt-6 sm:flex-row">
          <ButtonLink href="/posts" variant="secondary">
            返回帖子广场
          </ButtonLink>
          <ButtonLink href="/login?next=/admin">切换账号</ButtonLink>
        </Card.Content>
      </Card>
    </PageShell>
  );
}

export default async function AdminInvitesPage({ searchParams }: AdminPageProps) {
  const state = await loadAdminPageState(searchParams);

  if (state.kind === "guest") {
    redirect("/login?next=/admin");
  }

  if (state.kind === "forbidden") {
    return <AdminForbiddenFallback username={state.username} />;
  }

  if (state.kind === "unavailable") {
    return <AdminPageUnavailableFallback />;
  }

  return <AdminInviteClient initialTab={state.initialTab} />;
}
