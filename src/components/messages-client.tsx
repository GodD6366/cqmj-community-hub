"use client";

import { useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { useCommunityPosts } from "@/lib/community-store";
import { EmptyState } from "./ui/empty-state";
import { timeAgo } from "@/lib/utils";
import type { NotificationType } from "@/lib/types";

const typeLabels: Record<NotificationType | "all", string> = {
  all: "全部",
  comment: "评论",
  favorite: "收藏",
  poll: "投票",
  ticket: "工单",
  system: "系统",
};

export function MessagesClient() {
  const { notifications, markNotificationsRead, hydrated } = useCommunityPosts();
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (filterType === "all") return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  async function markAllRead() {
    setBusy(true);
    try { await markNotificationsRead(); }
    catch { /* ignore */ }
    finally { setBusy(false); }
  }

  if (!hydrated) {
    return <div className="mx-auto max-w-2xl p-4 pt-8 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 pt-8 md:p-6">
      <div className="app-panel-strong flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="map-coordinate">社区回音站</div>
          <h1 className="app-display mt-3 text-3xl leading-tight md:text-4xl">消息中心</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">评论、收藏、投票和工单进度集中在这里，每一次回应都有去处。</p>
        </div>
        <Button className="min-h-11" size="sm" variant="ghost" isDisabled={busy} onPress={() => { void markAllRead(); }}>
          全部已读
        </Button>
      </div>

      {/* 类型筛选 */}
      <div className="app-panel flex flex-wrap gap-2 p-3">
        {(Object.entries(typeLabels) as [NotificationType | "all", string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`app-chip ${
              filterType === key ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/15" : "border-default-200 text-muted-foreground"
            }`}
            onClick={() => setFilterType(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((notification) => (
            <a
              key={notification.id}
              href={notification.href ?? "#"}
              className={`app-panel block p-4 transition-colors hover:bg-muted/20 ${
                !notification.readAt ? "border-primary/25 bg-primary/5" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <Chip size="sm" variant="soft" color={notification.type === "comment" ? "accent" : notification.type === "favorite" ? "success" : notification.type === "system" ? "warning" : "default"}>
                  {typeLabels[notification.type]}
                </Chip>
                <span className="text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</span>
              </div>
              <div className="mt-1.5 font-semibold">{notification.title}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">{notification.body}</div>
            </a>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无消息" description={filterType !== "all" ? `没有${typeLabels[filterType]}类型的通知` : "还没有收到任何消息"} />
      )}
    </div>
  );
}
