"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
import { useCommunityPosts } from "./community-provider";
import { categoryMeta, visibilityMeta } from "../lib/types";
import { formatDateTime, getPostBadge, getVisibilityLabel, timeAgo } from "../lib/utils";

interface PostDetailClientProps {
  postId: string;
}

export function PostDetailClient({ postId }: PostDetailClientProps) {
  const { posts, addComment, toggleFavorite, reportPost, currentUser } = useCommunityPosts();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const post = useMemo(() => posts.find((item) => item.id === postId), [postId, posts]);

  if (!post) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">帖子不存在</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">你访问的帖子可能已经删除、未登录，或者当前不可见。</p>
          <Link href="/posts" className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            返回帖子列表
          </Link>
        </div>
      </main>
    );
  }

  const meta = categoryMeta[post.category];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">{getPostBadge(post.category)}</span>
            {post.pinned ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">置顶</span> : null}
            {post.featured ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">精选</span> : null}
            <span>{getVisibilityLabel(post.visibility)}</span>
            <span>·</span>
            <span>{timeAgo(post.createdAt)}</span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{post.title}</h1>
          <p className="mt-3 text-sm text-slate-500">
            作者：{post.authorName} · 发布于 {formatDateTime(post.createdAt)}
          </p>

          {post.status !== "published" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              当前帖子状态为「{post.status === "pending" ? "审核中" : "已拒绝"}」，普通用户可见内容会受限。
            </div>
          ) : null}

          <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">{post.content}</div>

          <div className="mt-5 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={async () => {
                if (!currentUser) {
                  setMessage("请先登录后再收藏。点击右上角登录。");
                  return;
                }
                setBusy(true);
                setMessage("");
                try {
                  await toggleFavorite(post.id);
                  setMessage(post.favorited ? "已取消收藏" : "已收藏到你的账号下。");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "收藏失败");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {post.favorited ? "已收藏" : "收藏"} · {post.favoriteCount}
            </button>
            <button
              onClick={async () => {
                if (!currentUser) {
                  setMessage("请先登录后再举报。点击右上角登录。");
                  return;
                }
                setBusy(true);
                try {
                  await reportPost(post.id);
                  setMessage("已收到举报，我们会尽快处理。");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "举报失败");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              举报
            </button>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">评论 {post.commentCount}</span>
          </div>

          {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">评论区</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">邻居们怎么看？</h2>
            </div>
            <CommentList comments={post.comments} />
            {currentUser ? (
              <CommentForm
                onSubmit={async (content) => {
                  await addComment(post.id, { content });
                  setMessage("评论已发布，列表已同步更新。");
                }}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
                需要先 <Link href="/login" className="font-medium text-slate-900 underline underline-offset-4">登录</Link> 才能发表评论。
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">帖子信息</p>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-slate-500">分类</div>
                  <div className="font-medium">{meta.label}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-slate-500">可见范围</div>
                  <div className="font-medium">{visibilityMeta[post.visibility].label}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-slate-500">更新时间</div>
                  <div className="font-medium">{formatDateTime(post.updatedAt)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-slate-500">互动</div>
                  <div className="font-medium">
                    {post.commentCount} 条评论 · {post.favoriteCount} 次收藏
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <p className="text-sm font-medium text-slate-300">下一步</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                后续接入数据库后，这里可以继续扩展：站内消息、审核流、楼栋范围与交易状态。
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
