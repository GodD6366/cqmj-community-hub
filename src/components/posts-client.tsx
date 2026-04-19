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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sourcePosts = hydrated ? posts : initialPosts;

  const filtered = useMemo(() => {
    const publicPosts = filterPublicPosts(sourcePosts);
    const matched = filterPosts(publicPosts, { category, query });
    return sortPosts(matched, sort);
  }, [category, query, sort, sourcePosts]);

  const totalPublic = useMemo(() => filterPublicPosts(sourcePosts).length, [sourcePosts]);
  const hasFilters = category !== "all" || sort !== "latest" || query.trim().length > 0;

  return (
    <PageShell className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="forum-sidebar min-w-0 xl:sticky xl:top-24 xl:self-start">
          <SectionCard className="overflow-hidden">
            <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">检索工具</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">搜索与筛选</h2>
                </div>
                <Button className="xl:hidden" onPress={() => setFiltersOpen((open) => !open)} size="sm" variant="secondary">
                  {filtersOpen ? "收起" : "展开"}
                </Button>
              </div>
            </Card.Header>
            <Card.Content className={filtersOpen ? "grid gap-4 p-4" : "hidden gap-4 p-4 xl:grid"}>
              <FilterBar
                category={category}
                onCategoryChange={setCategory}
                sort={sort}
                onSortChange={setSort}
                query={query}
                onQueryChange={setQuery}
              />
            </Card.Content>
          </SectionCard>

        </aside>

        <SectionCard className="overflow-hidden">
          <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-kicker">帖子广场</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {hasFilters ? `筛选结果 ${filtered.length} 条` : `全部公开帖子 ${totalPublic} 条`}
                </h1>
              </div>
              <Chip color="accent" size="sm" variant="soft">
                {category === "all" ? "全部频道" : "频道已锁定"}
              </Chip>
            </div>
          </Card.Header>
          <Card.Content className="p-0">
            {!hydrated ? (
              <div className="post-stream p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className="glass-card p-4">
                    <Skeleton className="h-5 w-28 rounded-full" />
                    <Skeleton className="mt-3 h-6 w-4/5 rounded-xl" />
                    <Skeleton className="mt-2 h-4 w-full rounded-xl" />
                    <Skeleton className="mt-2 h-4 w-3/4 rounded-xl" />
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 sm:px-5">
                <div className="forum-panel rounded-[1rem] border-dashed px-4 py-5 text-sm leading-7 text-slate-600">
                  当前筛选下没有匹配内容。可以换关键词、切回全部频道，或尝试不同排序方式。
                </div>
              </div>
            ) : (
              <div className="forum-list">
                {filtered.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </Card.Content>
        </SectionCard>
      </section>
    </PageShell>
  );
}
