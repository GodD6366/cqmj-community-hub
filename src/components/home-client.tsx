"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCommunityPosts } from "./community-provider";
import { filterPublicPosts } from "@/lib/community-store";
import { PostCard } from "./post-card";
import { EmptyState, PollCard } from "./resident-shared";
import { BellIcon, FilterIcon, PlusIcon, SearchIcon, VoteIcon } from "./app-icons";
import { PostCategoryTabs } from "./post-category-tabs";
import { getCommunityName } from "@/lib/community-brand";
import { uniquePosts } from "@/lib/utils";
import { postCategoryTabMeta, type CommunityPost, type PostCategory, type PollSummary } from "@/lib/types";

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

  const mixedFeed = useMemo(() => {
    let currentPolls = [...polls];
    if (activeFilter === "featured" || activeFilter === "following") {
       currentPolls = [];
    }
    if (activeCategory !== "all") {
       currentPolls = [];
    }
    const items: Array<{ type: "post"; data: CommunityPost; createdAt: number } | { type: "poll"; data: PollSummary; createdAt: number }> = [
      ...filteredPosts.map(p => ({ type: "post" as const, data: p, createdAt: new Date(p.createdAt).getTime() })),
      ...currentPolls.map(p => ({ type: "poll" as const, data: p, createdAt: new Date(p.createdAt).getTime() }))
    ];
    items.sort((a, b) => b.createdAt - a.createdAt);
    return items;
  }, [filteredPosts, polls, activeFilter, activeCategory]);

  // 初始帖子列表（从 provider 获取）
  const publicPosts = useMemo(() => uniquePosts(filterPublicPosts(posts)), [posts]);

  const normalizePosts = useCallback((items: CommunityPost[]) => uniquePosts(filterPublicPosts(items)), []);

  // 当筛选条件变化时，调用 API 获取筛选后的帖子
  const fetchFilteredPosts = useCallback(async (filter: FilterTab, category: PostCategory | "all") => {
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
    } catch (error) {
      console.error("Failed to fetch filtered posts:", error);
      setFilteredPosts(publicPosts);
    } finally {
      setLoading(false);
    }
  }, [normalizePosts, publicPosts]);

  // 初始化时使用 provider 的数据
  useEffect(() => {
    if (hydrated) {
      setFilteredPosts(publicPosts);
    }
  }, [hydrated, publicPosts]);

  // 筛选条件变化时获取数据
  useEffect(() => {
    if (hydrated) {
      fetchFilteredPosts(activeFilter, activeCategory);
    }
  }, [activeFilter, activeCategory, hydrated, fetchFilteredPosts]);

  return (
    <main className="page-shell">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_320px] gap-4 desktop-home-layout">
        {/* 主内容区域 */}
        <div className="desktop-home-main space-y-4">
          
          {/* 移动端专属 Header：仅在 md:hidden 下显示 */}
          <div className="mobile-home-header md:hidden flex justify-between items-center pb-3">
            <div>
              <h1 className="mobile-home-title text-xl font-bold">{communityName}</h1>
              <p className="mobile-home-subtitle text-xs text-[var(--muted)]">
                {buildingLabel ? `${buildingLabel}栋居民生活圈` : "居民生活圈"}{" "}
                <span className="mobile-home-status text-[var(--primary)] ml-1">实时更新</span>
              </p>
            </div>
            <div className="mobile-home-header-actions flex gap-2">
              <Link href="/posts" className="mobile-home-header-btn p-2" aria-label="搜索">
                <SearchIcon />
              </Link>
              <Link href="/messages" className="mobile-home-header-btn p-2 relative" aria-label="通知">
                <BellIcon />
                {unreadNotificationCount > 0 && (
                  <span className="mobile-home-badge absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Link>
            </div>
          </div>

          {/* 桌面端专属 Hero：仅在 hidden md:flex 下显示 */}
          <div className="desktop-home-hero hidden md:flex justify-between items-center p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 rounded-2xl border border-[var(--border)]">
            <div>
              <div className="section-kicker text-xs font-semibold text-indigo-600">动态 · 邻里互助与便民入口</div>
              <h1 className="text-2xl font-bold mt-1 text-slate-900">社区首页</h1>
              <p className="text-sm text-[var(--muted)] mt-1">{currentUser ? `${currentUser.nickname}，欢迎回来` : "访客浏览中，登录后可参与互动"}</p>
            </div>
            <Link className="desktop-home-primary flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition" href="/publish">
              <PlusIcon />
              发布内容
            </Link>
          </div>

          {/* 过滤和类别标签面板 */}
          <div className="desktop-filter-card bg-white p-4 rounded-2xl border border-[var(--border)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div className="flex flex-wrap gap-1.5">
                {filterTabs.map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => setActiveFilter(item.tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                      activeFilter === item.tab 
                        ? "bg-indigo-600 border-indigo-600 text-white" 
                        : "border-[var(--border)] hover:border-indigo-600 text-[var(--muted)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button type="button" className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] border border-[var(--border)] px-3 py-1.5 rounded-full">
                <span>筛选</span>
                <FilterIcon />
              </button>
            </div>
            
            <PostCategoryTabs
              allowDeselect
              ariaLabel="首页帖子分类"
              className="w-full home-category-tabs"
              onChange={(category) => setActiveCategory(category ?? "all")}
              value={activeCategory === "all" ? null : activeCategory}
            />
          </div>

          {/* 统一的帖子与投票列表 */}
          <div className="grid gap-3">
            {pollError ? <div className="text-red-500 text-sm">{pollError}</div> : null}
            {pollMessage ? <div className="text-green-500 text-sm">{pollMessage}</div> : null}
            {!hydrated || loading ? (
              <div className="app-card p-6 text-sm text-[var(--muted)] text-center">加载中...</div>
            ) : mixedFeed.length > 0 ? (
              mixedFeed.slice(0, 10).map((item) => (
                item.type === "post" ? (
                  <PostCard key={`post-${item.data.id}`} post={item.data as CommunityPost} />
                ) : (
                  <PollCard 
                    key={`poll-${item.data.id}`} 
                    poll={item.data as PollSummary} 
                    pending={pendingPollId === item.data.id}
                    allowVote={Boolean(currentUser)}
                    onVote={async (optionId) => {
                      if (!currentUser) { setPollError("请先登录后参与投票"); return; }
                      setPendingPollId(item.data.id);
                      setPollError(""); setPollMessage("");
                      try {
                        await votePoll(item.data.id, optionId);
                        setPollMessage(`已参与投票：${item.data.title}`);
                      } catch (err) {
                        setPollError(err instanceof Error ? err.message : "参与投票失败");
                      } finally {
                        setPendingPollId(null);
                      }
                    }}
                  />
                )
              ))
            ) : (
              <EmptyState title="还没有帖子" actionHref="/publish" actionLabel="去发布" />
            )}
          </div>
        </div>

        {/* 侧栏：仅在桌面端显示 */}
        <aside className="desktop-home-aside hidden lg:block space-y-4">
          <div className="desktop-side-card bg-white p-5 rounded-2xl border border-[var(--border)]">
            <div className="section-kicker text-xs font-semibold text-indigo-600">概况</div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">今日社区</h2>
            <div className="desktop-stat-list mt-3 space-y-2 text-sm text-[var(--muted)]">
              <div className="flex justify-between"><span>住户状态</span><strong>{currentUser ? "已登录" : "访客"}</strong></div>
              <div className="flex justify-between"><span>公开动态</span><strong>{hydrated ? publicPosts.length : "--"}</strong></div>
              <div className="flex justify-between"><span>未读消息</span><strong>{unreadNotificationCount}</strong></div>
            </div>
          </div>


          <div className="desktop-side-card bg-white p-5 rounded-2xl border border-[var(--border)]">
            <h2 className="text-lg font-bold text-slate-900">热门标签</h2>
            <div className="desktop-tag-list mt-3 flex flex-wrap gap-1.5">
              {publicPosts.slice(0, 5).flatMap((item) => item.tags).slice(0, 6).map((tag, index) => (
                <span key={`${tag}-${index}`} className="text-xs border border-[var(--border)] px-2 py-1 rounded-full bg-slate-50 text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function HeartStatIcon() {
  return <span className="inline-flex"><BellIcon className="h-3.5 w-3.5" /></span>;
}

function CommentStatIcon() {
  return <span className="inline-flex"><VoteIcon className="h-3.5 w-3.5" /></span>;
}

function StarStatIcon() {
  return <span className="inline-flex"><FilterIcon className="h-3.5 w-3.5" /></span>;
}
