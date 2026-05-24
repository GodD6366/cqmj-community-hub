import { redirect } from "next/navigation";
import { AdminInviteClient } from "@/components/admin-invite-client";
import { ButtonLink, PageShell } from "@/components/ui";
import { CyberPanel, DataList } from "@/components/resident-shared";
import { getCurrentUserFromCookie, isAdminUser } from "@/lib/auth-server";
import { parseAdminTab, type AdminTab } from "@/lib/admin-tabs";

export const dynamic = "force-dynamic";

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
    <PageShell className="max-w-[1200px]">
      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CyberPanel title="后台不可用" kicker="Admin Unavailable">
          <DataList items={[{ label: "状态", value: "Unavailable" }, { label: "说明", hint: "管理后台暂时无法加载" }]} />
        </CyberPanel>
        <CyberPanel title="常用入口" kicker="Shortcuts">
          <div className="flex flex-wrap gap-3"><ButtonLink href="/">回到首页</ButtonLink><ButtonLink href="/neighbors" variant="secondary">返回邻里</ButtonLink></div>
        </CyberPanel>
      </section>
    </PageShell>
  );
}

async function loadAdminPageState(searchParams: AdminPageProps["searchParams"]): Promise<AdminPageState> {
  try {
    const currentUser = await getCurrentUserFromCookie();
    const { tab } = await searchParams;
    const initialTab = parseAdminTab(tab);
    if (!currentUser) return { kind: "guest" };
    if (!isAdminUser(currentUser)) return { kind: "forbidden", username: currentUser.nickname };
    return { kind: "ready", initialTab };
  } catch (error) {
    console.error("Failed to load /admin page", error);
    return { kind: "unavailable" };
  }
}

function AdminForbiddenFallback({ username }: { username: string }) {
  return (
    <PageShell className="max-w-[1200px]">
      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CyberPanel title="无法进入后台" kicker="Forbidden">
          <DataList items={[{ label: "当前账号", value: username }, { label: "权限状态", value: "无权限" }]} />
        </CyberPanel>
        <CyberPanel title="切换入口" kicker="Account Switch">
          <div className="flex flex-wrap gap-3"><ButtonLink href="/posts" variant="secondary">返回帖子广场</ButtonLink><ButtonLink href="/login?next=/admin">切换账号</ButtonLink></div>
        </CyberPanel>
      </section>
    </PageShell>
  );
}

export default async function AdminInvitesPage({ searchParams }: AdminPageProps) {
  const state = await loadAdminPageState(searchParams);
  if (state.kind === "guest") redirect("/login?next=/admin");
  if (state.kind === "forbidden") return <AdminForbiddenFallback username={state.username} />;
  if (state.kind === "unavailable") return <AdminPageUnavailableFallback />;
  return <AdminInviteClient initialTab={state.initialTab} />;
}
