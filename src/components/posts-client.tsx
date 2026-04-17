"use client";

import { useMemo, useState } from "react";
import { Button, Card, Chip, Skeleton } from "@heroui/react";
import { FilterBar } from "./filter-bar";
import { PostCard } from "./post-card";
import { useCommunityPosts } from "./community-provider";
import type { CommunityPost, PostCategory, SortMode } from "../lib/types";
import { filterPublicPosts } from "../lib/community-store";
import { filterPosts, sortPosts } from "../lib/utils";
import { PageShell, SectionCard } from "./ui";

export function PostsClient({
  initialPosts = [],
  initialCategory = "all",
  initialSort = "latest",
  initialQuery = "",
}: {
  initialPosts?: CommunityPost[];
  initialCategory?: PostCategory | "all";
  initialSort?: SortMode;
  initialQuery?: string;
}) {
  const { posts, hydrated } = useCommunityPosts();
  const [category, setCategory] = useState<PostCategory | "all">(initialCategory);
  const [sort, setSort] = useState<SortMode>(initialSort);
  const [query, setQuery] = useState(initialQuery);
  const sourcePosts = hydrated ? posts : initialPosts;

  const filtered = useMemo(() => {
    const publicPosts = filterPublicPosts(sourcePosts);
    const matched = filterPosts(publicPosts, { category, query });
    return sortPosts(matched, sort);
  }, [category, query, sort, sourcePosts]);

  const stats = useMemo(
    () => ({
      total: filterPublicPosts(sourcePosts).length,
      requests: sourcePosts.filter((post) => post.category === "request" && post.status === "published" && post.visibility !== "private").length,
      secondhand: sourcePosts.filter((post) => post.category === "secondhand" && post.status === "published" && post.visibility !== "private").length,
      discussions: sourcePosts.filter((post) => post.category === "discussion" && post.status === "published" && post.visibility !== "private").length,
    }),
    [sourcePosts],
  );

  const hasFilters = category !== "all" || sort !== "latest" || query.trim().length > 0;

  function resetFilters() {
    setCategory("all");
    setSort("latest");
    setQuery("");
  }

  return (
    <PageShell className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <FilterBar
            category={category}
            onCategoryChange={setCategory}
            sort={sort}
            onSortChange={setSort}
            query={query}
            onQueryChange={setQuery}
          />

          <SectionCard className="p-4">
            <Card.Header className="p-0">
              <Card.Title className="text-lg font-semibold text-slate-950">当前状态</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3 p-0 pt-4">
              <div className="route-card p-3">
                <div className="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">结果</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{filtered.length}</div>
                <div className="mt-1 text-xs text-slate-600">{hasFilters ? "已应用筛选条件" : "全量浏览模式"}</div>
              </div>
              <div className="route-card p-3">
                <div className="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">建议</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">先锁定频道，再决定用“最新”还是“精选”，信息噪音会少很多。</div>
              </div>
              {hasFilters ? (
                <Button onPress={resetFilters} variant="secondary">
                  重置筛选
                </Button>
              ) : null}
            </Card.Content>
          </SectionCard>
        </aside>

        <div className="space-y-4">
          <SectionCard className="overflow-hidden">
            <Card.Header className="border-b-2 border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="section-kicker">Feed Output</div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    {hasFilters ? `筛选结果 ${filtered.length} 条` : `全部公开帖子 ${stats.total} 条`}
                  </h2>
                </div>
                <Chip color="accent" variant="soft">
                  {sort === "latest" ? "按最新查看" : sort === "popular" ? "按热度查看" : "按精选查看"}
                </Chip>
              </div>
            </Card.Header>
            <Card.Content className="p-4">
              {!hydrated ? (
                filtered.length > 0 ? (
                  <div className="post-stream">
                    {filtered.slice(0, 6).map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="post-stream">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Card key={index} className="glass-card p-4">
                        <Skeleton className="h-5 w-28 rounded-full" />
                        <Skeleton className="mt-4 h-10 w-3/4 rounded-xl" />
                        <Skeleton className="mt-3 h-4 w-full rounded-xl" />
                        <Skeleton className="mt-2 h-4 w-5/6 rounded-xl" />
                      </Card>
                    ))}
                  </div>
                )
              ) : filtered.length === 0 ? (
                <div className="paper-panel rounded-[1rem] p-10 text-center text-sm leading-7 text-slate-600">
                  当前条件下没有匹配内容。换个关键词，或者回到全部频道。
                </div>
              ) : (
                <div className="post-stream">
                  {filtered.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </Card.Content>
          </SectionCard>
        </div>
      </section>
    </PageShell>
  );
}
