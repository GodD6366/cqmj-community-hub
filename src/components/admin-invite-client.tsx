"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Input } from "@heroui/react";
import { PageShell } from "./ui";
import { CyberPanel, CyberStatGrid, DataList, EmptyState } from "./resident-shared";
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
  nickname: string;
  roomNumber: string;
  disabled: boolean;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String((body as { error?: unknown }).error ?? "请求失败") : "请求失败";
    throw new Error(message);
  }
  if (body === null) throw new Error("响应为空");
  return body;
}

function formatDate(value: string | null) {
  if (!value) return "长期有效";
  return new Date(value).toLocaleString("zh-CN");
}

function toEditorState(user: AdminUser): UserEditorState {
  return { id: user.id, username: user.username, nickname: user.nickname, roomNumber: user.roomNumber, disabled: user.disabled };
}

function getPostStatusLabel(status: string) {
  if (status === "published") return "已发布";
  if (status === "pending") return "待审核";
  if (status === "rejected") return "已驳回";
  return status;
}

function getVisibilityLabel(value: string) {
  if (value === "community") return "全小区可见";
  if (value === "building") return "同楼栋可见";
  if (value === "private") return "私密可见";
  return value;
}

function FeedbackAlerts({ message, error }: { message: string; error: string }) {
  if (!message && !error) return null;
  return (
    <div className="grid gap-3">
      {message ? <Alert status="success"><Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content></Alert> : null}
      {error ? <Alert status="danger"><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}
    </div>
  );
}

