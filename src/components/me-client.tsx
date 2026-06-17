"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { useCommunityPosts } from "@/lib/community-store";
import { EmptyState } from "./ui/empty-state";
import { Toast, useToast } from "./ui/toast";
import { ChevronRightIcon } from "./app-icons";

export function MeClient() {
  const router = useRouter();
  const { currentUser, posts, serviceTickets, unreadNotificationCount, updateProfile, logout, hydrated } = useCommunityPosts();
  const { toast, show } = useToast();
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editRoomNumber, setEditRoomNumber] = useState("");
  const [saving, setSaving] = useState(false);

  if (!hydrated) {
    return <div className="mx-auto max-w-2xl p-4 pt-8 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-2xl p-4 pt-8">
        <EmptyState title="请先登录" actionHref="/login" actionLabel="去登录" />
      </div>
    );
  }

  const myPosts = posts.filter((p) => p.isMine);
  const myTickets = serviceTickets.filter((t) => t.isMine);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await updateProfile({
        username: editUsername || currentUser!.username,
        nickname: editNickname || currentUser!.nickname,
        roomNumber: editRoomNumber || currentUser!.roomNumber,
      });
      setEditing(false);
      show("资料已更新。", "success");
    } catch (e) {
      show(e instanceof Error ? e.message : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try { await logout(); router.push("/login"); }
    catch (e) { show(e instanceof Error ? e.message : "退出失败", "error"); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 px-4 pb-28 pt-5 md:space-y-5 md:p-6">
      <Toast toast={toast} />

      {/* 用户信息 */}
      <Card className="app-panel-strong p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-primary/25 to-accent/25 text-2xl font-bold text-primary-strong shadow-sm ring-1 ring-primary/15">
              {Array.from(currentUser.nickname)[0]}
            </div>
            <div className="min-w-0">
              <div className="map-coordinate mb-2">居民档案</div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="app-display min-w-0 break-words text-[1.85rem] leading-tight md:text-3xl">{currentUser.nickname}</h1>
                {currentUser.role === "admin" && <Chip size="sm" color="warning">管理员</Chip>}
              </div>
              <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                <span className="break-all">@{currentUser.username}</span>
                <span className="font-semibold text-foreground">{currentUser.roomNumber}</span>
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="min-h-11 w-full sm:w-auto" onPress={() => {
            setEditUsername(currentUser.username);
            setEditNickname(currentUser.nickname);
            setEditRoomNumber(currentUser.roomNumber);
            setEditing(!editing);
          }}>
            {editing ? "取消编辑" : "编辑资料"}
          </Button>
        </div>

        {/* 编辑表单 */}
        {editing && (
          <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">编辑资料</h2>
                <p className="text-xs text-muted-foreground">用户名、昵称和房号会显示在社区互动里。</p>
              </div>
              <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-bold text-primary">档案</span>
            </div>
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="用户名"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
            />
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="显示昵称"
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value)}
            />
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="房号"
              value={editRoomNumber}
              onChange={(e) => setEditRoomNumber(e.target.value)}
            />
            <Button variant="primary" className="min-h-11 w-full font-bold" isPending={saving} onPress={() => { void handleSaveProfile(); }}>
              保存修改
            </Button>
          </div>
        )}

        {/* 统计 */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-4">
          {[
            { label: "我的帖子", value: myPosts.length },
            { label: "我的评论", value: posts.reduce((sum, p) => sum + (p.comments?.filter((c) => c.isMine)?.length ?? 0), 0) },
            { label: "我的工单", value: myTickets.length },
            { label: "未读消息", value: unreadNotificationCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/70 bg-white/72 p-3 text-center">
              <div className="app-utility text-2xl font-black tabular-nums">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 我的帖子 */}
      <Card className="app-panel p-5">
        <Card.Title>我的帖子</Card.Title>
        {myPosts.length > 0 ? (
          <div className="mt-3 space-y-2">
            {myPosts.slice(0, 10).map((post) => (
              <a key={post.id} href={`/posts/${post.id}`} className="flex min-h-14 items-center justify-between rounded-xl border border-border bg-white/72 p-3 transition-colors hover:bg-muted/30">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{post.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{post.category === "request" ? "求助" : post.category === "secondhand" ? "闲置" : post.category === "discussion" ? "交流" : "约玩"}</span>
                    {post.requestStatus && <Chip size="sm" variant="soft">{post.requestStatus === "open" ? "待处理" : post.requestStatus === "processing" ? "处理中" : "已解决"}</Chip>}
                  </div>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">暂无帖子</p>
        )}
      </Card>

      {/* 快捷入口 */}
      <Card className="app-panel p-5">
        <Card.Title>快捷入口</Card.Title>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { label: "帮助", href: "/neighbors" },
            { label: "我的工单", href: "/services" },
            { label: "发布帖子", href: "/publish" },
            { label: "消息中心", href: "/messages" },
          ].map((item) => (
            <a key={item.label} href={item.href} className="flex min-h-14 items-center justify-center rounded-xl border border-border bg-white/72 p-3 text-center text-sm font-bold transition-colors hover:bg-muted/30">
              {item.label}
            </a>
          ))}
        </div>
      </Card>

      {/* 退出 */}
      <Button variant="ghost" className="min-h-11 w-full" onPress={() => { void handleLogout(); }}>
        退出登录
      </Button>
    </div>
  );
}
