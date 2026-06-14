"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import type { PostCategory } from "@/lib/types";
import { categoryMeta } from "@/lib/types";
import { useCommunityPosts } from "./community-provider";
import { filterPublicPosts } from "@/lib/community-store";
import { ButtonLink } from "./ui";
import {
  CyberPanel,
  CyberStatGrid,
  EmptyState,
  ResidentFilterTabs,
  ResidentPageHeader,
  ResidentPanel,
  ResidentSearchBar,
} from "./resident-shared";
import { PostCard } from "./post-card";
import { filterPosts, sortPosts, uniquePosts } from "@/lib/utils";

export function PostsClient({
  initialCategory = "all",
  initialQuery = "",
  initialMode = "all",
}: {
  initialCategory?: PostCategory | "all";
  initialQuery?: string;
  initialMode?: "all" | "mine" | "favorites";
}) {
  const { currentUser, posts, hydrated } = useCommunityPosts();
  const [category, setCategory] = useState<PostCategory | "all">(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);

  const visiblePosts = useMemo(() => {
    if (initialMode === "mine" && currentUser) return uniquePosts(posts.filter((post) => post.isMine));
    if (initialMode === "favorites") return uniquePosts(filterPublicPosts(posts).filter((post) => post.favorited));
    return uniquePosts(filterPublicPosts(posts));
  }, [currentUser, initialMode, posts]);

  const filteredPosts = useMemo(() => sortPosts(filterPosts(visiblePosts, { category, query: deferredQuery }), "latest"), [category, deferredQuery, visiblePosts]);
  const categoryEntries = useMemo(() => Object.entries(categoryMeta) as Array<[PostCategory, (typeof categoryMeta)[PostCategory]]>, []);
  const categoryTabs = useMemo(
    () => [{ key: "all" as const, label: "全部" }, ...categoryEntries.map(([value, meta]) => ({ key: value, label: meta.badge }))],
    [categoryEntries],
  );

  return (
    <main className="page-shell">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_320px] gap-4">
        {/* 左侧主要内容 */}
        <div className="space-y-4">
          {/* 移动端专属 PageHeader：在 md:hidden 下显示 */}
          <div className="md:hidden">
            <ResidentPageHeader
              action={
                <ButtonLink className="min-w-0" href="/publish" size="sm">
                  发布
                </ButtonLink>
              }
              kicker="社区动态"
              subtitle="需求、闲置、交流、约玩统一查看"
              title="社区动态"
            />
          </div>

          {/* 搜索与过滤栏（共享） */}
          <div className="bg-white p-4 rounded-2xl border border-[var(--border)] space-y-4">
            <ResidentFilterTabs activeKey={category} items={categoryTabs} onChange={setCategory} />
            <ResidentSearchBar
              ariaLabel="搜索动态"
              placeholder="搜索标题 / 作者 / 标签"
              value={query}
              onChange={setQuery}
            />
          </div>

          {/* 帖子列表（共享） */}
          <div className="grid gap-3">
            {!hydrated ? (
              <div className="app-card p-6 text-sm text-[var(--muted)] text-center">加载中...</div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <EmptyState title="没有匹配的社区动态" actionHref="/publish" actionLabel="去发布" />
            )}
          </div>
        </div>

        {/* 右侧边栏：仅在桌面端显示 */}
        <div className="hidden md:grid gap-4 auto-rows-max">
          <CyberPanel title="列表统计" kicker="Summary">
            <CyberStatGrid
              columns={2}
              items={[
                {
                  label:
                    initialMode === "mine"
                      ? "我的内容"
                      : initialMode === "favorites"
                      ? "我的收藏"
                      : "公开动态",
                  value: hydrated ? String(visiblePosts.length) : "--",
                },
                { label: "筛选结果", value: hydrated ? String(filteredPosts.length) : "--" },
              ]}
            />
          </CyberPanel>
          <CyberPanel title="快捷入口" kicker="Actions">
            <div className="grid gap-2 text-sm">
              <Link href="/publish" className="app-shell-link !p-3">
                <span className="app-shell-link-copy">
                  <span className="app-shell-link-title">发布内容</span>
                  <span className="app-shell-link-meta">发帖、报修、投票</span>
                </span>
              </Link>
              <Link href="/neighbors" className="app-shell-link !p-3">
                <span className="app-shell-link-copy">
                  <span className="app-shell-link-title">投票</span>
                  <span className="app-shell-link-meta">参与社区投票</span>
                </span>
              </Link>
            </div>
          </CyberPanel>
        </div>
      </div>
    </main>
  );
}
