import { redirect } from "next/navigation";
import { AdminClient } from "@/components/admin-client";
import { getCurrentUserFromCookie, isAdminUser } from "@/lib/auth-server";
import { parseAdminTab, type AdminTab } from "@/lib/admin-tabs";

export const dynamic = "force-dynamic";

interface AdminPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

async function loadAdminPageState(searchParams: AdminPageProps["searchParams"]): Promise<
  | { kind: "guest" }
  | { kind: "forbidden"; username: string }
  | { kind: "ready"; initialTab: AdminTab }
  | { kind: "unavailable" }
> {
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

export function AdminPageUnavailableFallback() {
  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">管理后台</h1>
      <p className="mt-2 text-muted-foreground">后台暂不可用</p>
    </main>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const state = await loadAdminPageState(searchParams);
  if (state.kind === "guest") redirect("/login?next=/admin");
  if (state.kind === "forbidden") {
    return (
      <main className="p-8 text-center">
        <h1 className="text-2xl font-bold">管理后台</h1>
        <p className="mt-2 text-danger">账号 {state.username} 无管理权限</p>
      </main>
    );
  }
  if (state.kind === "unavailable") {
    return <AdminPageUnavailableFallback />;
  }
  return <AdminClient initialTab={state.initialTab} />;
}
