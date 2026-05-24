"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCommunityPosts } from "./community-provider";
import { filterPublicPosts } from "@/lib/community-store";
import { PostCard } from "./post-card";
import { EmptyState, PollCard } from "./resident-shared";
import { BellIcon, FilterIcon, PlusIcon, SearchIcon, VoteIcon } from "./app-icons";
import { CategoryGlyph } from "./category-glyph";
import { PostCategoryTabs } from "./post-category-tabs";
import { getCommunityName } from "@/lib/community-brand";
import { uniquePosts } from "@/lib/utils";
import { postCategoryTabMeta, postCategoryTabs, type CommunityPost, type PostCategory, type PollSummary } from "@/lib/types";

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
      {/* 移动端首页 */}
      <section className="mobile-home md:!hidden">
        {/* 顶部标题栏 */}
        <div className="mobile-home-header">
          <div>
            <h1 className="mobile-home-title">社区终端</h1>
            <p className="mobile-home-subtitle">{communityName}{buildingLabel ? ` · ${buildingLabel}栋` : ""} <span className="mobile-home-status">SYS:ONLINE</span></p>
          </div>
          <div className="mobile-home-header-actions">
            <Link href="/posts" className="mobile-home-header-btn" aria-label="搜索">
              <SearchIcon />
            </Link>
            <Link href="/messages" className="mobile-home-header-btn" aria-label="通知">
              <BellIcon />
              {unreadNotificationCount > 0 && (
                <span className="mobile-home-badge">{unreadNotificationCount}</span>
              )}
            </Link>
          </div>
        </div>

        {/* 分类标签 */}
        <PostCategoryTabs
          ariaLabel="首页帖子分类"
          allowDeselect
          className="mobile-category-grid"
          onChange={(category) => setActiveCategory(category ?? "all")}
          value={activeCategory === "all" ? null : activeCategory}
        />

        {/* 筛选标签 */}
        <div className="mobile-filter-row">
          <div className="mobile-filter-tabs">
            {filterTabs.map((item) => (
              <button
                key={item.tab}
                type="button"
                className={`mobile-filter-tab ${activeFilter === item.tab ? "is-active" : ""}`}
                onClick={() => setActiveFilter(item.tab)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" className="mobile-filter-more">
            <span>筛选</span>
            <FilterIcon />
          </button>
        </div>

        {/* 帖子列表 */}
        <div className="mobile-post-list">
          {pollError ? <div className="text-red-500 text-sm mb-2 px-4">{pollError}</div> : null}
          {pollMessage ? <div className="text-green-500 text-sm mb-2 px-4">{pollMessage}</div> : null}
          {!hydrated || loading ? (
            <div className="mobile-post-loading">加载中...</div>
          ) : mixedFeed.length > 0 ? (
            mixedFeed.slice(0, 10).map((item) => (
              item.type === "post" ? (
              <Link
                key={`post-${item.data.id}`}
                href={`/posts/${item.data.id}`}
                className="mobile-post-card"
              >
                <div className="mobile-post-card-header">
                  <div className="mobile-post-card-author">
                    <span className="mobile-post-card-avatar">
                      {Array.from((item.data as CommunityPost).authorName)[0] ?? "邻"}
                    </span>
                    <div>
                      <span className="mobile-post-card-name">{(item.data as CommunityPost).authorName}</span>
                      <span className="mobile-post-card-location">{(item.data as CommunityPost).authorRoom || "未知"}</span>
                    </div>
                  </div>
                  <span className={`mobile-post-card-badge mobile-post-card-badge--${(item.data as CommunityPost).category}`}>
                    {postCategoryTabMeta[(item.data as CommunityPost).category].title}
                  </span>
                </div>

                <h3 className="mobile-post-card-title">{item.data.title}</h3>
                <p className="mobile-post-card-content">{(item.data as CommunityPost).content}</p>

                {(item.data as CommunityPost).tags.length > 0 && (
                  <div className="mobile-post-card-tags">
                    {(item.data as CommunityPost).tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="mobile-post-tag">#{tag}</span>
                    ))}
                  </div>
                )}

                {(item.data as CommunityPost).images.length > 0 && (
                  <div className="mobile-post-card-images">
                    {(item.data as CommunityPost).images.slice(0, 3).map((image, index) => (
                      <div key={image.id} className="mobile-post-card-image">
                        <img src={image.url} alt={`${item.data.title} ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mobile-post-card-stats">
                  <span><HeartStatIcon /> {(item.data as CommunityPost).favoriteCount}</span>
                  <span><CommentStatIcon /> {(item.data as CommunityPost).commentCount}</span>
                  <span><StarStatIcon /> {(item.data as CommunityPost).favoriteCount}</span>
                </div>
              </Link>
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
      </section>

      {/* 桌面端布局 */}
      <section className="hidden md:grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-4">
          <div className="app-card p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {filterTabs.map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => setActiveFilter(item.tab)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition ${activeFilter === item.tab
                      ? "border-[rgba(57,245,143,0.3)] bg-[rgba(57,245,143,0.12)] text-[var(--primary)]"
                      : "border-[rgba(15,23,42,0.08)] bg-white text-slate-600 hover:border-[rgba(57,245,143,0.22)] hover:text-slate-950"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`rounded-md border px-3 py-1.5 text-sm transition ${activeCategory === "all"
                    ? "border-[rgba(57,245,143,0.3)] bg-[rgba(57,245,143,0.12)] text-[var(--primary)]"
                    : "border-[rgba(15,23,42,0.08)] bg-white text-slate-600 hover:border-[rgba(57,245,143,0.22)] hover:text-slate-950"}`}
                >
                  全部分类
                </button>
                {postCategoryTabs.map((item) => (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => setActiveCategory(item.category)}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${activeCategory === item.category
                      ? "border-[rgba(57,245,143,0.3)] bg-[rgba(57,245,143,0.12)] text-[var(--primary)]"
                      : "border-[rgba(15,23,42,0.08)] bg-white text-slate-600 hover:border-[rgba(57,245,143,0.22)] hover:text-slate-950"}`}
                  >
                    <span className={`mobile-category-icon tone-${item.tone} !h-6 !w-6`}>
                      <CategoryGlyph category={item.category} />
                    </span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {postCategoryTabs.map((item) => (
              <Link
                key={item.category}
                href={`/publish?kind=${item.category}`}
                className="app-card p-4 transition hover:border-[rgba(57,245,143,0.28)]"
              >
                <div className="flex items-start gap-3">
                  <span className={`mobile-category-icon tone-${item.tone}`}>
                    <CategoryGlyph category={item.category} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                    <div className="text-[0.72rem] text-[var(--muted)]">{item.description}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid gap-3">
            {pollError ? <div className="text-red-500 text-sm">{pollError}</div> : null}
            {pollMessage ? <div className="text-green-500 text-sm">{pollMessage}</div> : null}
            {!hydrated || loading ? (
              <div className="app-card p-6 text-sm text-[var(--muted)]">加载中...</div>
            ) : mixedFeed.length > 0 ? (
              mixedFeed.slice(0, 8).map((item) => (
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

        <div className="space-y-4">
          <div className="app-card p-4">
            <div className="section-kicker">Community Stats</div>
            <h2 className="mt-2 text-[1.1rem] font-semibold text-slate-950">社区概况</h2>
            <div className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
              <div>住户状态：{currentUser ? "已登录" : "访客模式"}</div>
              <div>帖子总数：{hydrated ? publicPosts.length : "--"}</div>
              <div>未读消息：{unreadNotificationCount}</div>
            </div>
          </div>

          <div className="app-card p-4">
            <div className="text-sm font-semibold text-slate-900">热门标签</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {publicPosts.slice(0, 5).flatMap((item) => item.tags).slice(0, 6).map((tag, index) => (
                <span key={`${tag}-${index}`} className="rounded-full border border-[rgba(57,245,143,0.12)] px-2.5 py-1 text-[0.72rem] text-[var(--primary)]">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="app-card p-4">
            <div className="text-sm font-semibold text-slate-900">快捷操作</div>
            <div className="mt-3 grid gap-2">
              <Link href="/publish" className="app-shell-link !p-3">
                <span className="app-shell-link-icon"><PlusIcon /></span>
                <span className="app-shell-link-copy">
                  <span className="app-shell-link-title">发布内容</span>
                  <span className="app-shell-link-meta">分享你的想法</span>
                </span>
              </Link>
              <Link href="/publish?kind=poll" className="app-shell-link !p-3">
                <span className="app-shell-link-icon"><VoteIcon /></span>
                <span className="app-shell-link-copy">
                  <span className="app-shell-link-title">发起投票</span>
                  <span className="app-shell-link-meta">发布社区议题</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
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
