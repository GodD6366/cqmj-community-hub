"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Input } from "@heroui/react";
import type { PostCategory } from "@/lib/types";
import { categoryMeta } from "@/lib/types";
import { useCommunityPosts } from "./community-provider";
import { filterPublicPosts } from "@/lib/community-store";
import { CyberPanel, CyberStatGrid, EmptyState } from "./resident-shared";
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

  return (
    <main className="page-shell space-y-4 md:space-y-5">
      <section className="terminal-mobile-root md:!hidden">
        <div className="terminal-hero-card">
          <div className="terminal-page-head">
            <div>
              <div className="terminal-kicker">社区终端</div>
              <h1 className="terminal-page-title">社区动态</h1>
              <p className="terminal-page-subtitle">需求、闲置、交流、约玩统一查看</p>
            </div>
            <Link href="/publish" className="terminal-icon-button" aria-label="发布内容">＋</Link>
          </div>
          <div className="terminal-search-shell mt-4">
            <Input aria-label="搜索动态" className="flex-1" placeholder="搜索标题 / 作者 / 标签" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="terminal-filter-row mt-4">
            <button type="button" className={`terminal-filter-pill ${category === "all" ? "is-active" : ""}`} onClick={() => setCategory("all")}>全部</button>
            {categoryEntries.map(([value, meta]) => <button key={value} type="button" className={`terminal-filter-pill ${category === value ? "is-active" : ""}`} onClick={() => setCategory(value)}>{meta.badge}</button>)}
          </div>
        </div>

        <div className="space-y-3">
          {!hydrated ? <div className="terminal-panel text-sm text-[var(--muted)]">加载中...</div> : filteredPosts.length > 0 ? filteredPosts.map((post) => <PostCard key={post.id} post={post} compact />) : <EmptyState title="没有匹配的社区动态" actionHref="/publish" actionLabel="去发布" />}
        </div>
      </section>

      <section className="hidden md:grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <CyberPanel title="社区动态" kicker="Posts Feed">
          <div className="flex gap-2 overflow-x-auto pb-3">
            <button type="button" className={`rounded-full px-3 py-1.5 text-[0.82rem] font-semibold ${category === "all" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border border-[var(--border)] text-[var(--muted)]"}`} onClick={() => setCategory("all")}>全部</button>
            {categoryEntries.map(([value, meta]) => <button key={value} type="button" className={`rounded-full px-3 py-1.5 text-[0.82rem] font-semibold ${category === value ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border border-[var(--border)] text-[var(--muted)]"}`} onClick={() => setCategory(value)}>{meta.badge}</button>)}
          </div>
          <Input aria-label="搜索动态" placeholder="搜索标题 / 作者 / 标签" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="mt-4 grid gap-3">
            {!hydrated ? <div className="app-card-muted p-4 text-sm text-[var(--muted)]">加载中...</div> : filteredPosts.length > 0 ? filteredPosts.map((post) => <PostCard key={post.id} post={post} />) : <EmptyState title="没有匹配的社区动态" actionHref="/publish" actionLabel="去发布" />}
          </div>
        </CyberPanel>

        <div className="grid gap-4">
          <CyberPanel title="列表统计" kicker="Summary">
            <CyberStatGrid columns={2} items={[
              { label: initialMode === "mine" ? "我的内容" : initialMode === "favorites" ? "我的收藏" : "公开动态", value: hydrated ? String(visiblePosts.length) : "--" },
              { label: "筛选结果", value: hydrated ? String(filteredPosts.length) : "--" },
            ]} />
          </CyberPanel>
          <CyberPanel title="快捷入口" kicker="Actions">
            <div className="grid gap-2 text-sm">
              <Link href="/publish" className="app-shell-link !p-3"><span className="app-shell-link-copy"><span className="app-shell-link-title">发布内容</span><span className="app-shell-link-meta">发帖、报修、投票</span></span></Link>
              <Link href="/neighbors" className="app-shell-link !p-3"><span className="app-shell-link-copy"><span className="app-shell-link-title">投票</span><span className="app-shell-link-meta">参与社区投票</span></span></Link>
            </div>
          </CyberPanel>
        </div>
      </section>
    </main>
  );
}
