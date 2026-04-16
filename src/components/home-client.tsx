
"use client";

import Link from "next/link";
import { communityRules } from "../lib/mock-data";
import { categoryMeta } from "../lib/types";
import { filterPublicPosts } from "../lib/community-store";
import { sortPosts, timeAgo } from "../lib/utils";
import { PostCard } from "./post-card";
import { useCommunityPosts } from "./community-provider";

const modules = [
  {
    key: "request" as const,
    title: "发布需求",
    action: "找家政、找维修、找拼车、找推荐。",
  },
  {
    key: "secondhand" as const,
    title: "卖闲置",
    action: "二手转让、免费送、以物换物。",
  },
  {
    key: "discussion" as const,
    title: "发帖交流",
    action: "公告、反馈、经验分享、邻里讨论。",
  },
];

export function HomeClient() {
  const { posts, hydrated } = useCommunityPosts();
  const publicPosts = sortPosts(filterPublicPosts(posts), "featured").slice(0, 4);

      const liveStats = [
        { label: "当前帖子", value: String(filterPublicPosts(posts).length) },
        { label: "需求帖", value: String(posts.filter((post) => post.category === "request" && post.status === "published" && post.visibility !== "private").length) },
        { label: "闲置帖", value: String(posts.filter((post) => post.category === "secondhand" && post.status === "published" && post.visibility !== "private").length) },
        { label: "交流帖", value: String(posts.filter((post) => post.category === "discussion" && post.status === "published" && post.visibility !== "private").length) },
      ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            面向单个小区的生活服务社区
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            把需求、闲置和交流，放到一个真正邻里可用的网站里。
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            先把核心场景跑通：发需求、卖闲置、发帖子。后续再接数据库、登录、图片上传和物业后台。
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/publish" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700">
              立即发布
            </Link>
            <Link href="/posts" className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              浏览帖子
            </Link>
            <Link href="/rules" className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              社区规则
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {liveStats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm font-medium text-slate-300">MVP 重点</p>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-200">
            <li>1. 需求 / 闲置 / 交流三种发帖类型</li>
            <li>2. 可筛选的帖子流和详情页</li>
            <li>3. 评论、收藏、举报、规则说明</li>
            <li>4. 后续平滑接入数据库和权限系统</li>
          </ul>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">产品建议</p>
            <p className="mt-2 text-sm leading-6 text-white/90">
              社区产品的关键不是多，而是“可信 + 有用 + 好治理”。先把这三件事做好。
            </p>
          </div>
        </aside>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {modules.map((module) => {
          const meta = categoryMeta[module.key];
          return (
            <article key={module.key} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${meta.accent}`} />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{module.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{meta.description}</p>
              <p className="mt-3 text-sm font-medium text-slate-700">{module.action}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">首页动态</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">最近发布</h2>
            </div>
            <Link href="/posts" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              查看全部
            </Link>
          </div>

          {!hydrated ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              正在加载本地社区数据...
            </div>
          ) : publicPosts.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              还没有公开帖子，先从发布页发第一条吧。
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {publicPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium text-slate-500">推荐的社区规则</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">先把秩序立住</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
              {communityRules.map((rule) => (
                <div key={rule.title} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{rule.title}</p>
                  <ul className="mt-2 space-y-2">
                    {rule.points.map((point) => (
                      <li key={point}>• {point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium text-slate-500">最近活跃</p>
            <div className="mt-4 space-y-3">
              {publicPosts.slice(0, 3).map((post) => (
                <div key={post.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-900">{post.title}</span>
                    <span className="text-slate-500">{timeAgo(post.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{post.authorName} · {post.commentCount} 条评论</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
