"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { notificationTypeMeta, type NotificationItem, type NotificationType } from "@/lib/types";
import {
  CyberPanel,
  CyberStatGrid,
  EmptyState,
  NotificationTypeIcon,
  ResidentFilterTabs,
  ResidentListRow,
  ResidentPageHeader,
  ResidentPanel,
} from "./resident-shared";
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
  const tabItems = useMemo(() => tabs.map((tab) => ({ key: tab.key, label: tab.label })), []);

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
    <main className="page-shell messages-page">
      {message ? <Alert status="success"><Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content></Alert> : null}
      {error ? <Alert status="danger"><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}

      <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)_280px] gap-4 messages-desktop">
        {/* 左侧消息频道选择器：在移动端隐藏，在桌面端显示为侧边频道列表 */}
        <div className="md:block hidden">
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
        </div>

        {/* 中间/主体：消息列表（共享） */}
        <div className="space-y-4">
          {/* 移动端专属 PageHeader：在 md:hidden 下显示 */}
          <div className="md:hidden">
            <ResidentPageHeader
              backHref="/"
              kicker="社区提醒"
              subtitle="评论、收藏、投票、工单、系统提醒"
              title="消息中心"
            />
            {/* 移动端独有的类别过滤 Tabs */}
            <div className="bg-white p-3 rounded-2xl border border-[var(--border)] mt-3">
              <ResidentFilterTabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} />
            </div>
          </div>

          {/* 桌面端专属的头部面板信息 */}
          <div className="hidden md:flex justify-between items-center bg-white p-5 rounded-2xl border border-[var(--border)]">
            <div>
              <div className="text-xs text-indigo-600 font-semibold">Message Center · 互动提醒</div>
              <h1 className="text-xl font-bold mt-1 text-slate-900">消息中心</h1>
            </div>
            {currentUser && unreadNotificationCount > 0 && (
              <Button isPending={busy} onPress={async () => { setBusy(true); setError(""); setMessage(""); try { const count = await markNotificationsRead(); setMessage(`已标记 ${count} 条消息为已读`); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "标记已读失败"); } finally { setBusy(false); } }} size="sm" variant="secondary">全部已读</Button>
            )}
          </div>

          {/* 消息列表主体（共享） */}
          <div className="grid gap-3">
            {!currentUser ? (
              <EmptyState title="登录后查看消息" actionHref="/login?next=/messages" actionLabel="去登录" />
            ) : filteredNotifications.length === 0 ? (
              <EmptyState title="这个分组还没有消息" actionHref="/publish" actionLabel="去发布" />
            ) : (
              filteredNotifications.map((notification) => (
                <MessageRow key={notification.id} notification={notification} mobile />
              ))
            )}
          </div>
        </div>

        {/* 右侧边栏：仅在 lg 以上大屏幕显示 */}
        <div className="hidden lg:grid gap-4 auto-rows-max">
          <CyberPanel title="通知统计" kicker="消息概况">
            <CyberStatGrid columns={2} items={[{ label: "未读", value: unreadNotificationCount }, { label: "总数", value: notifications.length }, { label: "评论", value: notifications.filter((i) => i.type === "comment").length }, { label: "系统", value: notifications.filter((i) => i.type === "system").length }]} />
          </CyberPanel>
          <CyberPanel title="快捷入口" kicker="Quick Links">
            <div className="grid gap-2 text-sm">
              <Link href="/posts" className="app-shell-link !p-3"><span className="app-shell-link-copy"><span className="app-shell-link-title">查看动态</span><span className="app-shell-link-meta">继续浏览社区内容</span></span></Link>
              <Link href="/services" className="app-shell-link !p-3"><span className="app-shell-link-copy"><span className="app-shell-link-title">查看工单</span><span className="app-shell-link-meta">进入服务台</span></span></Link>
            </div>
          </CyberPanel>
        </div>
      </div>
    </main>
  );
}

function MessageRow({ notification, mobile = false }: { notification: NotificationItem; mobile?: boolean }) {
  const content = (
    <ResidentListRow
      className={!notification.readAt ? "" : "opacity-80"}
      leading={
        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[var(--border)] bg-[rgba(94,169,135,0.1)] text-[var(--primary-strong)]">
          <NotificationTypeIcon
            type={notification.type}
            className={mobile ? "h-4.5 w-4.5" : "h-5 w-5"}
          />
        </div>
      }
      meta={<span>{timeAgo(notification.createdAt)}</span>}
      subtitle={
        <div className="grid gap-1">
          <span className="text-xs text-[var(--muted)]">{notificationTypeMeta[notification.type].label}</span>
          <p className="line-clamp-2 text-sm leading-6 text-[var(--muted)]">{notification.body}</p>
        </div>
      }
      title={<span className="block truncate">{notification.title}</span>}
    />
  );

  if (notification.href) {
    return <Link href={notification.href} className="message-row-link block">{content}</Link>;
  }
  return content;
}
