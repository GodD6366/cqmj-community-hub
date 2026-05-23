"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import { Alert, Button, Card, Input } from "@heroui/react";
import { PageShell, SectionCard } from "./ui";
import { EmptyState, ResidentMetricGrid, ResidentMobileHero, ResidentMobilePanel } from "./resident-shared";
import { useCommunityPosts } from "@/lib/community-store";
import type { AdminPollSummary, AdminUser, PollStatus, PostStatus, ServiceTicketSummary } from "@/lib/types";
import { categoryMeta, pollStatusMeta, serviceTicketCategoryMeta, serviceTicketStatusMeta } from "@/lib/types";
import { adminTabMeta, buildAdminTabHref, parseAdminTab, type AdminTab } from "@/lib/admin-tabs";

type InviteCode = {
  id: string;
  code: string;
  note: string | null;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
};

type AdminPost = {
  id: string;
  title: string;
  content: string;
  category: keyof typeof categoryMeta;
  tags: string[];
  authorName: string;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  favoriteCount: number;
  visibility: string;
  status: string;
  comments: Array<{ id: string }>;
  pinned?: boolean;
  featured?: boolean;
};
type UserEditorState = {
  id: string;
  username: string;
  roomNumber: string;
  disabled: boolean;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String((body as { error?: unknown }).error ?? "请求失败") : "请求失败";
    throw new Error(message);
  }
  if (body === null) {
    throw new Error("响应为空");
  }
  return body;
}

function formatDate(value: string | null) {
  if (!value) return "长期有效";
  return new Date(value).toLocaleString("zh-CN");
}

function toEditorState(user: AdminUser): UserEditorState {
  return {
    id: user.id,
    username: user.username,
    roomNumber: user.roomNumber,
    disabled: user.disabled,
  };
}

const postStatusLabelMap = {
  published: "已发布",
  pending: "待审核",
  rejected: "已驳回",
} as const;

const visibilityLabelMap = {
  community: "全小区可见",
  building: "同楼栋可见",
  private: "私密可见",
} as const;

function getPostStatusLabel(status: string) {
  return postStatusLabelMap[status as keyof typeof postStatusLabelMap] ?? status;
}

function getVisibilityLabel(value: string) {
  return visibilityLabelMap[value as keyof typeof visibilityLabelMap] ?? value;
}

function MobileAdminSection({
  kicker,
  title,
  description,
  delay = "280ms",
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  delay?: string;
  children: ReactNode;
}) {
  return (
    <ResidentMobilePanel delay={delay}>
      <div className="mobile-resident-kicker text-[#315d8f]">{kicker}</div>
      <h2 className="mobile-resident-panel-title">{title}</h2>
      {description ? <p className="mobile-resident-panel-copy">{description}</p> : null}
      <div className="mt-4 space-y-3">{children}</div>
    </ResidentMobilePanel>
  );
}

