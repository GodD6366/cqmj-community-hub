"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { notificationTypeMeta, type NotificationItem, type NotificationType } from "@/lib/types";
import { ArrowLeftIcon } from "./app-icons";
import { CyberPanel, CyberStatGrid, EmptyState, NotificationTypeIcon } from "./resident-shared";
import { timeAgo } from "@/lib/utils";

const tabs: Array<{ key: "all" | NotificationType; label: string }> = [
  { key: "all", label: "全部" },
  { key: "comment", label: "评论" },
  { key: "favorite", label: "收藏" },
  { key: "poll", label: "投票" },
  { key: "ticket", label: "工单" },
  { key: "system", label: "系统" },
];

export function MessagesClient() {
  const { currentUser, notifications, unreadNotificationCount, markNotificationsRead } = useCommunityPosts();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const currentUserId = currentUser?.id ?? "";
  const autoReadSignatureRef = useRef("");
  const unreadNotificationIds = useMemo(() => notifications.filter((notification) => !notification.readAt).map((notification) => notification.id), [notifications]);
  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((notification) => notification.type === activeTab);
  }, [activeTab, notifications]);

  useEffect(() => {
    if (!currentUserId || unreadNotificationIds.length === 0) {
      autoReadSignatureRef.current = "";
      return;
    }
    const signature = unreadNotificationIds.join(",");
    if (autoReadSignatureRef.current === signature) return;
    autoReadSignatureRef.current = signature;
    void markNotificationsRead(unreadNotificationIds).catch(() => {
      if (autoReadSignatureRef.current === signature) autoReadSignatureRef.current = "";
    });
  }, [currentUserId, markNotificationsRead, unreadNotificationIds]);

  return (
    <main className="page-shell space-y-4 md:space-y-5">
      {message ? <Alert status="success"><Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content></Alert> : null}
      {error ? <Alert status="danger"><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}

      <section className="terminal-mobile-root md:!hidden">
        <div className="terminal-hero-card">
          <div className="terminal-page-head">
            <Link href="/" className="terminal-back-link">
              <ArrowLeftIcon />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="terminal-kicker">MESSAGE CENTER</div>
              <h1 className="terminal-page-title">消息中心</h1>
              <p className="terminal-page-subtitle">评论、收藏、投票、工单、系统提醒</p>
            </div>
          </div>
          <div className="terminal-filter-row mt-4">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" className={`terminal-filter-pill ${activeTab === tab.key ? "is-active" : ""}`} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {!currentUser ? (
          <EmptyState title="登录后查看消息" actionHref="/login?next=/messages" actionLabel="去登录" />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState title="这个分组还没有消息" actionHref="/publish" actionLabel="去发布" />
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => <MessageRow key={notification.id} notification={notification} mobile />)}
          </div>
        )}
      </section>

      <section className="hidden md:grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_280px] messages-desktop">
        <CyberPanel title="消息频道" kicker="Inbox Channels">
          <div className="space-y-2">
            {tabs.map((tab) => {
              const count = tab.key === "all" ? notifications.length : notifications.filter((item) => item.type === tab.key).length;
              return (
                <button key={tab.key} type="button" className={`app-shell-link w-full text-left !p-3 ${activeTab === tab.key ? "is-active" : ""}`} onClick={() => setActiveTab(tab.key)}>
                  <span className="app-shell-link-copy"><span className="app-shell-link-title">{tab.label}</span><span className="app-shell-link-meta">{count} 条</span></span>
                </button>
              );
            })}
          </div>
        </CyberPanel>

        <CyberPanel title="消息中心" kicker="Message Center" action={currentUser && unreadNotificationCount > 0 ? <Button isPending={busy} onPress={async () => { setBusy(true); setError(""); setMessage(""); try { const count = await markNotificationsRead(); setMessage(`已标记 ${count} 条消息为已读`); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "标记已读失败"); } finally { setBusy(false); } }} size="sm" variant="secondary">全部已读</Button> : null}>
          {!currentUser ? <EmptyState title="登录后查看消息" actionHref="/login?next=/messages" actionLabel="去登录" /> : filteredNotifications.length === 0 ? <EmptyState title="这个分组还没有消息" actionHref="/publish" actionLabel="去发布" /> : <div className="grid gap-3">{filteredNotifications.map((notification) => <MessageRow key={notification.id} notification={notification} />)}</div>}
        </CyberPanel>

        <div className="grid gap-4">
          <CyberPanel title="通知统计" kicker="Realtime Stats">
            <CyberStatGrid columns={2} items={[{ label: "未读", value: unreadNotificationCount }, { label: "总数", value: notifications.length }, { label: "评论", value: notifications.filter((i) => i.type === "comment").length }, { label: "系统", value: notifications.filter((i) => i.type === "system").length }]} />
          </CyberPanel>
          <CyberPanel title="快捷入口" kicker="Quick Links">
            <div className="grid gap-2 text-sm">
              <Link href="/posts" className="app-shell-link !p-3"><span className="app-shell-link-copy"><span className="app-shell-link-title">查看动态</span><span className="app-shell-link-meta">继续浏览社区内容</span></span></Link>
              <Link href="/services" className="app-shell-link !p-3"><span className="app-shell-link-copy"><span className="app-shell-link-title">查看工单</span><span className="app-shell-link-meta">进入服务台</span></span></Link>
            </div>
          </CyberPanel>
        </div>
      </section>
    </main>
  );
}

function MessageRow({ notification, mobile = false }: { notification: NotificationItem; mobile?: boolean }) {
  const content = (
    <article className={mobile ? "terminal-list-row" : `rounded-[1.15rem] border p-4 ${notification.readAt ? "border-[var(--border)] bg-[rgba(8,16,16,0.82)] opacity-80" : "border-[rgba(57,245,143,0.22)] bg-[rgba(8,16,16,0.95)]"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex shrink-0 items-center justify-center ${mobile ? "terminal-message-icon" : "h-11 w-11 rounded-[1rem] border border-[var(--border)] bg-[rgba(57,245,143,0.06)] text-lg"}`}>
          <NotificationTypeIcon
            type={notification.type}
            className={mobile ? "h-4.5 w-4.5" : "h-5 w-5"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-950">{notification.title}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{notificationTypeMeta[notification.type].label}</div>
            </div>
            <span className="shrink-0 text-xs text-[var(--muted)]">{timeAgo(notification.createdAt)}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{notification.body}</p>
        </div>
      </div>
    </article>
  );

  if (notification.href) {
    return <Link href={notification.href}>{content}</Link>;
  }
  return content;
}
