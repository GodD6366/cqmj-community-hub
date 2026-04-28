"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCommunityPosts } from "./community-provider";
import { filterPublicPosts } from "@/lib/community-store";
import { PostCard } from "./post-card";
import { EmptyState, SectionHeader } from "./resident-shared";
import { timeAgo, uniquePosts } from "@/lib/utils";

const brandTagline = "让社区生活更美好";

const quickActions = [
  { label: "发需求", href: "/publish?kind=request", icon: "需", gradient: "linear-gradient(135deg,#66a8ff,#4f63ff)" },
  { label: "发闲置", href: "/publish?kind=secondhand", icon: "闲", gradient: "linear-gradient(135deg,#5be2c4,#35b7a0)" },
  { label: "发帖子", href: "/publish?kind=discussion", icon: "帖", gradient: "linear-gradient(135deg,#8c7dff,#7a6df8)" },
  { label: "报修报事", href: "/publish?kind=ticket", icon: "修", gradient: "linear-gradient(135deg,#ffbb72,#ff8b58)" },
  { label: "投票", href: "/publish?kind=poll", icon: "票", gradient: "linear-gradient(135deg,#7eb0ff,#63d3ff)" },
] as const;

export function HomeClient() {
  const { posts, currentUser, unreadNotificationCount, hydrated } = useCommunityPosts();
  const [activeTab, setActiveTab] = useState<"latest" | "following">("latest");

  const publicPosts = useMemo(() => uniquePosts(filterPublicPosts(posts)), [posts]);
  const announcementPost = publicPosts.find((post) => post.pinned && post.category === "discussion") ?? null;
  const latestPosts = publicPosts.filter((post) => post.id !== announcementPost?.id).slice(0, 3);
  const followingPosts = publicPosts.filter((post) => post.favorited).slice(0, 3);
  const feed = activeTab === "following" ? followingPosts : latestPosts;

  if (!hydrated) {
    return (
      <main className="page-shell space-y-4 pt-3 md:space-y-6 md:pt-5">
        <div className="app-card h-36 animate-pulse" />
        <div className="app-card h-32 animate-pulse" />
        <div className="app-card h-48 animate-pulse" />
      </main>
    );
  }

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <section className="px-1 pt-1 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <button type="button" className="inline-flex items-center gap-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">
              才栖名居
              <span className="text-xs text-[var(--muted)]">▼</span>
            </button>
            <p className="mt-1 text-xs text-[var(--muted)]">{currentUser ? `${currentUser.username} · ${currentUser.roomNumber}` : brandTagline}</p>
          </div>

          <Link
            href="/messages"
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg text-slate-900 shadow-[0_10px_26px_rgba(59,88,170,0.12)]"
            aria-label="消息中心"
          >
            🔔
            {unreadNotificationCount > 0 ? (
              <span className="absolute right-0 top-0 min-w-4 rounded-full bg-[#ff4f71] px-1 text-center text-[0.62rem] font-bold leading-4 text-white">
                {Math.min(unreadNotificationCount, 9)}
              </span>
            ) : null}
          </Link>
        </div>
      </section>


      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.88fr)] xl:items-start">
        <section className={`app-card px-4 py-4 md:px-4 md:py-4 ${announcementPost ? "" : "xl:col-span-2"}`}>
          <SectionHeader title="快捷入口" caption="常用操作" />
          <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2.5">
            {quickActions.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="app-icon-tile rounded-[1rem] px-0.5 py-1 md:gap-2 md:rounded-[1rem] md:px-2 md:py-1.5"
              >
                <span className="app-icon-bubble h-12 w-12 rounded-[1rem] md:h-10 md:w-10 md:rounded-[0.9rem]" style={{ background: item.gradient }}>
                  <span className="text-sm font-bold">{item.icon}</span>
                </span>
                <span className="text-[0.66rem] font-semibold leading-4 text-slate-800 md:text-[0.68rem]">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {announcementPost ? (
          <section className="app-card px-4 py-4 md:px-5 md:py-5">
            <SectionHeader title="社区公告" caption="重要通知" href="/neighbors" actionLabel="更多" />
            <div className="mt-4 rounded-[1.2rem] bg-[var(--surface-muted)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm font-semibold text-slate-900">
                  {announcementPost.title}
                </div>
                <span className="shrink-0 text-xs text-[var(--muted)]">
                  {timeAgo(announcementPost.createdAt)}
                </span>
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted)] line-clamp-4">
                {announcementPost.content}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1 md:px-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className={`pb-2 text-base font-semibold ${activeTab === "latest" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--muted)]"}`}
              onClick={() => setActiveTab("latest")}
            >
              最新动态
            </button>
            <button
              type="button"
              className={`pb-2 text-base font-semibold ${activeTab === "following" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--muted)]"}`}
              onClick={() => setActiveTab("following")}
            >
              关注
            </button>
          </div>
          <Link href="/neighbors" className="text-sm font-semibold text-[var(--primary)]">
            全部
          </Link>
        </div>

        {feed.length > 0 ? (
          <div className="grid gap-3">
            {feed.map((post) => (
              <PostCard key={post.id} post={post} compact={activeTab === "latest"} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={activeTab === "following" ? "还没有关注内容" : "还没有社区动态"}
            description={activeTab === "following" ? "先去收藏帖子或参与投票，这里就会汇总你关心的内容。" : "发布第一条需求、闲置或帖子，让邻居们看到它。"}
            actionHref="/publish"
            actionLabel="立即发布"
          />
        )}
      </section>
    </main>
  );
}