function AdminNav({ activeTab, onSelect }: { activeTab: AdminTab; onSelect: (tab: AdminTab) => void }) {
  return (
    <div className="grid gap-2">
      {Object.entries(adminTabMeta).map(([key, meta]) => {
        const tab = key as AdminTab;
        const isActive = activeTab === tab;
        return (
          <button key={tab} type="button" onClick={() => onSelect(tab)} className={`app-shell-link text-left ${isActive ? "is-active" : ""}`}>
            <span className="app-shell-link-copy">
              <span className="app-shell-link-title">{meta.label}</span>
              <span className="app-shell-link-meta">{meta.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AdminInviteClient({ initialTab }: { initialTab: AdminTab }) {
  const router = useRouter();
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
  const sortedTickets = useMemo(() => serviceTickets.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [serviceTickets]);
  const adminStats = [
    { label: "用户", value: String(sortedUsers.length).padStart(2, "0") },
    { label: "帖子", value: String(sortedPosts.length).padStart(2, "0") },
    { label: "投票", value: String(sortedPolls.length).padStart(2, "0") },
    { label: "工单", value: String(sortedTickets.length).padStart(2, "0") },
  ] as const;

  const readAdminJson = useCallback(async <T,>(response: Response) => {
    if (response.status === 401) {
      router.push("/login?next=/admin");
      throw new Error("登录已失效，请重新登录");
    }
    return readJson<T>(response);
  }, [router]);

  const loadCodes = async () => {
    const data = await readAdminJson<{ inviteCodes: InviteCode[] }>(await fetch("/api/admin/invite-codes", { cache: "no-store" }));
    setInviteCodes(data.inviteCodes ?? []);
  };
  const loadPosts = async () => {
    const data = await readAdminJson<{ posts: AdminPost[] }>(await fetch("/api/admin/posts", { cache: "no-store" }));
    setPosts(data.posts ?? []);
  };
  const loadPolls = async () => {
    const data = await readAdminJson<{ polls: AdminPollSummary[] }>(await fetch("/api/admin/polls", { cache: "no-store" }));
    setPolls(data.polls ?? []);
  };
  const loadServiceTickets = async () => {
    const data = await readAdminJson<{ serviceTickets: ServiceTicketSummary[] }>(await fetch("/api/admin/service-tickets", { cache: "no-store" }));
    const nextTickets = data.serviceTickets ?? [];
    setServiceTickets(nextTickets);
    setTicketNoteDrafts((current) => {
      const next = { ...current };
      for (const ticket of nextTickets) if (next[ticket.id] === undefined) next[ticket.id] = ticket.assigneeNote ?? "";
      return next;
    });
  };
  const loadUsers = async () => {
    const data = await readAdminJson<{ users: AdminUser[] }>(await fetch("/api/admin/users", { cache: "no-store" }));
    setUsers(data.users ?? []);
  };

  useEffect(() => {
    void (async () => {
      try {
        const [usersData, codesData, postsData, pollsData, ticketsData] = await Promise.all([
          readAdminJson<{ users: AdminUser[] }>(await fetch("/api/admin/users", { cache: "no-store" })),
          readAdminJson<{ inviteCodes: InviteCode[] }>(await fetch("/api/admin/invite-codes", { cache: "no-store" })),
          readAdminJson<{ posts: AdminPost[] }>(await fetch("/api/admin/posts", { cache: "no-store" })),
          readAdminJson<{ polls: AdminPollSummary[] }>(await fetch("/api/admin/polls", { cache: "no-store" })),
          readAdminJson<{ serviceTickets: ServiceTicketSummary[] }>(await fetch("/api/admin/service-tickets", { cache: "no-store" })),
        ]);
        setUsers(usersData.users ?? []);
        setInviteCodes(codesData.inviteCodes ?? []);
        setPosts(postsData.posts ?? []);
        setPolls(pollsData.polls ?? []);
        const nextTickets = ticketsData.serviceTickets ?? [];
        setServiceTickets(nextTickets);
        setTicketNoteDrafts((current) => {
          const next = { ...current };
          for (const ticket of nextTickets) if (next[ticket.id] === undefined) next[ticket.id] = ticket.assigneeNote ?? "";
          return next;
        });
      } catch {
        // ignore initial admin load errors here; UI feedback comes from later actions
      }
    })();
  }, [readAdminJson]);

  const switchTab = (tab: AdminTab) => router.replace(buildAdminTabHref(tab), { scroll: false });

  const createInvite = async () => {
    setInviteLoading(true); setError(""); setMessage("");
    try {
      await readAdminJson(await fetch("/api/admin/invite-codes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ code, note, maxUses: maxUses ? Number(maxUses) : null, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }) }));
      setCode(""); setNote(""); setMaxUses(""); setExpiresAt(""); setMessage("邀请码已创建"); await loadCodes();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "创建失败"); } finally { setInviteLoading(false); }
  };

  const updateInvite = async (id: string, active: boolean) => {
    setInviteLoading(true); setError("");
    try {
      await readAdminJson(await fetch(`/api/admin/invite-codes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ active }) }));
      await loadCodes();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "更新失败"); } finally { setInviteLoading(false); }
  };

  const removeInvite = async (id: string) => {
    setInviteLoading(true); setError("");
    try {
      await readAdminJson(await fetch(`/api/admin/invite-codes/${id}`, { method: "DELETE", credentials: "include" }));
      await loadCodes();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "删除失败"); } finally { setInviteLoading(false); }
  };

  const saveUser = async () => {
    if (!userEditor) return;
    setUserSaving(true); setError(""); setMessage("");
    try {
      const data = await readAdminJson<{ user: AdminUser }>(await fetch(`/api/admin/users/${userEditor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ username: userEditor.username, nickname: userEditor.nickname, roomNumber: userEditor.roomNumber, disabled: userEditor.disabled }) }));
      setMessage(`已更新用户：${data.user.nickname}`); setUserEditor(toEditorState(data.user)); await loadUsers();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "保存用户失败"); } finally { setUserSaving(false); }
  };

  const toggleUserDisabled = async (user: AdminUser) => {
    setUserActionId(user.id); setError(""); setMessage("");
    try {
      const data = await readAdminJson<{ user: AdminUser }>(await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ username: user.username, nickname: user.nickname, roomNumber: user.roomNumber, disabled: !user.disabled }) }));
      if (userEditor?.id === user.id) setUserEditor(toEditorState(data.user));
      setMessage(data.user.disabled ? `已禁用用户：${data.user.nickname}` : `已启用用户：${data.user.nickname}`); await loadUsers();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "更新用户状态失败"); } finally { setUserActionId(null); }
  };

  const deleteUser = async (user: AdminUser) => {
    setUserActionId(user.id); setError(""); setMessage("");
    try {
      await readAdminJson(await fetch(`/api/admin/users/${user.id}`, { method: "DELETE", credentials: "include" }));
      if (userEditor?.id === user.id) setUserEditor(null);
      setMessage(`已删除用户：${user.nickname}`); await loadUsers();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "删除用户失败"); } finally { setUserActionId(null); }
  };

  const updatePostModeration = async (postId: string, patch: { status?: PostStatus; pinned?: boolean; featured?: boolean }, successMessage: string) => {
    setPostSavingId(postId); setError(""); setMessage("");
    try {
      await readAdminJson(await fetch(`/api/admin/posts/${postId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(patch) }));
      setMessage(successMessage); await loadPosts();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "更新帖子失败"); } finally { setPostSavingId(null); }
  };

  const updatePollModeration = async (pollId: string, patch: { status?: PollStatus }, successMessage: string) => {
    setPollSavingId(pollId); setError(""); setMessage("");
    try {
      await readAdminJson(await fetch(`/api/admin/polls/${pollId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(patch) }));
      setMessage(successMessage); await loadPolls();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "更新投票失败"); } finally { setPollSavingId(null); }
  };

  return (
    <PageShell className="max-w-[1600px]">
      <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="grid gap-4">
          <CyberPanel title="管理后台系统" kicker="后台总览">
            <div className="text-sm leading-6 text-[var(--muted)]">用户、邀请码、内容审核、投票管理与工单协同。</div>
            <div className="mt-4 rounded-[1rem] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">后台状态</div>
              <pre className="m-0 whitespace-pre-wrap text-[0.78rem] leading-7 text-[var(--foreground)]">{`数据连接：正常\n当前权限：管理员\n当前账号：${currentUser?.nickname ?? "ADMIN"}\n建议操作：处理审核与工单`}</pre>
            </div>
          </CyberPanel>

          <CyberPanel title="后台概况" kicker="Overview">
            <CyberStatGrid columns={2} items={adminStats.map((item) => ({ label: item.label, value: item.value }))} />
          </CyberPanel>

          <CyberPanel title="模块切换" kicker="Modules">
            <AdminNav activeTab={activeTab} onSelect={switchTab} />
          </CyberPanel>

          <CyberPanel title="管理员" kicker="Session">
            <DataList items={[{ label: currentUser?.nickname ?? "管理员账号", hint: currentUser ? `用户名：${currentUser.username}` : "超级权限会话" }]} />
            <Button className="mt-4 w-full" isPending={loggingOut} onPress={async () => { setLoggingOut(true); try { await logout(); router.push("/login"); } finally { setLoggingOut(false); } }} variant="secondary">{loggingOut ? "退出中..." : "退出登录"}</Button>
          </CyberPanel>
        </aside>

        <div className="grid gap-4">
          <CyberPanel title={adminTabMeta[activeTab].label} kicker="Admin Module">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[1.7rem] font-semibold tracking-[-0.05em] text-slate-950">{adminTabMeta[activeTab].label}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{adminTabMeta[activeTab].description}</div>
              </div>
              <div className="grid grid-cols-4 gap-3 lg:min-w-[420px]">
                {adminStats.map((item) => <div key={item.label} className="app-card-muted px-3 py-4 text-center"><div className="text-xs text-[var(--muted)]">{item.label}</div><div className="mt-2 text-[1.3rem] font-semibold text-slate-950">{item.value}</div></div>)}
              </div>
            </div>
          </CyberPanel>

          <FeedbackAlerts error={error} message={message} />

          {activeTab === "users" ? (
            <div className="app-card p-5">
              <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div>{userEditor ? <div className="app-card-muted p-4"><div className="text-sm font-semibold text-slate-900">编辑用户</div><div className="mt-3 grid gap-3"><Input aria-label="编辑用户名" fullWidth value={userEditor.username} onChange={(event) => setUserEditor((current) => (current ? { ...current, username: event.target.value } : current))} placeholder="输入用户名" /><Input aria-label="编辑昵称" fullWidth value={userEditor.nickname} onChange={(event) => setUserEditor((current) => (current ? { ...current, nickname: event.target.value } : current))} placeholder="输入昵称" /><Input aria-label="编辑房号" fullWidth value={userEditor.roomNumber} onChange={(event) => setUserEditor((current) => (current ? { ...current, roomNumber: event.target.value } : current))} placeholder="输入房号，例如 1-905" /></div><div className="mt-4 flex gap-2"><Button onPress={() => setUserEditor((current) => (current ? { ...current, disabled: !current.disabled } : current))} variant={userEditor.disabled ? "danger" : "secondary"}>{userEditor.disabled ? "启用" : "禁用"}</Button><Button isPending={userSaving} onPress={saveUser}>{userSaving ? "保存中..." : "保存"}</Button><Button isDisabled={userSaving} onPress={() => setUserEditor(null)} variant="secondary">取消</Button></div></div> : <div className="app-card-muted p-4 text-sm text-[var(--muted)]">选择右侧用户可进入编辑。</div>}</div>
                <div className="grid gap-3">{sortedUsers.length === 0 ? <EmptyState title="当前还没有用户。" /> : sortedUsers.map((user) => { const readOnly = user.role === "admin"; const acting = userActionId === user.id; return <article key={user.id} className="app-card-muted p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-base font-semibold text-slate-950">{user.nickname}</div><div className="mt-1 text-sm text-[var(--muted)]">房号 {user.roomNumber || "未绑定"} · 注册 {formatDate(user.createdAt)}</div></div><div className="flex flex-wrap gap-2"><span className="app-chip">{user.role === "admin" ? "管理员" : "普通用户"}</span><span className="app-chip app-chip-muted">{user.disabled ? "已禁用" : "启用中"}</span></div></div><div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]"><span className="rounded-full border border-[var(--border)] px-3 py-1">帖子 {user.postCount}</span><span className="rounded-full border border-[var(--border)] px-3 py-1">评论 {user.commentCount}</span></div><div className="mt-4 flex flex-wrap gap-2"><Button isDisabled={readOnly || userSaving || acting} onPress={() => setUserEditor(toEditorState(user))} variant="secondary">编辑</Button><Button isDisabled={readOnly || userSaving || acting} onPress={() => void toggleUserDisabled(user)} variant={user.disabled ? "secondary" : "danger"}>{acting ? "处理中..." : user.disabled ? "启用" : "禁用"}</Button><Button isDisabled={readOnly || userSaving || acting} onPress={() => void deleteUser(user)} variant="danger">{acting ? "处理中..." : "删除"}</Button></div></article>; })}</div>
              </div>
            </div>
          ) : null}

          {activeTab === "invites" ? (
            <div className="app-card p-5">
              <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="app-card-muted p-4"><div className="text-sm font-semibold text-slate-900">创建邀请码</div><div className="mt-3 grid gap-3"><Input aria-label="邀请码" fullWidth value={code} onChange={(event) => setCode(event.target.value)} placeholder="WELCOME-2026" autoCapitalize="characters" /><Input aria-label="备注" fullWidth value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：1 号楼新住户" /><Input aria-label="最大次数" fullWidth type="number" min="1" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} placeholder="使用次数上限（可空）" /><Input aria-label="到期时间" fullWidth type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></div><Button className="mt-4 w-full" isPending={inviteLoading} onPress={createInvite}>{inviteLoading ? "保存中..." : "创建邀请码"}</Button></div>
                <div className="grid gap-3">{sortedCodes.length === 0 ? <EmptyState title="还没有邀请码，先创建一个。" /> : sortedCodes.map((item) => <article key={item.id} className="app-card-muted p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-base font-semibold text-slate-950">{item.code}</div><div className="mt-1 text-sm text-[var(--muted)]">{item.note || "无备注"}</div></div><span className="app-chip">{item.active ? "启用中" : "已停用"}</span></div><div className="mt-3 grid gap-2 text-sm text-[var(--muted)] md:grid-cols-3"><div>已用 {item.usedCount}{item.maxUses === null ? " 次" : ` / ${item.maxUses}`}</div><div>到期 {formatDate(item.expiresAt)}</div><div>创建 {formatDate(item.createdAt)}</div></div><div className="mt-4 flex gap-2"><Button isDisabled={inviteLoading} onPress={() => void updateInvite(item.id, !item.active)} variant="secondary">{item.active ? "停用" : "启用"}</Button><Button isDisabled={inviteLoading} onPress={() => void removeInvite(item.id)} variant="danger">删除</Button></div></article>)}</div>
              </div>
            </div>
          ) : null}

          {activeTab === "posts" ? (
            <div className="app-card p-5"><div className="grid gap-3">{sortedPosts.length === 0 ? <EmptyState title="当前还没有帖子。" /> : sortedPosts.map((post) => <article key={post.id} className="app-card-muted p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="text-base font-semibold text-slate-950">{post.title}</div><span className="app-chip">{categoryMeta[post.category]?.label ?? post.category}</span><span className="app-chip app-chip-muted">{getPostStatusLabel(post.status)}</span></div><div className="mt-1 text-sm text-[var(--muted)]">作者 {post.authorName} · {formatDate(post.createdAt)} · {getVisibilityLabel(post.visibility)}</div><p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--foreground)]">{post.content}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{(["published", "pending", "rejected"] as const).map((status) => <Button key={status} isDisabled={postDeletingId !== null || postSavingId !== null || post.status === status} onPress={() => void updatePostModeration(post.id, { status }, `已更新帖子状态：${post.title}`)} size="sm" variant={post.status === status ? "primary" : "secondary"}>{postSavingId === post.id && post.status !== status ? "处理中..." : status === "published" ? "发布" : status === "pending" ? "待审" : "驳回"}</Button>)}<Button isDisabled={postDeletingId !== null || postSavingId !== null} onPress={() => void updatePostModeration(post.id, { pinned: !post.pinned }, post.pinned ? `已取消置顶：${post.title}` : `已置顶：${post.title}`)} size="sm" variant="secondary">{post.pinned ? "取消置顶" : "置顶"}</Button><Button isDisabled={postDeletingId !== null || postSavingId !== null} onPress={() => void updatePostModeration(post.id, { featured: !post.featured }, post.featured ? `已取消精选：${post.title}` : `已设为精选：${post.title}`)} size="sm" variant="secondary">{post.featured ? "取消精选" : "设为精选"}</Button><Button isDisabled={postDeletingId !== null || postSavingId !== null} onPress={async () => { setPostDeletingId(post.id); setError(""); setMessage(""); try { await readAdminJson(await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE", credentials: "include" })); setMessage(`已删除帖子：${post.title}`); await loadPosts(); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "删帖失败"); } finally { setPostDeletingId(null); } }} variant="danger">{postDeletingId === post.id ? "处理中..." : "删除帖子"}</Button></div></article>)}</div></div>
          ) : null}

          {activeTab === "polls" ? (
            <div className="app-card p-5"><div className="grid gap-3">{sortedPolls.length === 0 ? <EmptyState title="当前还没有投票。" /> : sortedPolls.map((poll) => <article key={poll.id} className="app-card-muted p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="text-base font-semibold text-slate-950">{poll.title}</div><span className="app-chip">{pollStatusMeta[poll.status].label}</span></div><div className="mt-2 text-sm text-[var(--muted)]">{poll.description}</div><div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]"><span className="rounded-full border border-[var(--border)] px-3 py-1">发布者 {poll.authorName}</span><span className="rounded-full border border-[var(--border)] px-3 py-1">参与 {poll.totalVotes}</span><span className="rounded-full border border-[var(--border)] px-3 py-1">选项 {poll.optionCount}</span></div></div></div><div className="mt-4 flex flex-wrap gap-2"><Button isDisabled={pollSavingId !== null || poll.status === "closed"} onPress={() => void updatePollModeration(poll.id, { status: "closed" }, `已结束投票：${poll.title}`)} size="sm" variant="secondary">结束</Button><Button isDisabled={pollSavingId !== null || poll.status === "active"} onPress={() => void updatePollModeration(poll.id, { status: "active" }, `已重新开放投票：${poll.title}`)} size="sm" variant="secondary">重开</Button><Button isDisabled={pollSavingId !== null} onPress={async () => { setPollSavingId(poll.id); setError(""); setMessage(""); try { await readAdminJson(await fetch(`/api/admin/polls/${poll.id}`, { method: "DELETE", credentials: "include" })); setMessage(`已删除投票：${poll.title}`); await loadPolls(); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "删除投票失败"); } finally { setPollSavingId(null); } }} size="sm" variant="danger">{pollSavingId === poll.id ? "处理中..." : "删除"}</Button></div></article>)}</div></div>
          ) : null}

          {activeTab === "tickets" ? (
            <div className="app-card p-5"><div className="grid gap-3">{sortedTickets.length === 0 ? <EmptyState title="当前还没有工单。" /> : sortedTickets.map((ticket) => <article key={ticket.id} className="app-card-muted p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="text-base font-semibold text-slate-950">{ticket.title}</div><span className="app-chip">{serviceTicketCategoryMeta[ticket.category].label}</span><span className="app-chip app-chip-muted">{serviceTicketStatusMeta[ticket.status].label}</span></div><div className="mt-2 text-sm text-[var(--muted)]">{ticket.description}</div><div className="mt-3 text-xs text-[var(--muted)]">发起人 {ticket.authorName} · 房号 {ticket.roomNumber} · 更新 {formatDate(ticket.updatedAt)}</div></div></div><div className="mt-4"><Input aria-label={`工单备注 ${ticket.title}`} fullWidth placeholder="处理备注" value={ticketNoteDrafts[ticket.id] ?? ""} onChange={(event) => setTicketNoteDrafts((current) => ({ ...current, [ticket.id]: event.target.value }))} /></div><div className="mt-4 flex flex-wrap gap-2">{(["open", "processing", "resolved"] as const).map((status) => <Button key={status} isDisabled={ticketSavingId !== null || ticket.status === status} onPress={async () => { setTicketSavingId(ticket.id); setError(""); setMessage(""); try { await readAdminJson(await fetch(`/api/admin/service-tickets/${ticket.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status, assigneeNote: (ticketNoteDrafts[ticket.id] ?? "").trim() }) })); setMessage(`已更新工单：${ticket.title}`); await loadServiceTickets(); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "更新工单失败"); } finally { setTicketSavingId(null); } }} size="sm" variant={ticket.status === status ? "primary" : "secondary"}>{ticketSavingId === ticket.id && ticket.status !== status ? "处理中..." : serviceTicketStatusMeta[status].label}</Button>)}</div></article>)}</div></div>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
