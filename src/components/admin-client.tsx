"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Chip, Input } from "@heroui/react";
import { useCommunityPosts } from "@/lib/community-store";
import { Toast, useToast } from "./ui/toast";
import { timeAgo } from "@/lib/utils";
import type { AdminTab } from "@/lib/admin-tabs";
import type { AdminUser, PostStatus, ServiceTicketStatus } from "@/lib/types";

interface AdminClientProps {
  initialTab: AdminTab;
}

interface AdminInviteCode {
  id: string;
  code: string;
  note: string | null;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminUsersResponse {
  users?: AdminUser[];
}

interface AdminInviteCodesResponse {
  inviteCodes?: AdminInviteCode[];
}

function getResponseError(data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message) return message;
  }
  return "操作失败";
}

async function apiFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) throw new Error(getResponseError(data));
  return data as T;
}

export function AdminClient({ initialTab }: AdminClientProps) {
  const { posts, polls, serviceTickets, refresh } = useCommunityPosts();
  const { toast, show } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [inviteCodes, setInviteCodes] = useState<AdminInviteCode[]>([]);
  const [busy, setBusy] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState("");
  const [newInviteMaxUses, setNewInviteMaxUses] = useState(10);

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiFetch<AdminUsersResponse>("/api/admin/users");
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch {
      setUsers([]);
    }
  }, []);

  const loadInviteCodes = useCallback(async () => {
    try {
      const data = await apiFetch<AdminInviteCodesResponse>("/api/admin/invite-codes");
      setInviteCodes(Array.isArray(data?.inviteCodes) ? data.inviteCodes : []);
    } catch {
      setInviteCodes([]);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadInviteCodes();
  }, [loadUsers, loadInviteCodes]);

  async function createInviteCode() {
    if (!newInviteCode.trim()) { show("请输入邀请码", "error"); return; }
    setBusy(true);
    try { await apiFetch("/api/admin/invite-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: newInviteCode.trim(), maxUses: newInviteMaxUses }) }); setNewInviteCode(""); setNewInviteMaxUses(10); loadInviteCodes(); show("邀请码已创建。", "success"); }
    catch (e) { show(e instanceof Error ? e.message : "创建失败", "error"); }
    finally { setBusy(false); }
  }

  async function toggleInviteCode(codeId: string, active: boolean) {
    try { await apiFetch(`/api/admin/invite-codes/${codeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) }); loadInviteCodes(); show(active ? "已启用。" : "已停用。", "success"); }
    catch (e) { show(e instanceof Error ? e.message : "操作失败", "error"); }
  }

  async function deleteInviteCode(codeId: string) {
    if (!window.confirm("确定删除该邀请码？")) return;
    try { await apiFetch(`/api/admin/invite-codes/${codeId}`, { method: "DELETE" }); loadInviteCodes(); show("已删除。", "success"); }
    catch (e) { show(e instanceof Error ? e.message : "删除失败", "error"); }
  }

  async function toggleUserDisabled(userId: string, disabled: boolean) {
    try { await apiFetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disabled }) }); loadUsers(); show(disabled ? "已禁用。" : "已启用。", "success"); }
    catch (e) { show(e instanceof Error ? e.message : "操作失败", "error"); }
  }

  async function updatePost(postId: string, data: { pinned?: boolean; featured?: boolean; status?: PostStatus }) {
    try { await apiFetch(`/api/admin/posts/${postId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); await refresh(); show("已更新。", "success"); }
    catch (e) { show(e instanceof Error ? e.message : "操作失败", "error"); }
  }

  async function updateTicket(ticketId: string, data: { status?: ServiceTicketStatus; assigneeNote?: string }) {
    try { await apiFetch(`/api/admin/service-tickets/${ticketId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); await refresh(); show("已更新。", "success"); }
    catch (e) { show(e instanceof Error ? e.message : "操作失败", "error"); }
  }

  const tabs: Array<{ key: AdminTab; label: string }> = [
    { key: "users", label: "用户管理" },
    { key: "invites", label: "邀请码" },
    { key: "posts", label: "帖子管理" },
    { key: "polls", label: "投票管理" },
    { key: "tickets", label: "工单管理" },
  ];
  const activeInviteCodes = inviteCodes.filter((code) => code.active).length;
  const openTickets = serviceTickets.filter((ticket) => ticket.status !== "resolved").length;
  const publishedPosts = posts.filter((post) => post.status === "published").length;
  const activePolls = polls.filter((poll) => poll.status === "active").length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 pt-8 md:p-6">
      <Toast toast={toast} />
      <div className="app-panel-strong p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold text-primary">社区运营控制台</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">管理后台</h1>
            <p className="mt-1 text-sm text-muted-foreground">统一处理用户、内容、投票与工单，保持社区秩序清晰可追踪。</p>
          </div>
          <div className="rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-bold text-success">
            系统运行正常
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "用户", value: users.length, meta: "注册住户" },
            { label: "邀请码", value: activeInviteCodes, meta: "启用中" },
            { label: "帖子", value: publishedPosts, meta: "公开发布" },
            { label: "待处理", value: openTickets + activePolls, meta: "工单/投票" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/70 bg-white/72 p-4">
              <div className="text-xs font-semibold text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{item.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="app-panel flex flex-wrap gap-2 p-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`app-chip cursor-pointer ${
              activeTab === tab.key ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/15" : "border-default-200 text-muted-foreground"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 用户管理 */}
      {activeTab === "users" && (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id} className="app-panel p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-semibold">
                    <span className="min-w-0 break-words">{user.nickname}</span>
                    <span className="break-all text-sm text-muted-foreground">@{user.username}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{user.roomNumber || "未填写房号"} · {user.role} · 帖子 {user.postCount ?? 0}</div>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  <Chip size="sm" color={user.disabled ? "danger" : "success"}>{user.disabled ? "已禁用" : "正常"}</Chip>
                  <Button className="min-h-11 flex-1 sm:flex-none" size="sm" variant="secondary" onPress={() => { void toggleUserDisabled(user.id, !user.disabled); }}>
                    {user.disabled ? "启用" : "禁用"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 邀请码管理 */}
      {activeTab === "invites" && (
        <div className="space-y-4">
          <Card className="app-panel flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full sm:min-w-[200px] sm:flex-1">
              <Input placeholder="邀请码" value={newInviteCode} onChange={(e) => setNewInviteCode(e.target.value)} />
            </div>
            <div className="w-full sm:w-24">
              <Input type="number" placeholder="次数" value={String(newInviteMaxUses)} onChange={(e) => setNewInviteMaxUses(Number(e.target.value) || 1)} />
            </div>
            <Button className="min-h-11 w-full sm:w-auto" variant="primary" isDisabled={busy} onPress={() => { void createInviteCode(); }}>创建邀请码</Button>
          </Card>
          <div className="space-y-2">
            {inviteCodes.map((code) => (
              <Card key={code.id} className="app-panel p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="break-all font-mono font-semibold">{code.code}</div>
                    <div className="text-xs text-muted-foreground">已用 {code.usedCount}/{code.maxUses ?? "∞"} · {code.active ? "启用" : "停用"}</div>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
                    <Button className="min-h-11 flex-1 sm:flex-none" size="sm" variant="secondary" onPress={() => { void toggleInviteCode(code.id, !code.active); }}>
                      {code.active ? "停用" : "启用"}
                    </Button>
                    <Button className="min-h-11 flex-1 sm:flex-none" size="sm" variant="ghost" onPress={() => { void deleteInviteCode(code.id); }}>删除</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 帖子管理 */}
      {activeTab === "posts" && (
        <div className="space-y-2">
          {posts.map((post) => (
            <Card key={post.id} className="app-panel p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{post.title}</div>
                  <div className="text-xs text-muted-foreground">{post.authorName} · {timeAgo(post.createdAt)} · {post.status}</div>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                  <Button className="min-h-11 flex-1 sm:flex-none" size="sm" variant="secondary" onPress={() => { void updatePost(post.id, { pinned: !post.pinned }); }}>{post.pinned ? "取消置顶" : "置顶"}</Button>
                  <Button className="min-h-11 flex-1 sm:flex-none" size="sm" variant="secondary" onPress={() => { void updatePost(post.id, { featured: !post.featured }); }}>{post.featured ? "取消精选" : "精选"}</Button>
                  <Button className="min-h-11 flex-1 sm:flex-none" size="sm" variant="ghost" onPress={() => { void updatePost(post.id, { status: post.status === "published" ? "deleted" : "published" }); }}>
                    {post.status === "published" ? "删除" : "恢复"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 投票管理 */}
      {activeTab === "polls" && (
        <div className="space-y-2">
          {polls.map((poll) => (
            <Card key={poll.id} className="app-panel p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold">{poll.title}</div>
                  <div className="text-xs text-muted-foreground">{poll.authorName} · {poll.status} · {poll.totalVotes} 票</div>
                </div>
                <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
                  <Button className="min-h-11 flex-1 sm:flex-none" size="sm" variant="secondary" onPress={() => { void apiFetch(`/api/admin/polls/${poll.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: poll.status === "active" ? "closed" : "active" }) }).then(() => { refresh(); show("已更新。", "success"); }).catch((e) => show(e instanceof Error ? e.message : "操作失败", "error")); }}>
                    {poll.status === "active" ? "关闭" : "开启"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 工单管理 */}
      {activeTab === "tickets" && (
        <div className="space-y-2">
          {serviceTickets.map((ticket) => (
            <Card key={ticket.id} className="app-panel p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><div className="font-semibold">{ticket.title}</div><div className="text-xs text-muted-foreground">{ticket.authorName} · {ticket.status}</div></div>
                <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
                  <Button className="min-h-11 flex-1 sm:flex-none" size="sm" variant="secondary" onPress={() => {
                    const nextStatus = ticket.status === "open" ? "processing" : ticket.status === "processing" ? "resolved" : "open";
                    void updateTicket(ticket.id, { status: nextStatus });
                  }}>
                    {ticket.status === "open" ? "开始处理" : ticket.status === "processing" ? "标记完成" : "重新打开"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
