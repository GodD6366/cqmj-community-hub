"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { Alert, Button, Card, Input } from "@heroui/react";
import { PageShell, SectionCard } from "./ui";
import { categoryMeta } from "@/lib/types";
import { useCommunityPosts } from "@/lib/community-store";

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

export function AdminInviteClient() {
  const router = useRouter();
  const { currentUser, logout } = useCommunityPosts();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const sortedCodes = useMemo(() => inviteCodes.slice().sort((a, b) => Number(b.active) - Number(a.active)), [inviteCodes]);
  const sortedPosts = useMemo(() => posts.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [posts]);

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

  const loadAdminData = useEffectEvent(async () => {
    await Promise.all([loadCodes(), loadPosts()]);
  });

  useEffect(() => {
    void loadAdminData().catch(() => undefined);
  }, []);

  const createInvite = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const updateInvite = async (id: string, active: boolean) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const removeInvite = async (id: string) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <PageShell className="max-w-6xl">
      <section className="hero-aurora rounded-[1.7rem] p-6 text-white sm:p-8">
        <p className="text-sm font-medium text-slate-300">管理员后台</p>
        <h1 className="editorial-title mt-2 text-3xl font-semibold sm:text-4xl">邀请码管理</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
          创建、启停和删除邀请码；注册页会实时校验邀请码状态，让住户在移动端也能顺畅完成注册。
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
          <Button isPending={loading} onPress={createInvite}>
            {loading ? "保存中..." : "创建邀请码"}
          </Button>
        </div>
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
      </SectionCard>

      <SectionCard className="mt-4 p-6 sm:mt-6 sm:p-8">
        <Card.Header className="p-0">
          <Card.Title className="text-xl font-semibold text-slate-900">现有邀请码</Card.Title>
        </Card.Header>
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
                    <Button isDisabled={loading} onPress={() => updateInvite(item.id, !item.active)} variant="secondary">
                      {item.active ? "停用" : "启用"}
                    </Button>
                    <Button isDisabled={loading} onPress={() => removeInvite(item.id)} variant="danger">
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
                      isDisabled={loading}
                      onPress={async () => {
                        setLoading(true);
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
                          setLoading(false);
                        }
                      }}
                      variant="danger"
                    >
                      删除帖子
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
