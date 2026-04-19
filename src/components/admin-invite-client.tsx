"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { Alert, Button, Card, Input } from "@heroui/react";
import { PageShell, SectionCard } from "./ui";
import { useCommunityPosts } from "@/lib/community-store";
import type { AdminUser } from "@/lib/types";
import { categoryMeta } from "@/lib/types";

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

export function AdminInviteClient() {
  const router = useRouter();
  const { currentUser, logout } = useCommunityPosts();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
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
  const [loggingOut, setLoggingOut] = useState(false);

  const sortedCodes = useMemo(() => inviteCodes.slice().sort((a, b) => Number(b.active) - Number(a.active)), [inviteCodes]);
  const sortedPosts = useMemo(() => posts.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [posts]);
  const sortedUsers = useMemo(() => users.slice(), [users]);

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

  const loadUsers = async () => {
    const data = await readAdminJson<{ users: AdminUser[] }>(
      await fetch("/api/admin/users", { cache: "no-store" }),
    );
    setUsers(data.users ?? []);
  };

  const loadAdminData = useEffectEvent(async () => {
    await Promise.all([loadUsers(), loadCodes(), loadPosts()]);
  });

  useEffect(() => {
    void loadAdminData().catch(() => undefined);
  }, []);

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

  return (
    <PageShell className="max-w-6xl">
      <section className="hero-aurora rounded-[1.7rem] p-6 text-white sm:p-8">
        <p className="text-sm font-medium text-slate-300">管理员后台</p>
        <h1 className="editorial-title mt-2 text-3xl font-semibold sm:text-4xl">用户、邀请码与帖子管理</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
          管理住户账号、绑定状态与邀请码，同时快速处理社区帖子内容。房号支持绑定多个用户，禁用后会立即失效。
        </p>
      </section>

      <SectionCard className="mt-4 p-6 sm:mt-6 sm:p-8">
        <Card.Header className="flex flex-col gap-3 p-0 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Card.Title className="text-xl font-semibold text-slate-900">当前管理员</Card.Title>
            <Card.Description className="mt-2 text-sm leading-6 text-slate-600">
              {currentUser?.username ?? "管理员账号"} 已通过统一用户体系登录。
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

      <SectionCard className="mt-4 p-6 sm:mt-6 sm:p-8">
        <Card.Header className="flex flex-col gap-3 p-0 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Card.Title className="text-xl font-semibold text-slate-900">用户管理</Card.Title>
            <Card.Description className="mt-2 text-sm leading-6 text-slate-600">
              同一房号可绑定多个普通用户。管理员账号只读展示，普通用户支持编辑、禁用和删除。
            </Card.Description>
          </div>
        </Card.Header>

        {userEditor ? (
          <div className="mt-5 rounded-[1.15rem] bg-[var(--surface-muted)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">正在编辑</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{userEditor.username}</h3>
                <p className="mt-1 text-sm text-slate-600">用户名、房号与状态会立即写入生效。</p>
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
                value={userEditor.username}
                onChange={(event) => setUserEditor((current) => (current ? { ...current, username: event.target.value } : current))}
                placeholder="输入用户名"
              />
              <Input
                aria-label="编辑房号"
                fullWidth
                value={userEditor.roomNumber}
                onChange={(event) => setUserEditor((current) => (current ? { ...current, roomNumber: event.target.value } : current))}
                placeholder="输入房号，例如 1-905"
              />
            </div>
          </div>
        ) : null}

        {message ? (
          <Alert className="mt-4" status="success">
            <Alert.Content>
              <Alert.Description>{message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
        {error ? (
          <Alert className="mt-4" status="danger">
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
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
                        {readOnly ? <span className="rounded-2xl bg-white/80 px-3 py-2">管理员账号只读</span> : null}
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

      <SectionCard className="mt-4 p-6 sm:mt-6 sm:p-8">
        <Card.Header className="flex flex-col gap-3 p-0 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Card.Title className="text-xl font-semibold text-slate-900">创建邀请码</Card.Title>
            <Card.Description className="mt-2 text-sm leading-6 text-slate-600">支持设置备注、使用次数上限和过期时间。</Card.Description>
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

      <SectionCard className="mt-4 p-6 sm:mt-6 sm:p-8">
        <Card.Header className="p-0">
          <Card.Title className="text-xl font-semibold text-slate-900">帖子管理</Card.Title>
          <Card.Description className="mt-2 text-sm leading-6 text-slate-600">
            管理员可快速查看当前帖子，并删除违规、重复或失效内容。
          </Card.Description>
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
                        {post.status}
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
                      <span className="rounded-2xl bg-white/80 px-3 py-2">可见性 {post.visibility}</span>
                      {post.tags.length > 0 ? <span className="rounded-2xl bg-white/80 px-3 py-2">标签 {post.tags.join(" / ")}</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 text-sm">
                    <Button
                      isDisabled={postDeletingId !== null}
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
    </PageShell>
  );
}