function FeedbackAlerts({
  message,
  error,
  className,
}: {
  message: string;
  error: string;
  className?: string;
}) {
  if (!message && !error) return null;

  return (
    <div className={className}>
      {message ? (
        <Alert className={error ? "mb-3" : undefined} status="success">
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </div>
  );
}

function AdminTabSwitcher({
  activeTab,
  compact = false,
  onSelect,
}: {
  activeTab: AdminTab;
  compact?: boolean;
  onSelect: (tab: AdminTab) => void;
}) {
  return (
    <div className={compact ? "flex flex-nowrap gap-2 overflow-x-auto pb-1" : "flex flex-wrap gap-2"}>
      {Object.entries(adminTabMeta).map(([key, meta]) => {
        const tab = key as AdminTab;
        const isActive = activeTab === tab;

        return (
          <button
            key={tab}
            type="button"
            aria-pressed={isActive}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[var(--primary)] text-white shadow-[0_12px_26px_rgba(79,99,255,0.22)]"
                : "bg-[var(--surface-muted)] text-slate-700 hover:bg-[rgba(79,99,255,0.08)]"
            }`}
            onClick={() => onSelect(tab)}
          >
            {compact ? meta.shortLabel : meta.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminInviteClient({ initialTab }: { initialTab: AdminTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, logout } = useCommunityPosts();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [polls, setPolls] = useState<AdminPollSummary[]>([]);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicketSummary[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [userEditor, setUserEditor] = useState<UserEditorState | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userActionId, setUserActionId] = useState<string | null>(null);
  const [postDeletingId, setPostDeletingId] = useState<string | null>(null);
  const [postSavingId, setPostSavingId] = useState<string | null>(null);
  const [pollSavingId, setPollSavingId] = useState<string | null>(null);
  const [ticketSavingId, setTicketSavingId] = useState<string | null>(null);
  const [ticketNoteDrafts, setTicketNoteDrafts] = useState<Record<string, string>>({});
  const [loggingOut, setLoggingOut] = useState(false);

  const activeTab = parseAdminTab(searchParams.get("tab") ?? initialTab);
  const sortedCodes = useMemo(() => inviteCodes.slice().sort((a, b) => Number(b.active) - Number(a.active)), [inviteCodes]);
  const sortedPosts = useMemo(() => posts.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [posts]);
  const sortedUsers = useMemo(() => users.slice(), [users]);
  const sortedPolls = useMemo(() => polls.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [polls]);
  const sortedTickets = useMemo(
    () => serviceTickets.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [serviceTickets],
  );
  const adminStats = [
    { label: "用户", value: String(sortedUsers.length).padStart(2, "0") },
    { label: "帖子", value: String(sortedPosts.length).padStart(2, "0") },
    { label: "工单", value: String(sortedTickets.length).padStart(2, "0") },
  ] as const;

  const readAdminJson = async <T,>(response: Response) => {
    if (response.status === 401) {
      router.push("/login?next=/admin");
      throw new Error("登录已失效，请重新登录");
    }
    return readJson<T>(response);
  };

  const loadCodes = async () => {
    const data = await readAdminJson<{ inviteCodes: InviteCode[] }>(
      await fetch("/api/admin/invite-codes", { cache: "no-store" }),
    );
    setInviteCodes(data.inviteCodes ?? []);
  };

  const loadPosts = async () => {
    const data = await readAdminJson<{ posts: AdminPost[] }>(
      await fetch("/api/admin/posts", { cache: "no-store" }),
    );
    setPosts(data.posts ?? []);
  };

  const loadPolls = async () => {
    const data = await readAdminJson<{ polls: AdminPollSummary[] }>(
      await fetch("/api/admin/polls", { cache: "no-store" }),
    );
    setPolls(data.polls ?? []);
  };

  const loadServiceTickets = async () => {
    const data = await readAdminJson<{ serviceTickets: ServiceTicketSummary[] }>(
      await fetch("/api/admin/service-tickets", { cache: "no-store" }),
    );
    const nextTickets = data.serviceTickets ?? [];
    setServiceTickets(nextTickets);
    setTicketNoteDrafts((current) => {
      const next = { ...current };
      for (const ticket of nextTickets) {
        if (next[ticket.id] === undefined) {
          next[ticket.id] = ticket.assigneeNote ?? "";
        }
      }
      return next;
    });
  };

  const loadUsers = async () => {
    const data = await readAdminJson<{ users: AdminUser[] }>(
      await fetch("/api/admin/users", { cache: "no-store" }),
    );
    setUsers(data.users ?? []);
  };

  const loadAdminData = useEffectEvent(async () => {
    await Promise.all([loadUsers(), loadCodes(), loadPosts(), loadPolls(), loadServiceTickets()]);
  });

  useEffect(() => {
    void loadAdminData().catch(() => undefined);
  }, []);

  const switchTab = (tab: AdminTab) => {
    const href = pathname === "/admin" ? buildAdminTabHref(tab) : `${pathname}?tab=${tab}`;
    router.replace(href, { scroll: false });
  };

  const createInvite = async () => {
    setInviteLoading(true);
    setError("");
    setMessage("");
    try {
      await readAdminJson(
        await fetch("/api/admin/invite-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            code,
            note,
            maxUses: maxUses ? Number(maxUses) : null,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          }),
        }),
      );
      setCode("");
      setNote("");
      setMaxUses("");
      setExpiresAt("");
      setMessage("邀请码已创建");
      await loadCodes();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "创建失败");
    } finally {
      setInviteLoading(false);
    }
  };

  const updateInvite = async (id: string, active: boolean) => {
    setInviteLoading(true);
    setError("");
    try {
      await readAdminJson(
        await fetch(`/api/admin/invite-codes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ active }),
        }),
      );
      await loadCodes();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "更新失败");
    } finally {
      setInviteLoading(false);
    }
  };

  const removeInvite = async (id: string) => {
    setInviteLoading(true);
    setError("");
    try {
      await readAdminJson(
        await fetch(`/api/admin/invite-codes/${id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      await loadCodes();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "删除失败");
    } finally {
      setInviteLoading(false);
    }
  };

  const saveUser = async () => {
    if (!userEditor) return;

    setUserSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await readAdminJson<{ user: AdminUser }>(
        await fetch(`/api/admin/users/${userEditor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            username: userEditor.username,
            roomNumber: userEditor.roomNumber,
            disabled: userEditor.disabled,
          }),
        }),
      );
      setMessage(`已更新用户：${data.user.username}`);
      setUserEditor(toEditorState(data.user));
      await loadUsers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存用户失败");
    } finally {
      setUserSaving(false);
    }
  };

  const toggleUserDisabled = async (user: AdminUser) => {
    setUserActionId(user.id);
    setError("");
    setMessage("");
    try {
      const data = await readAdminJson<{ user: AdminUser }>(
        await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            username: user.username,
            roomNumber: user.roomNumber,
            disabled: !user.disabled,
          }),
        }),
      );
      if (userEditor?.id === user.id) {
        setUserEditor(toEditorState(data.user));
      }
      setMessage(data.user.disabled ? `已禁用用户：${data.user.username}` : `已启用用户：${data.user.username}`);
      await loadUsers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "更新用户状态失败");
    } finally {
      setUserActionId(null);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    setUserActionId(user.id);
    setError("");
    setMessage("");
    try {
      await readAdminJson(
        await fetch(`/api/admin/users/${user.id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      if (userEditor?.id === user.id) {
        setUserEditor(null);
      }
      setMessage(`已删除用户：${user.username}`);
      await loadUsers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "删除用户失败");
    } finally {
      setUserActionId(null);
    }
  };

  const updatePostModeration = async (
    postId: string,
    patch: {
      status?: PostStatus;
      pinned?: boolean;
      featured?: boolean;
    },
    successMessage: string,
  ) => {
    setPostSavingId(postId);
    setError("");
    setMessage("");
    try {
      await readAdminJson(
        await fetch(`/api/admin/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patch),
        }),
      );
      setMessage(successMessage);
      await loadPosts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "更新帖子失败");
    } finally {
      setPostSavingId(null);
    }
  };

  const updatePollModeration = async (
    pollId: string,
    patch: {
      status?: PollStatus;
    },
    successMessage: string,
  ) => {
    setPollSavingId(pollId);
    setError("");
    setMessage("");
    try {
      await readAdminJson(
        await fetch(`/api/admin/polls/${pollId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patch),
        }),
      );
      setMessage(successMessage);
      await loadPolls();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "更新投票失败");
    } finally {
      setPollSavingId(null);
    }
  };

  return (
    <PageShell className="max-w-6xl">
      <div className="mobile-resident-only mobile-resident-stack">
        <ResidentMobileHero
          background="radial-gradient(circle at 16% 18%, rgba(237,170,92,0.3), transparent 24%), radial-gradient(circle at 84% 12%, rgba(122,214,255,0.22), transparent 22%), linear-gradient(160deg, #261f1a 0%, #4b3428 46%, #6c4d3b 100%)"
        >
          <div className="mobile-resident-kicker text-white/72">管理后台</div>
          <h1 className="mobile-resident-title mt-5 max-w-[8ch]">后台总览</h1>

          <ResidentMetricGrid className="mt-5" columns={3} items={adminStats} tone="inverse" />
        </ResidentMobileHero>

        <ResidentMobilePanel delay="120ms">
          <div className="mobile-resident-kicker text-[#8a5d39]">账号</div>
          <h2 className="mobile-resident-panel-title">管理员账号</h2>

          <div className="mt-4 grid gap-2.5">
            <div className="rounded-[1.2rem] bg-white/82 px-4 py-3 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
              <div className="text-sm font-semibold text-slate-900">{currentUser?.username ?? "管理员账号"}</div>
            </div>
            <Button
              isPending={loggingOut}
              onPress={async () => {
                setLoggingOut(true);
                try {
                  await logout();
                  router.push("/login");
                } finally {
                  setLoggingOut(false);
                }
              }}
              variant="secondary"
            >
              {loggingOut ? "退出中..." : "退出登录"}
            </Button>
          </div>
        </ResidentMobilePanel>

        <ResidentMobilePanel delay="200ms">
          <div className="mobile-resident-kicker text-[#315d8f]">分组</div>
          <h2 className="mobile-resident-panel-title">分组</h2>

          <div className="mt-4">
            <AdminTabSwitcher activeTab={activeTab} compact onSelect={switchTab} />
          </div>
        </ResidentMobilePanel>

        <FeedbackAlerts className="mobile-resident-enter" error={error} message={message} />

        {activeTab === "users" ? (
          <MobileAdminSection delay="280ms" kicker="用户" title="用户管理">
            {userEditor ? (
              <div className="rounded-[1.22rem] bg-white/82 px-4 py-4 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">正在编辑</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">{userEditor.username}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[0.68rem] font-semibold ${
                      userEditor.disabled ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {userEditor.disabled ? "已禁用" : "启用中"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <Input
                    aria-label="编辑用户名"
                    fullWidth
                    placeholder="输入用户名"
                    value={userEditor.username}
                    onChange={(event) => setUserEditor((current) => (current ? { ...current, username: event.target.value } : current))}
                  />
                  <Input
                    aria-label="编辑房号"
                    fullWidth
                    placeholder="输入房号，例如 1-905"
                    value={userEditor.roomNumber}
                    onChange={(event) => setUserEditor((current) => (current ? { ...current, roomNumber: event.target.value } : current))}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button
                    onPress={() => setUserEditor((current) => (current ? { ...current, disabled: !current.disabled } : current))}
                    size="sm"
                    variant={userEditor.disabled ? "danger" : "secondary"}
                  >
                    {userEditor.disabled ? "启用" : "禁用"}
                  </Button>
                  <Button isPending={userSaving} onPress={saveUser} size="sm">
                    {userSaving ? "保存中" : "保存"}
                  </Button>
                  <Button isDisabled={userSaving} onPress={() => setUserEditor(null)} size="sm" variant="secondary">
                    取消
                  </Button>
                </div>
              </div>
            ) : null}

            {sortedUsers.length === 0 ? (
              <EmptyState title="还没有用户" />
            ) : (
              sortedUsers.map((user) => {
                const readOnly = user.role === "admin";
                const acting = userActionId === user.id;

                return (
                  <article key={user.id} className="rounded-[1.22rem] bg-white/82 px-4 py-4 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-slate-900">{user.username}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold ${
                              user.role === "admin" ? "bg-sky-50 text-sky-700" : "bg-white text-slate-700 ring-1 ring-[rgba(95,116,176,0.08)]"
                            }`}
                          >
                            {user.role === "admin" ? "管理员" : "普通用户"}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold ${
                              user.disabled ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {user.disabled ? "已禁用" : "启用中"}
                          </span>
                        </div>
                      </div>
                      {readOnly ? (
                        <span className="shrink-0 rounded-full bg-[rgba(49,93,143,0.1)] px-3 py-1 text-[0.68rem] font-semibold text-[#315d8f]">只读</span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                      <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">房号 {user.roomNumber || "未绑定"}</div>
                      <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">注册 {formatDate(user.createdAt)}</div>
                      <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">帖子 {user.postCount}</div>
                      <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">评论 {user.commentCount}</div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Button isDisabled={readOnly || userSaving || acting} onPress={() => setUserEditor(toEditorState(user))} size="sm" variant="secondary">
                        编辑
                      </Button>
                      <Button
                        isDisabled={readOnly || userSaving || acting}
                        onPress={() => void toggleUserDisabled(user)}
                        size="sm"
                        variant={user.disabled ? "secondary" : "danger"}
                      >
                        {acting ? "处理中" : user.disabled ? "启用" : "禁用"}
                      </Button>
                      <Button isDisabled={readOnly || userSaving || acting} onPress={() => void deleteUser(user)} size="sm" variant="danger">
                        {acting ? "处理中" : "删除"}
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </MobileAdminSection>
        ) : null}

        {activeTab === "invites" ? (
          <MobileAdminSection delay="280ms" kicker="邀请码" title="邀请码管理">
            <div className="rounded-[1.22rem] bg-white/82 px-4 py-4 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
              <div className="space-y-3">
                <Input
                  aria-label="邀请码"
                  autoCapitalize="characters"
                  fullWidth
                  placeholder="WELCOME-2026"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
                <Input
                  aria-label="备注"
                  fullWidth
                  placeholder="例如：1 号楼新住户"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <Input
                  aria-label="最大次数"
                  fullWidth
                  min="1"
                  placeholder="使用次数上限（可空）"
                  type="number"
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.value)}
                />
                <Input aria-label="到期时间" fullWidth type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
              </div>
              <Button className="mt-4 w-full" isPending={inviteLoading} onPress={createInvite}>
                {inviteLoading ? "保存中..." : "创建邀请码"}
              </Button>
            </div>

            {sortedCodes.length === 0 ? (
              <EmptyState title="还没有邀请码" />
            ) : (
              sortedCodes.map((item) => (
                <article key={item.id} className="rounded-[1.22rem] bg-white/82 px-4 py-4 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-slate-900">{item.code}</div>
                      <div className="mt-2 text-sm text-[var(--muted)]">{item.note || "无备注"}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[0.68rem] font-semibold ${
                        item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {item.active ? "启用中" : "已停用"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--muted)]">
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">
                      已用 {item.usedCount}
                      {item.maxUses === null ? " 次" : ` / ${item.maxUses}`}
                    </div>
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">到期 {formatDate(item.expiresAt)}</div>
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">创建 {formatDate(item.createdAt)}</div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button isDisabled={inviteLoading} onPress={() => void updateInvite(item.id, !item.active)} size="sm" variant="secondary">
                      {item.active ? "停用" : "启用"}
                    </Button>
                    <Button isDisabled={inviteLoading} onPress={() => void removeInvite(item.id)} size="sm" variant="danger">
                      删除
                    </Button>
                  </div>
                </article>
              ))
            )}
          </MobileAdminSection>
        ) : null}

        {activeTab === "posts" ? (
          <MobileAdminSection delay="280ms" kicker="帖子" title="帖子管理">
            {sortedPosts.length === 0 ? (
              <EmptyState title="当前还没有帖子" />
            ) : (
              sortedPosts.map((post) => (
                <article key={post.id} className="rounded-[1.22rem] bg-white/82 px-4 py-4 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                  <div className="text-base font-semibold text-slate-900">{post.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[rgba(49,93,143,0.08)] px-3 py-1 text-[0.68rem] font-semibold text-[#315d8f]">
                      {categoryMeta[post.category]?.label ?? post.category}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold text-slate-700 ring-1 ring-[rgba(95,116,176,0.08)]">
                      {getPostStatusLabel(post.status)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold text-slate-700 ring-1 ring-[rgba(95,116,176,0.08)]">
                      {getVisibilityLabel(post.visibility)}
                    </span>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    作者 {post.authorName} · {formatDate(post.createdAt)}
                  </div>
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{post.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                    <span className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">评论 {post.commentCount}</span>
                    <span className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">收藏 {post.favoriteCount}</span>
                    {post.pinned ? <span className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">已置顶</span> : null}
                    {post.featured ? <span className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">已精选</span> : null}
                  </div>
                  {post.tags.length > 0 ? <div className="mt-3 text-xs text-[var(--muted)]">标签：{post.tags.join(" / ")}</div> : null}

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {(["published", "pending", "rejected"] as const).map((status) => (
                      <Button
                        key={status}
                        isDisabled={postDeletingId !== null || postSavingId !== null || post.status === status}
                        onPress={() => void updatePostModeration(post.id, { status }, `已更新帖子状态：${post.title}`)}
                        size="sm"
                        variant={post.status === status ? "primary" : "secondary"}
                      >
                        {postSavingId === post.id && post.status !== status ? "处理中" : status === "published" ? "发布" : status === "pending" ? "待审" : "驳回"}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Button
                      isDisabled={postDeletingId !== null || postSavingId !== null}
                      onPress={() => void updatePostModeration(post.id, { pinned: !post.pinned }, post.pinned ? `已取消置顶：${post.title}` : `已置顶：${post.title}`)}
                      size="sm"
                      variant="secondary"
                    >
                      {postSavingId === post.id ? "处理中" : post.pinned ? "取消置顶" : "置顶"}
                    </Button>
                    <Button
                      isDisabled={postDeletingId !== null || postSavingId !== null}
                      onPress={() =>
                        void updatePostModeration(
                          post.id,
                          { featured: !post.featured },
                          post.featured ? `已取消精选：${post.title}` : `已设为精选：${post.title}`,
                        )
                      }
                      size="sm"
                      variant="secondary"
                    >
                      {postSavingId === post.id ? "处理中" : post.featured ? "取消精选" : "设为精选"}
                    </Button>
                    <Button
                      isDisabled={postDeletingId !== null || postSavingId !== null}
                      onPress={async () => {
                        setPostDeletingId(post.id);
                        setError("");
                        setMessage("");
                        try {
                          await readAdminJson(
                            await fetch(`/api/admin/posts/${post.id}`, {
                              method: "DELETE",
                              credentials: "include",
                            }),
                          );
                          setMessage(`已删除帖子：${post.title}`);
                          await loadPosts();
                        } catch (submitError) {
                          setError(submitError instanceof Error ? submitError.message : "删帖失败");
                        } finally {
                          setPostDeletingId(null);
                        }
                      }}
                      size="sm"
                      variant="danger"
                    >
                      {postDeletingId === post.id ? "处理中" : "删除"}
                    </Button>
                  </div>
                </article>
              ))
            )}
          </MobileAdminSection>
        ) : null}

        {activeTab === "polls" ? (
          <MobileAdminSection delay="280ms" kicker="投票" title="投票管理">
            {sortedPolls.length === 0 ? (
              <EmptyState title="当前还没有投票" />
            ) : (
              sortedPolls.map((poll) => (
                <article key={poll.id} className="rounded-[1.22rem] bg-white/82 px-4 py-4 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-slate-900">{poll.title}</div>
                      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{poll.description}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold text-slate-700 ring-1 ring-[rgba(95,116,176,0.08)]">
                      {pollStatusMeta[poll.status].label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">发布者 {poll.authorName}</div>
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">参与 {poll.totalVotes}</div>
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">选项 {poll.optionCount}</div>
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">截止 {poll.endsAt ? formatDate(poll.endsAt) : "未设置"}</div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button
                      isDisabled={pollSavingId !== null || poll.status === "closed"}
                      onPress={() => void updatePollModeration(poll.id, { status: "closed" }, `已结束投票：${poll.title}`)}
                      size="sm"
                      variant="secondary"
                    >
                      {pollSavingId === poll.id && poll.status !== "closed" ? "处理中" : "结束"}
                    </Button>
                    <Button
                      isDisabled={pollSavingId !== null || poll.status === "active"}
                      onPress={() => void updatePollModeration(poll.id, { status: "active" }, `已重新开放投票：${poll.title}`)}
                      size="sm"
                      variant="secondary"
                    >
                      {pollSavingId === poll.id && poll.status !== "active" ? "处理中" : "重开"}
                    </Button>
                    <Button
                      isDisabled={pollSavingId !== null}
                      onPress={async () => {
                        setPollSavingId(poll.id);
                        setError("");
                        setMessage("");
                        try {
                          await readAdminJson(
                            await fetch(`/api/admin/polls/${poll.id}`, {
                              method: "DELETE",
                              credentials: "include",
                            }),
                          );
                          setMessage(`已删除投票：${poll.title}`);
                          await loadPolls();
                        } catch (submitError) {
                          setError(submitError instanceof Error ? submitError.message : "删除投票失败");
                        } finally {
                          setPollSavingId(null);
                        }
                      }}
                      size="sm"
                      variant="danger"
                    >
                      {pollSavingId === poll.id ? "处理中" : "删除"}
                    </Button>
                  </div>
                </article>
              ))
            )}
          </MobileAdminSection>
        ) : null}

        {activeTab === "tickets" ? (
          <MobileAdminSection delay="280ms" kicker="工单" title="工单管理">
            {sortedTickets.length === 0 ? (
              <EmptyState title="当前还没有工单" />
            ) : (
              sortedTickets.map((ticket) => (
                <article key={ticket.id} className="rounded-[1.22rem] bg-white/82 px-4 py-4 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-slate-900">{ticket.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[rgba(49,93,143,0.08)] px-3 py-1 text-[0.68rem] font-semibold text-[#315d8f]">
                          {serviceTicketCategoryMeta[ticket.category].label}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold text-slate-700 ring-1 ring-[rgba(95,116,176,0.08)]">
                          {serviceTicketStatusMeta[ticket.status].label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{ticket.description}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">发起人 {ticket.authorName}</div>
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">房号 {ticket.roomNumber}</div>
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">更新 {formatDate(ticket.updatedAt)}</div>
                    <div className="rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2">分类 {serviceTicketCategoryMeta[ticket.category].label}</div>
                  </div>

                  <div className="mt-4">
                    <Input
                      aria-label={`工单备注 ${ticket.title}`}
                      fullWidth
                      placeholder="处理备注"
                      value={ticketNoteDrafts[ticket.id] ?? ""}
                      onChange={(event) =>
                        setTicketNoteDrafts((current) => ({
                          ...current,
                          [ticket.id]: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {(["open", "processing", "resolved"] as const).map((status) => (
                      <Button
                        key={status}
                        isDisabled={ticketSavingId !== null || ticket.status === status}
                        onPress={async () => {
                          setTicketSavingId(ticket.id);
                          setError("");
                          setMessage("");
                          try {
                            await readAdminJson(
                              await fetch(`/api/admin/service-tickets/${ticket.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({
                                  status,
                                  assigneeNote: (ticketNoteDrafts[ticket.id] ?? "").trim(),
                                }),
                              }),
                            );
                            setMessage(`已更新工单：${ticket.title}`);
                            await loadServiceTickets();
                          } catch (submitError) {
                            setError(submitError instanceof Error ? submitError.message : "更新工单失败");
                          } finally {
                            setTicketSavingId(null);
                          }
                        }}
                        size="sm"
                        variant={ticket.status === status ? "primary" : "secondary"}
                      >
                        {ticketSavingId === ticket.id && ticket.status !== status ? "处理中" : serviceTicketStatusMeta[status].label}
                      </Button>
                    ))}
                  </div>
                </article>
              ))
            )}
          </MobileAdminSection>
        ) : null}
      </div>

      <section className="hero-aurora hidden rounded-[1.7rem] p-6 text-white sm:p-8 md:block">
        <p className="text-sm font-medium text-slate-300">管理员后台</p>
        <h1 className="editorial-title mt-2 text-3xl font-semibold sm:text-4xl">后台总览</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
          用户、邀请码、帖子、投票、工单。
        </p>
      </section>

      <SectionCard className="mt-4 hidden p-6 sm:mt-6 sm:p-8 md:block">
        <Card.Header className="flex flex-col gap-3 p-0 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Card.Title className="text-xl font-semibold text-slate-900">管理员账号</Card.Title>
            <Card.Description className="mt-2 text-sm leading-6 text-slate-600">
              {currentUser?.username ?? "管理员账号"}
            </Card.Description>
          </div>
          <Button
            isPending={loggingOut}
            onPress={async () => {
              setLoggingOut(true);
              try {
                await logout();
                router.push("/login");
              } finally {
                setLoggingOut(false);
              }
            }}
            variant="secondary"
          >
            {loggingOut ? "退出中..." : "退出登录"}
          </Button>
        </Card.Header>
      </SectionCard>

      <SectionCard className="mt-4 hidden p-6 sm:mt-6 sm:p-8 md:block">
        <Card.Header className="flex flex-col gap-3 p-0">
          <div>
            <Card.Title className="text-xl font-semibold text-slate-900">分组</Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="p-0 pt-5">
          <AdminTabSwitcher activeTab={activeTab} onSelect={switchTab} />
        </Card.Content>
      </SectionCard>

      <FeedbackAlerts className="mt-4 sm:mt-6" error={error} message={message} />

      {activeTab === "users" ? (
        <SectionCard className="mt-4 hidden p-6 sm:mt-6 sm:p-8 md:block">
          <Card.Header className="flex flex-col gap-3 p-0 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Card.Title className="text-xl font-semibold text-slate-900">用户管理</Card.Title>
            </div>
          </Card.Header>

          {userEditor ? (
            <div className="mt-5 rounded-[1.15rem] bg-[var(--surface-muted)] p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">正在编辑</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{userEditor.username}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onPress={() => setUserEditor((current) => (current ? { ...current, disabled: !current.disabled } : current))}
                    variant={userEditor.disabled ? "danger" : "secondary"}
                  >
                    {userEditor.disabled ? "状态：已禁用" : "状态：启用中"}
                  </Button>
                  <Button isPending={userSaving} onPress={saveUser}>
                    {userSaving ? "保存中..." : "保存修改"}
                  </Button>
                  <Button isDisabled={userSaving} onPress={() => setUserEditor(null)} variant="secondary">
                    取消
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input
                  aria-label="编辑用户名"
                  fullWidth
                  placeholder="输入用户名"
                  value={userEditor.username}
                  onChange={(event) => setUserEditor((current) => (current ? { ...current, username: event.target.value } : current))}
                />
                <Input
                  aria-label="编辑房号"
                  fullWidth
                  placeholder="输入房号，例如 1-905"
                  value={userEditor.roomNumber}
                  onChange={(event) => setUserEditor((current) => (current ? { ...current, roomNumber: event.target.value } : current))}
                />
              </div>
            </div>
          ) : null}

          <Card.Content className="mt-4 space-y-4 p-0">
            {sortedUsers.length === 0 ? (
              <p className="text-sm text-slate-500">当前还没有用户。</p>
            ) : (
              sortedUsers.map((user) => {
                const readOnly = user.role === "admin";
                const acting = userActionId === user.id;

                return (
                  <article key={user.id} className="rounded-[1.15rem] bg-[var(--surface-muted)] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">{user.username}</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${user.role === "admin" ? "bg-sky-50 text-sky-700" : "bg-white/90 text-slate-700"}`}>
                            {user.role === "admin" ? "管理员" : "普通用户"}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${user.disabled ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {user.disabled ? "已禁用" : "启用中"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          房号：{user.roomNumber || "未绑定"} · 注册：{formatDate(user.createdAt)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-2xl bg-white/80 px-3 py-2">帖子 {user.postCount}</span>
                          <span className="rounded-2xl bg-white/80 px-3 py-2">评论 {user.commentCount}</span>
                          {readOnly ? <span className="rounded-2xl bg-white/80 px-3 py-2">只读</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 text-sm">
                        <Button
                          isDisabled={readOnly || userSaving || acting}
                          onPress={() => setUserEditor(toEditorState(user))}
                          variant="secondary"
                        >
                          编辑
                        </Button>
                        <Button
                          isDisabled={readOnly || userSaving || acting}
                          onPress={() => void toggleUserDisabled(user)}
                          variant={user.disabled ? "secondary" : "danger"}
                        >
                          {acting ? "处理中..." : user.disabled ? "启用" : "禁用"}
                        </Button>
                        <Button
                          isDisabled={readOnly || userSaving || acting}
                          onPress={() => void deleteUser(user)}
                          variant="danger"
                        >
                          {acting ? "处理中..." : "删除"}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </Card.Content>
        </SectionCard>
      ) : null}

      {activeTab === "invites" ? (
        <SectionCard className="mt-4 hidden p-6 sm:mt-6 sm:p-8 md:block">
          <Card.Header className="flex flex-col gap-3 p-0 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Card.Title className="text-xl font-semibold text-slate-900">创建邀请码</Card.Title>
            </div>
          </Card.Header>

          <Card.Content className="mt-5 grid gap-4 p-0 md:grid-cols-2">
            <Input
              aria-label="邀请码"
              fullWidth
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="邀请码，例如: WELCOME-2026"
              autoCapitalize="characters"
            />
            <Input
              aria-label="备注"
              fullWidth
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="备注，例如: 1 号楼新住户"
            />
            <Input
              aria-label="最大次数"
              fullWidth
              type="number"
              min="1"
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              placeholder="使用次数上限（可空）"
            />
            <Input
              aria-label="到期时间"
              fullWidth
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </Card.Content>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button isPending={inviteLoading} onPress={createInvite}>
              {inviteLoading ? "保存中..." : "创建邀请码"}
            </Button>
          </div>
          <Card.Content className="mt-4 space-y-4 p-0">
            {sortedCodes.length === 0 ? (
              <p className="text-sm text-slate-500">还没有邀请码，先创建一个。</p>
            ) : (
              sortedCodes.map((item) => (
                <article key={item.id} className="rounded-[1.15rem] bg-[var(--surface-muted)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{item.code}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {item.active ? "启用中" : "已停用"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.note || "无备注"}</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white/80 px-3 py-2">已用 {item.usedCount}{item.maxUses === null ? " 次" : ` / ${item.maxUses}`}</div>
                        <div className="rounded-2xl bg-white/80 px-3 py-2">到期：{formatDate(item.expiresAt)}</div>
                        <div className="rounded-2xl bg-white/80 px-3 py-2">创建：{formatDate(item.createdAt)}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Button isDisabled={inviteLoading} onPress={() => void updateInvite(item.id, !item.active)} variant="secondary">
                        {item.active ? "停用" : "启用"}
                      </Button>
                      <Button isDisabled={inviteLoading} onPress={() => void removeInvite(item.id)} variant="danger">
                        删除
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </Card.Content>
        </SectionCard>
      ) : null}

      {activeTab === "posts" ? (
        <SectionCard className="mt-4 hidden p-6 sm:mt-6 sm:p-8 md:block">
          <Card.Header className="p-0">
            <Card.Title className="text-xl font-semibold text-slate-900">帖子管理</Card.Title>
          </Card.Header>
          <Card.Content className="mt-4 space-y-4 p-0">
            {sortedPosts.length === 0 ? (
              <p className="text-sm text-slate-500">当前还没有帖子。</p>
            ) : (
              sortedPosts.map((post) => (
                <article key={post.id} className="rounded-[1.15rem] bg-[var(--surface-muted)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{post.title}</h3>
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
                          {categoryMeta[post.category]?.label ?? post.category}
                        </span>
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
                          {getPostStatusLabel(post.status)}
                        </span>
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
                          {getVisibilityLabel(post.visibility)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        作者：{post.authorName} · 发布：{formatDate(post.createdAt)}
                      </p>
                      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {post.content}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-2xl bg-white/80 px-3 py-2">评论 {post.commentCount}</span>
                        <span className="rounded-2xl bg-white/80 px-3 py-2">收藏 {post.favoriteCount}</span>
                        {post.pinned ? <span className="rounded-2xl bg-white/80 px-3 py-2">已置顶</span> : null}
                        {post.featured ? <span className="rounded-2xl bg-white/80 px-3 py-2">已精选</span> : null}
                        {post.tags.length > 0 ? <span className="rounded-2xl bg-white/80 px-3 py-2">标签 {post.tags.join(" / ")}</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 text-sm">
                      {(["published", "pending", "rejected"] as const).map((status) => (
                        <Button
                          key={status}
                          isDisabled={postDeletingId !== null || postSavingId !== null || post.status === status}
                          onPress={() =>
                            void updatePostModeration(
                              post.id,
                              { status },
                              `已更新帖子状态：${post.title}`,
                            )
                          }
                          size="sm"
                          variant={post.status === status ? "primary" : "secondary"}
                        >
                          {postSavingId === post.id && post.status !== status
                            ? "处理中..."
                            : status === "published"
                              ? "发布"
                              : status === "pending"
                                ? "待审"
                                : "驳回"}
                        </Button>
                      ))}
                      <Button
                        isDisabled={postDeletingId !== null || postSavingId !== null}
                        onPress={() =>
                          void updatePostModeration(
                            post.id,
                            { pinned: !post.pinned },
                            post.pinned ? `已取消置顶：${post.title}` : `已置顶：${post.title}`,
                          )
                        }
                        size="sm"
                        variant="secondary"
                      >
                        {postSavingId === post.id ? "处理中..." : post.pinned ? "取消置顶" : "置顶"}
                      </Button>
                      <Button
                        isDisabled={postDeletingId !== null || postSavingId !== null}
                        onPress={() =>
                          void updatePostModeration(
                            post.id,
                            { featured: !post.featured },
                            post.featured ? `已取消精选：${post.title}` : `已设为精选：${post.title}`,
                          )
                        }
                        size="sm"
                        variant="secondary"
                      >
                        {postSavingId === post.id ? "处理中..." : post.featured ? "取消精选" : "设为精选"}
                      </Button>
                      <Button
                        isDisabled={postDeletingId !== null || postSavingId !== null}
                        onPress={async () => {
                          setPostDeletingId(post.id);
                          setError("");
                          setMessage("");
                          try {
                            await readAdminJson(
                              await fetch(`/api/admin/posts/${post.id}`, {
                                method: "DELETE",
                                credentials: "include",
                              }),
                            );
                            setMessage(`已删除帖子：${post.title}`);
                            await loadPosts();
                          } catch (submitError) {
                            setError(submitError instanceof Error ? submitError.message : "删帖失败");
                          } finally {
                            setPostDeletingId(null);
                          }
                        }}
                        variant="danger"
                      >
                        {postDeletingId === post.id ? "处理中..." : "删除帖子"}
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </Card.Content>
        </SectionCard>
      ) : null}

      {activeTab === "polls" ? (
        <SectionCard className="mt-4 hidden p-6 sm:mt-6 sm:p-8 md:block">
          <Card.Header className="p-0">
            <Card.Title className="text-xl font-semibold text-slate-900">投票管理</Card.Title>
          </Card.Header>
          <Card.Content className="mt-4 space-y-4 p-0">
            {sortedPolls.length === 0 ? (
              <p className="text-sm text-slate-500">当前还没有投票。</p>
            ) : (
              sortedPolls.map((poll) => (
                <article key={poll.id} className="rounded-[1.15rem] bg-[var(--surface-muted)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{poll.title}</h3>
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
                          {pollStatusMeta[poll.status].label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{poll.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-2xl bg-white/80 px-3 py-2">发布者 {poll.authorName}</span>
                        <span className="rounded-2xl bg-white/80 px-3 py-2">参与 {poll.totalVotes}</span>
                        <span className="rounded-2xl bg-white/80 px-3 py-2">选项 {poll.optionCount}</span>
                        <span className="rounded-2xl bg-white/80 px-3 py-2">
                          截止 {poll.endsAt ? formatDate(poll.endsAt) : "未设置"}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 text-sm">
                      <Button
                        isDisabled={pollSavingId !== null || poll.status === "closed"}
                        onPress={() =>
                          void updatePollModeration(poll.id, { status: "closed" }, `已结束投票：${poll.title}`)
                        }
                        size="sm"
                        variant="secondary"
                      >
                        {pollSavingId === poll.id && poll.status !== "closed" ? "处理中..." : "结束投票"}
                      </Button>
                      <Button
                        isDisabled={pollSavingId !== null || poll.status === "active"}
                        onPress={() =>
                          void updatePollModeration(poll.id, { status: "active" }, `已重新开放投票：${poll.title}`)
                        }
                        size="sm"
                        variant="secondary"
                      >
                        {pollSavingId === poll.id && poll.status !== "active" ? "处理中..." : "重新开放"}
                      </Button>
                      <Button
                        isDisabled={pollSavingId !== null}
                        onPress={async () => {
                          setPollSavingId(poll.id);
                          setError("");
                          setMessage("");
                          try {
                            await readAdminJson(
                              await fetch(`/api/admin/polls/${poll.id}`, {
                                method: "DELETE",
                                credentials: "include",
                              }),
                            );
                            setMessage(`已删除投票：${poll.title}`);
                            await loadPolls();
                          } catch (submitError) {
                            setError(submitError instanceof Error ? submitError.message : "删除投票失败");
                          } finally {
                            setPollSavingId(null);
                          }
                        }}
                        size="sm"
                        variant="danger"
                      >
                        {pollSavingId === poll.id ? "处理中..." : "删除投票"}
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </Card.Content>
        </SectionCard>
      ) : null}

      {activeTab === "tickets" ? (
        <SectionCard className="mt-4 hidden p-6 sm:mt-6 sm:p-8 md:block">
          <Card.Header className="p-0">
            <Card.Title className="text-xl font-semibold text-slate-900">工单管理</Card.Title>
          </Card.Header>
          <Card.Content className="mt-4 space-y-4 p-0">
            {sortedTickets.length === 0 ? (
              <p className="text-sm text-slate-500">当前还没有服务工单。</p>
            ) : (
              sortedTickets.map((ticket) => (
                <article key={ticket.id} className="rounded-[1.15rem] bg-[var(--surface-muted)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{ticket.title}</h3>
                        <span className="rounded-full bg-[rgba(49,93,143,0.08)] px-3 py-1 text-xs font-medium text-[#315d8f]">
                          {serviceTicketCategoryMeta[ticket.category].label}
                        </span>
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
                          {serviceTicketStatusMeta[ticket.status].label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{ticket.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-2xl bg-white/80 px-3 py-2">发起人 {ticket.authorName}</span>
                        <span className="rounded-2xl bg-white/80 px-3 py-2">更新 {formatDate(ticket.updatedAt)}</span>
                      </div>
                      <div className="mt-4">
                        <Input
                          aria-label={`工单备注 ${ticket.title}`}
                          fullWidth
                          value={ticketNoteDrafts[ticket.id] ?? ""}
                          onChange={(event) =>
                            setTicketNoteDrafts((current) => ({
                              ...current,
                              [ticket.id]: event.target.value,
                            }))
                          }
                          placeholder="处理备注：例如 已安排工程人员下午上门排查"
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {(["open", "processing", "resolved"] as const).map((status) => (
                        <Button
                          key={status}
                          isDisabled={ticketSavingId !== null || ticket.status === status}
                          onPress={async () => {
                            setTicketSavingId(ticket.id);
                            setError("");
                            setMessage("");
                            try {
                              await readAdminJson(
                                await fetch(`/api/admin/service-tickets/${ticket.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({
                                    status,
                                    assigneeNote: (ticketNoteDrafts[ticket.id] ?? "").trim(),
                                  }),
                                }),
                              );
                              setMessage(`已更新工单：${ticket.title}`);
                              await loadServiceTickets();
                            } catch (submitError) {
                              setError(submitError instanceof Error ? submitError.message : "更新工单失败");
                            } finally {
                              setTicketSavingId(null);
                            }
                          }}
                          size="sm"
                          variant={ticket.status === status ? "primary" : "secondary"}
                        >
                          {ticketSavingId === ticket.id && ticket.status !== status ? "处理中..." : serviceTicketStatusMeta[status].label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </article>
              ))
            )}
          </Card.Content>
        </SectionCard>
      ) : null}
    </PageShell>
  );
}
