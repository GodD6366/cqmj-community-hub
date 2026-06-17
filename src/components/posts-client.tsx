"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCommunityPosts } from "@/lib/community-store";
import { filterPublicPosts } from "@/lib/community-store";
import { PostCard } from "./post/post-card";
import { EmptyState } from "./ui/empty-state";
import { PostCategoryTabs } from "./post/category-tabs";
import { filterPosts, sortPosts } from "@/lib/utils";
import type { PostCategory, SortMode } from "@/lib/types";
import { PublishIcon, SearchIcon } from "./app-icons";

const sortModes: Array<{ key: SortMode; label: string }> = [
  { key: "latest", label: "最新" },
  { key: "popular", label: "最热" },
  { key: "featured", label: "精选" },
];

interface PostsClientProps {
  initialCategory?: PostCategory | "all";
  initialMode?: string;
  initialQuery?: string;
}

export function PostsClient({ initialCategory = "all", initialMode = "all", initialQuery = "" }: PostsClientProps) {
  const { posts, hydrated } = useCommunityPosts();
  const [category, setCategory] = useState<PostCategory | "all">(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [sortMode, setSortMode] = useState<SortMode>(initialMode === "mine" || initialMode === "favorites" ? "latest" : initialMode as SortMode || "latest");

  const publicPosts = useMemo(() => filterPublicPosts(posts), [posts]);

  const displayPosts = useMemo(() => {
    let result = filterPosts(publicPosts, { category, query: query.trim() });
    result = sortPosts(result, sortMode);
    return result;
  }, [publicPosts, category, query, sortMode]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      {/* 桌面端 Hero */}
      <div className="app-panel-strong hidden p-6 md:flex md:items-end md:justify-between">
        <div>
          <div className="map-coordinate">公开动态站</div>
          <h1 className="app-display mt-3 text-4xl leading-tight">帖子广场</h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">把需求、闲置、交流和约玩按同一条社区动线归档，方便邻居找到来龙去脉。</p>
        </div>
        <Link
          href="/publish"
          className="app-action bg-primary px-4 text-sm text-primary-foreground shadow-sm shadow-primary/15 hover:bg-primary-strong"
        >
          <PublishIcon />
          发布内容
        </Link>
      </div>

      {/* 过滤器 */}
      <div className="app-panel space-y-3 p-4">
        {/* 搜索 */}
        <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-white/80 px-3 py-2 shadow-sm">
          <SearchIcon />
          <input
            type="text"
            className="min-h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="搜索标题、内容、标签..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索帖子"
          />
        </div>

        {/* 分类和排序 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
          <PostCategoryTabs
            allowDeselect
            ariaLabel="帖子分类筛选"
            onChange={(cat) => setCategory(cat ?? "all")}
            value={category === "all" ? null : category}
          />
          <select
            aria-label="排序方式"
            className="min-h-11 w-28 rounded-xl border border-border bg-white/82 px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors hover:border-primary/35 focus-visible:border-primary"
            value={sortMode}
            onChange={(event) => {
              setSortMode(event.target.value as SortMode);
            }}
          >
            {sortModes.map((mode) => (
              <option key={mode.key} value={mode.key}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 帖子列表 */}
      <div className="space-y-3">
        {!hydrated ? (
          <div className="app-panel p-6 text-center text-sm text-muted-foreground">加载中...</div>
        ) : displayPosts.length > 0 ? (
          displayPosts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <EmptyState
            title="暂无帖子"
            description={query ? `未找到包含"${query}"的帖子` : "还没有人发帖，去发布第一条吧"}
            actionHref="/publish"
            actionLabel="去发布"
          />
        )}
      </div>
    </div>
  );
}
