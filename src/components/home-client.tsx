"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCommunityPosts } from "@/lib/community-store";
import { filterPublicPosts } from "@/lib/community-store";
import { PostCard } from "./post/post-card";
import { EmptyState } from "./ui/empty-state";
import { PostCategoryTabs } from "./post/category-tabs";
import { getCommunityName } from "@/lib/community-brand";
import { uniquePosts } from "@/lib/utils";
import type { CommunityPost, PostCategory, PollSummary } from "@/lib/types";
import { BellIcon, PlusIcon, SearchIcon, BuildingIcon, MessagesIcon, UsersIcon, ServiceIcon } from "./app-icons";
import { SystemLogo } from "./system-logo";
import { Button } from "@heroui/react";

const filterTabs: Array<{ tab: FilterTab; label: string }> = [
  { tab: "all", label: "全部" },
  { tab: "latest", label: "最新" },
  { tab: "following", label: "关注" },
  { tab: "featured", label: "精华" },
];

type FilterTab = "all" | "latest" | "following" | "featured";

export function HomeClient() {
  const { currentUser, posts, polls, unreadNotificationCount, hydrated, votePoll } = useCommunityPosts();
  const communityName = getCommunityName();
  const buildingLabel = currentUser?.roomNumber?.split("-")[0]?.trim();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [activeCategory, setActiveCategory] = useState<PostCategory | "all">("all");
  const [filteredPosts, setFilteredPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingPollId, setPendingPollId] = useState<string | null>(null);
  const [pollError, setPollError] = useState("");
  const [pollMessage, setPollMessage] = useState("");

  const publicPosts = useMemo(() => uniquePosts(filterPublicPosts(posts)), [posts]);
  const openPolls = useMemo(() => polls.filter((poll) => poll.status === "active").length, [polls]);
  const latestPost = publicPosts[0];

  const mixedFeed = useMemo(() => {
    let currentPolls = [...polls];
    if (activeFilter === "featured" || activeFilter === "following") {
      currentPolls = [];
    }
    if (activeCategory !== "all") {
      currentPolls = [];
    }
    const items: Array<
      | { type: "post"; data: CommunityPost; createdAt: number }
      | { type: "poll"; data: PollSummary; createdAt: number }
    > = [
      ...filteredPosts.map((p) => ({ type: "post" as const, data: p, createdAt: new Date(p.createdAt).getTime() })),
      ...currentPolls.map((p) => ({ type: "poll" as const, data: p, createdAt: new Date(p.createdAt).getTime() })),
    ];
    items.sort((a, b) => b.createdAt - a.createdAt);
    return items;
  }, [filteredPosts, polls, activeFilter, activeCategory]);

  const normalizePosts = useCallback(
    (items: CommunityPost[]) => uniquePosts(filterPublicPosts(items)),
    [],
  );

  const fetchFilteredPosts = useCallback(
    async (filter: FilterTab, category: PostCategory | "all") => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter !== "all") params.set("filter", filter);
        if (category !== "all") params.set("category", category);

        const query = params.toString();
        const response = await fetch(query ? `/api/posts?${query}` : "/api/posts");
        if (response.ok) {
          const data = await response.json();
          setFilteredPosts(normalizePosts(data.posts || []));
        } else {
          setFilteredPosts(publicPosts);
        }
      } catch {
        setFilteredPosts(publicPosts);
      } finally {
        setLoading(false);
      }
    },
    [normalizePosts, publicPosts],
  );

  useEffect(() => {
    if (hydrated) setFilteredPosts(publicPosts);
  }, [hydrated, publicPosts]);

  useEffect(() => {
    if (hydrated) fetchFilteredPosts(activeFilter, activeCategory);
  }, [activeFilter, activeCategory, hydrated, fetchFilteredPosts]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      {/* 移动端 Header */}
      <div className="app-panel flex items-center justify-between p-4 md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <SystemLogo className="shrink-0" markClassName="h-11 w-11" showLabel={false} />
          <div className="min-w-0">
            <h1 className="app-display truncate text-2xl leading-tight">{communityName}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {buildingLabel ? `${buildingLabel}栋居民生活圈` : "居民生活圈"}
              <span className="ml-1 text-primary">实时更新</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/posts" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted/50" aria-label="搜索">
            <SearchIcon />
          </Link>
          <Link href="/messages" className="relative flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted/50" aria-label="通知">
            <BellIcon />
            {unreadNotificationCount > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
            )}
          </Link>
        </div>
      </div>

      <div className="app-panel-strong p-5 md:hidden">
        <div className="map-coordinate">今日社区运行图</div>
        <h2 className="app-display mt-3 text-3xl leading-tight">小区里的事，回到一张图上。</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {currentUser ? `${currentUser.nickname}，欢迎回来。` : "访客浏览中。"}
          动态、投票、工单和邻里互助在这里汇成一条清楚的社区动线。
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "动态", value: hydrated ? publicPosts.length : "--" },
            { label: "投票", value: openPolls },
            { label: "未读", value: unreadNotificationCount },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/70 bg-white/72 p-3 text-center">
              <div className="app-utility text-xl font-black tabular-nums">{item.value}</div>
              <div className="mt-0.5 text-[0.68rem] font-bold text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 桌面端 Hero */}
      <div className="app-panel-strong hidden overflow-hidden p-6 md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-6">
        <div>
          <div className="map-coordinate">今日社区运行图</div>
          <h1 className="app-display mt-4 max-w-xl text-5xl leading-[1.05]">
            把小区里的事，放回同一张地图上。
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            {currentUser ? `${currentUser.nickname}，欢迎回来。` : "访客浏览中，登录后可参与互动。"}
            动态、邻里技能、投票和工单按同一套居民脉络流转，少翻群，多闭环。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/publish"
              className="app-action bg-primary px-4 text-sm text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary-strong"
            >
              <PlusIcon />
              发布内容
            </Link>
            <Link
              href="/neighbors"
              className="app-action border border-border bg-white/78 px-4 text-sm text-foreground hover:bg-white"
            >
              <UsersIcon />
              找邻居帮忙
            </Link>
          </div>
        </div>
        <div className="station-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BuildingIcon />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Current station</div>
              <div className="font-bold">{buildingLabel ? `${buildingLabel}栋` : "全小区"}</div>
            </div>
          </div>
          <div className="route-divider my-4" />
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
              <span className="text-muted-foreground">公开动态</span>
              <strong className="tabular-nums">{hydrated ? publicPosts.length : "--"}</strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
              <span className="text-muted-foreground">进行投票</span>
              <strong className="tabular-nums">{openPolls}</strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
              <span className="text-muted-foreground">未读消息</span>
              <strong className="tabular-nums">{unreadNotificationCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 桌面端布局 */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_320px]">
        {/* 主内容区 */}
        <div className="space-y-4">
          {/* 过滤面板 */}
          <div className="app-panel space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3">
              {filterTabs.map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => setActiveFilter(item.tab)}
                  className={`app-chip ${
                    activeFilter === item.tab
                      ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/15"
                      : "border-default-200 text-muted-foreground hover:border-default-400"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <PostCategoryTabs
              allowDeselect
              ariaLabel="首页帖子分类"
              onChange={(category) => setActiveCategory(category ?? "all")}
              value={activeCategory === "all" ? null : activeCategory}
            />
          </div>

          {/* 信息流 */}
          <div className="space-y-3">
            {pollError && <div className="text-sm text-danger">{pollError}</div>}
            {pollMessage && <div className="text-sm text-success">{pollMessage}</div>}
            {!hydrated || loading ? (
              <div className="app-panel p-6 text-center text-sm text-muted-foreground">加载中...</div>
            ) : mixedFeed.length > 0 ? (
              mixedFeed.slice(0, 30).map((item) =>
                item.type === "post" ? (
                  <PostCard key={`post-${item.data.id}`} post={item.data} />
                ) : (
                  <PollCard
                    key={`poll-${item.data.id}`}
                    poll={item.data}
                    pending={pendingPollId === item.data.id}
                    allowVote={Boolean(currentUser)}
                    onVote={async (optionId) => {
                      if (!currentUser) { setPollError("请先登录后参与投票"); return; }
                      setPendingPollId(item.data.id);
                      setPollError(""); setPollMessage("");
                      try { await votePoll(item.data.id, optionId); setPollMessage(`已参与投票：${item.data.title}`); }
                      catch (err) { setPollError(err instanceof Error ? err.message : "参与投票失败"); }
                      finally { setPendingPollId(null); }
                    }}
                  />
                ),
              )
            ) : (
              <EmptyState title="还没有帖子" actionHref="/publish" actionLabel="去发布" />
            )}
          </div>
        </div>

        {/* 桌面端侧栏 */}
        <aside className="hidden space-y-4 lg:block">
          <div className="app-panel p-5">
            <div className="map-coordinate">站点概况</div>
            <h2 className="app-display mt-3 text-2xl leading-tight">今日社区</h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <div className="rounded-2xl bg-primary/8 p-3"><span>住户状态</span><strong className="float-right text-foreground">{currentUser ? "已登录" : "访客"}</strong></div>
              <div className="rounded-2xl bg-accent/10 p-3"><span>公开动态</span><strong className="float-right text-foreground">{hydrated ? publicPosts.length : "--"}</strong></div>
              <div className="rounded-2xl bg-warning/10 p-3"><span>未读消息</span><strong className="float-right text-foreground">{unreadNotificationCount}</strong></div>
            </div>
          </div>
          <div className="app-panel p-5">
            <div className="map-coordinate">最近回音</div>
            <div className="mt-3 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <MessagesIcon />
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-bold">{latestPost?.title ?? "等待第一条社区动态"}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {latestPost?.content ?? "有新的需求、闲置或讨论时，会在这里形成社区���第一声回音。"}
                </p>
              </div>
            </div>
          </div>
          <div className="app-panel p-5">
            <div className="flex items-center gap-2">
              <ServiceIcon className="h-4 w-4 text-primary" />
              <h2 className="font-bold">热门标签</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {publicPosts.slice(0, 5).flatMap((item) => item.tags).slice(0, 6).map((tag, i) => (
                <span key={`${tag}-${i}`} className="rounded-full border border-primary/18 bg-primary/7 px-2.5 py-1 text-xs font-semibold text-primary-strong">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── 投票卡片内联组件 ───────────────────────────

function PollCard({
  poll,
  pending,
  allowVote,
  onVote,
}: {
  poll: PollSummary;
  pending: boolean;
  allowVote: boolean;
  onVote: (optionId: string) => Promise<void>;
}) {
  const totalVotes = poll.totalVotes || 1;

  return (
    <div className="app-panel p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">投票</span>
        <span className="text-xs text-muted-foreground">
          {poll.status === "closed" ? "已结束" : "进行中"}
        </span>
      </div>
      <h3 className="mt-2 font-semibold">{poll.title}</h3>
      {poll.description && <p className="mt-1 text-sm text-muted-foreground">{poll.description}</p>}
      <div className="mt-3 space-y-2">
        {poll.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
          const isSelected = poll.selectedOptionId === option.id;
          return (
            <div key={option.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={isSelected ? "font-semibold text-primary" : ""}>{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.voteCount} 票 ({pct}%)</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-default-100">
                <div
                  className={`h-full rounded-full transition-all ${isSelected ? "bg-primary" : "bg-default-300"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {allowVote && poll.status !== "closed" && (
                <Button
                  size="sm"
                  variant={isSelected ? "primary" : "secondary"}
                  className="mt-1 min-h-11 font-semibold"
                  isDisabled={pending || poll.hasVoted}
                  onPress={() => { void onVote(option.id); }}
                >
                  {poll.hasVoted ? (isSelected ? "已投票" : "投票") : "投票"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        {poll.authorName} · 共 {totalVotes} 票
      </div>
    </div>
  );
}
