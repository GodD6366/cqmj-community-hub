"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCommunityPosts } from "./community-provider";
import { filterPublicPosts } from "@/lib/community-store";
import { PostCard } from "./post-card";
import { EmptyState, ResidentMetricGrid, ResidentMobileHero, ResidentMobilePanel, SectionHeader } from "./resident-shared";
import { timeAgo, uniquePosts } from "@/lib/utils";

const quickActions = [
  { label: "发需求", href: "/publish?kind=request", icon: "需", gradient: "linear-gradient(135deg,#66a8ff,#4f63ff)" },
  { label: "发闲置", href: "/publish?kind=secondhand", icon: "闲", gradient: "linear-gradient(135deg,#5be2c4,#35b7a0)" },
  { label: "发帖子", href: "/publish?kind=discussion", icon: "帖", gradient: "linear-gradient(135deg,#8c7dff,#7a6df8)" },
  { label: "报修", href: "/publish?kind=ticket", icon: "修", gradient: "linear-gradient(135deg,#ffbb72,#ff8b58)" },
] as const;

export function HomeClient() {
  const { posts, currentUser, unreadNotificationCount, hydrated } = useCommunityPosts();
  const [activeTab, setActiveTab] = useState<"latest" | "following">("latest");

  const publicPosts = useMemo(() => uniquePosts(filterPublicPosts(posts)), [posts]);
  const announcementPost = publicPosts.find((post) => post.pinned && post.category === "discussion") ?? null;
  const latestPosts = publicPosts.filter((post) => post.id !== announcementPost?.id).slice(0, 8);
  const followingPosts = publicPosts.filter((post) => post.favorited).slice(0, 8);
  const feed = activeTab === "following" ? followingPosts : latestPosts;
  const metricValue = (value: string) => (hydrated ? value : "··");

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <div className="mobile-resident-only mobile-resident-stack">
        <ResidentMobileHero
          className="mobile-resident-hero-compact"
          background="radial-gradient(circle at 16% 18%, rgba(237,170,92,0.3), transparent 25%), radial-gradient(circle at 84% 12%, rgba(96,188,255,0.24), transparent 22%), linear-gradient(160deg, #101a33 0%, #16365b 48%, #254e83 100%)"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="mobile-resident-kicker text-white/72">社区首页</div>
              <div className="mt-1 text-base font-semibold tracking-[-0.04em] text-white">才栖名居</div>
            </div>

            <Link
              href="/messages"
              className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-lg text-white ring-1 ring-white/14 backdrop-blur"
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

          <h1 className="mobile-resident-title mt-3 max-w-[8ch]">社区动态</h1>

          <ResidentMetricGrid
            className="mt-3"
            items={[
              { label: "公开动态", value: metricValue(String(publicPosts.length).padStart(2, "0")) },
              { label: "公告", value: hydrated ? (announcementPost ? "01" : "00") : "··" },
            ]}
            tone="inverse"
          />

          <div className="mt-3 line-clamp-1 rounded-[1rem] bg-white/8 px-3 py-2 ring-1 ring-white/10 backdrop-blur-sm text-xs font-semibold text-white">
            {announcementPost ? announcementPost.title : currentUser ? `${currentUser.username} · ${currentUser.roomNumber}` : "发需求 / 发闲置 / 报修"}
          </div>
        </ResidentMobileHero>

        <ResidentMobilePanel className="mobile-resident-panel-compact" delay="120ms">
          <div className="flex items-center justify-between gap-3">
            <div className="mobile-resident-kicker text-[var(--primary)]">入口</div>
            <h2 className="sr-only">快捷入口</h2>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {quickActions.map((item) => (
              <Link key={item.label} href={item.href} className="app-icon-tile rounded-[0.9rem] px-0.5 py-0.5">
                <span className="app-icon-bubble" style={{ background: item.gradient }}>
                  <span className="text-sm font-bold">{item.icon}</span>
                </span>
                <span className="text-[0.66rem] font-semibold leading-4 text-slate-800">{item.label}</span>
              </Link>
            ))}
          </div>
        </ResidentMobilePanel>

        <ResidentMobilePanel className="mobile-resident-panel-compact" delay="200ms">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mobile-resident-kicker text-[#2d8e94]">社区</div>
              <h2 className="mobile-resident-panel-title mt-1">公告</h2>
            </div>
            <Link href="/neighbors" className="shrink-0 rounded-full bg-[rgba(45,142,148,0.09)] px-3 py-1 text-[0.72rem] font-semibold text-[#1d6f73]">
              更多
            </Link>
          </div>

          {!hydrated ? (
            <EmptyState
              title="公告加载中"
              actionHref="/neighbors"
              actionLabel="查看邻里"
            />
          ) : announcementPost ? (
            <div className="mt-3 rounded-[1rem] bg-white/82 px-3 py-3 shadow-[0_10px_20px_rgba(58,75,124,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm font-semibold text-slate-900">{announcementPost.title}</div>
                <span className="shrink-0 text-xs text-[var(--muted)]">{timeAgo(announcementPost.createdAt)}</span>
              </div>
              <div className="mt-1.5 text-xs leading-5 text-[var(--muted)] line-clamp-2">{announcementPost.content}</div>
            </div>
          ) : (
            <EmptyState
              title="当前没有置顶公告"
              actionHref="/neighbors"
              actionLabel="查看邻里"
            />
          )}
        </ResidentMobilePanel>

        <ResidentMobilePanel className="mobile-resident-panel-feed" delay="280ms">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className={`pb-1.5 text-[0.95rem] font-semibold ${activeTab === "latest" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--muted)]"}`}
                onClick={() => setActiveTab("latest")}
              >
                最新动态
              </button>
              <button
                type="button"
                className={`pb-1.5 text-[0.95rem] font-semibold ${activeTab === "following" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--muted)]"}`}
                onClick={() => setActiveTab("following")}
              >
                关注
              </button>
            </div>
            <Link href="/neighbors" className="text-sm font-semibold text-[var(--primary)]">
              全部
            </Link>
          </div>

          <div className="mt-3 grid gap-2">
            {!hydrated ? (
              <EmptyState
                title="动态加载中"
                actionHref="/neighbors"
                actionLabel="查看邻里"
              />
            ) : feed.length > 0 ? (
              feed.map((post) => <PostCard key={post.id} post={post} compact={activeTab === "latest"} />)
            ) : (
              <EmptyState
                title={activeTab === "following" ? "还没有关注内容" : "还没有社区动态"}
                actionHref="/publish"
                actionLabel="去发布"
              />
            )}
          </div>
        </ResidentMobilePanel>
      </div>

      <div className="hidden md:block">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.88fr)] xl:items-start">
          <section className={`app-card px-4 py-4 md:px-4 md:py-4 ${announcementPost ? "" : "xl:col-span-2"}`}>
            <SectionHeader title="快捷入口" />
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

          {!hydrated ? (
            <section className="app-card px-4 py-4 md:px-5 md:py-5">
              <SectionHeader title="公告" />
              <div className="mt-4">
                <EmptyState
                  title="公告加载中"
                  actionHref="/neighbors"
                  actionLabel="查看邻里"
                />
              </div>
            </section>
          ) : announcementPost ? (
            <section className="app-card px-4 py-4 md:px-5 md:py-5">
              <SectionHeader title="公告" href="/neighbors" actionLabel="更多" />
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

          {!hydrated ? (
            <EmptyState
              title="动态加载中"
              actionHref="/neighbors"
              actionLabel="查看邻里"
            />
          ) : feed.length > 0 ? (
            <div className="grid gap-3">
              {feed.map((post) => (
                <PostCard key={post.id} post={post} compact={activeTab === "latest"} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={activeTab === "following" ? "还没有关注内容" : "还没有社区动态"}
              actionHref="/publish"
              actionLabel="去发布"
            />
          )}
        </section>
      </div>
    </main>
  );
}
