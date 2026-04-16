
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterBar } from "./filter-bar";
import { PostCard } from "./post-card";
import { useCommunityPosts } from "./community-provider";
import type { PostCategory, SortMode } from "../lib/types";
import { filterPublicPosts } from "../lib/community-store";
import { filterPosts, sortPosts } from "../lib/utils";

export function PostsClient() {
  const { posts, hydrated } = useCommunityPosts();
  const [category, setCategory] = useState<PostCategory | "all">("all");
  const [sort, setSort] = useState<SortMode>("latest");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const publicPosts = filterPublicPosts(posts);
    const matched = filterPosts(publicPosts, { category, query });
    return sortPosts(matched, sort);
  }, [category, posts, query, sort]);

  const stats = useMemo(
    () => ({
      total: filterPublicPosts(posts).length,
      requests: posts.filter((post) => post.category === "request" && post.status === "published" && post.visibility !== "private").length,
      secondhand: posts.filter((post) => post.category === "secondhand" && post.status === "published" && post.visibility !== "private").length,
      discussions: posts.filter((post) => post.category === "discussion" && post.status === "published" && post.visibility !== "private").length,
    }),
    [posts],
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium text-slate-500">帖子广场</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">需求、闲置和交流，一页看完</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              你可以按类别、关键词和热度筛选帖子。后续接入数据库后，这里可以无缝切换到真实数据源。
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">共 {stats.total} 条</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">需求 {stats.requests} 条</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">闲置 {stats.secondhand} 条</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">交流 {stats.discussions} 条</span>
            </div>
          </div>

          <FilterBar
            category={category}
            onCategoryChange={setCategory}
            sort={sort}
            onSortChange={setSort}
            query={query}
            onQueryChange={setQuery}
          />

          {!hydrated ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              正在加载本地社区数据...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              没有找到符合条件的帖子，换个关键词试试。
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">快捷入口</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">有事先发帖</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              需求、闲置、交流三种类型已经够第一版跑通。先把规则和秩序立住，后面再谈更复杂的能力。
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/publish" className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white">
                去发布
              </Link>
              <Link href="/rules" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-medium text-slate-700">
                看社区规则
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-medium text-slate-300">治理提醒</p>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-200">
              <li>• 闲置交易优先自提，平台不做担保</li>
              <li>• 敏感求助默认走私密范围</li>
              <li>• 违规内容先举报再处理</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
