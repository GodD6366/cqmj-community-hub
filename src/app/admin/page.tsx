import { Card } from "@heroui/react";
import { redirect } from "next/navigation";
import { AdminInviteClient } from "@/components/admin-invite-client";
import { ButtonLink, PageShell } from "@/components/ui";
import { getCurrentUserFromCookie, isAdminUser } from "@/lib/auth-server";

export default async function AdminInvitesPage() {
  const currentUser = await getCurrentUserFromCookie();

  if (!currentUser) {
    redirect("/login?next=/admin");
  }

  if (!isAdminUser(currentUser)) {
    return (
      <PageShell className="max-w-3xl py-8">
        <Card className="glass-card p-6 sm:p-8">
          <Card.Header className="p-0">
            <div>
              <p className="section-kicker">Access Denied</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">当前账号没有后台权限</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                你已登录为 {currentUser.username}，但该账号不是管理员。如需管理用户、邀请码或帖子，请使用管理员账号登录。
              </p>
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

  return <AdminInviteClient />;
}
