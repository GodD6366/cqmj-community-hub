"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { notificationTypeMeta } from "@/lib/types";
import { EmptyState, SectionHeader } from "./resident-shared";
import { timeAgo } from "@/lib/utils";

export function MessagesClient() {
  const { currentUser, notifications, unreadNotificationCount, markNotificationsRead } = useCommunityPosts();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <section className="px-1 md:px-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold text-[var(--muted)]">消息</div>
            <h1 className="mt-1 text-[1.65rem] font-semibold tracking-[-0.05em] text-slate-950 md:text-[2.2rem]">提醒、进度与系统通知</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)] md:text-[0.95rem]">评论提醒、投票参与结果和工单状态会按时间线持续汇总在这里。</p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:min-w-[19rem]">
            <div className="app-card rounded-[1.15rem] px-4 py-3 text-center">
              <div className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">未读</div>
              <div className="mt-2 text-[1.6rem] font-semibold tracking-[-0.04em] text-[var(--primary)]">{unreadNotificationCount}</div>
            </div>
            <div className="app-card rounded-[1.15rem] px-4 py-3 text-center">
              <div className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">全部消息</div>
              <div className="mt-2 text-[1.6rem] font-semibold tracking-[-0.04em] text-slate-950">{notifications.length}</div>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <Alert status="success">
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

      {!currentUser ? (
        <EmptyState
          title="登录后查看消息"
          description="评论提醒、投票参与结果和工单状态会在这里持续更新。"
          actionHref="/login?next=/messages"
          actionLabel="去登录"
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="还没有消息"
          description="去发一条帖子、参与投票或者提交一个工单，消息中心就会开始工作。"
          actionHref="/publish"
          actionLabel="开始使用"
        />
      ) : (
        <section className="space-y-3 xl:max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader title="全部消息" caption="按时间排序" />
            {unreadNotificationCount > 0 ? (
              <Button
                isPending={busy}
                onPress={async () => {
                  setBusy(true);
                  setError("");
                  setMessage("");
                  try {
                    const count = await markNotificationsRead();
                    setMessage(`已标记 ${count} 条消息为已读`);
                  } catch (submitError) {
                    setError(submitError instanceof Error ? submitError.message : "标记已读失败");
                  } finally {
                    setBusy(false);
                  }
                }}
                size="sm"
                variant="secondary"
              >
                全部标记已读
              </Button>
            ) : null}
          </div>
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`app-card p-4 md:p-5 ${notification.readAt ? "opacity-80" : "ring-1 ring-[rgba(79,99,255,0.12)]"}`}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[var(--surface-muted)] text-lg">
                  {notificationTypeMeta[notification.type].icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900 md:text-[0.96rem]">{notification.title}</div>
                        {!notification.readAt ? (
                          <span className="rounded-full bg-[rgba(79,99,255,0.12)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--primary)]">
                            未读
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{notificationTypeMeta[notification.type].label}</div>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--muted)]">{timeAgo(notification.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)] md:text-[0.95rem] md:leading-7">{notification.body}</p>
                  {notification.href ? (
                    <Link href={notification.href} className="mt-3 inline-flex text-sm font-semibold text-[var(--primary)]">
                      查看详情
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
