"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Breadcrumbs, Button, Card, Chip } from "@heroui/react";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
import { useCommunityPosts } from "./community-provider";
import { categoryMeta, visibilityMeta } from "../lib/types";
import { formatDateTime, getPostBadge, getVisibilityLabel, timeAgo } from "../lib/utils";
import { ButtonLink, PageShell, SectionCard, TextLink } from "./ui";

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
      <PageShell className="max-w-4xl py-6">
        <SectionCard className="p-8 text-center">
          <Card.Title className="text-2xl font-semibold tracking-tight text-slate-900">帖子不存在</Card.Title>
          <Card.Description className="mt-3 text-sm leading-7 text-slate-600">你访问的帖子可能已经删除、未登录，或者当前不可见。</Card.Description>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/posts">返回帖子列表</ButtonLink>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  const meta = categoryMeta[post.category];

  return (
    <PageShell className="max-w-6xl">
      <div className="space-y-4">
        <section className="glass-card overflow-hidden rounded-[1rem]">
          <div className="border-b-2 border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-4 sm:px-6 sm:py-5">
            <Breadcrumbs>
              <Breadcrumbs.Item href="/">首页</Breadcrumbs.Item>
              <Breadcrumbs.Item href="/posts">帖子广场</Breadcrumbs.Item>
              <Breadcrumbs.Item>{meta.label}</Breadcrumbs.Item>
            </Breadcrumbs>

            <div className="mt-5 grid gap-5 lg:grid-cols-[8rem_minmax(0,1fr)_14rem] lg:items-start">
              <div className="route-card p-3">
                <div className="text-[11px] font-bold tracking-[0.18em] text-slate-500 uppercase">板块</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip color="accent" variant="primary">{getPostBadge(post.category)}</Chip>
                </div>
                <div className="mt-3 text-xs text-slate-600">{getVisibilityLabel(post.visibility)}</div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  {post.pinned ? <Chip color="danger" variant="soft">置顶</Chip> : null}
                  {post.featured ? <Chip color="warning" variant="soft">精选</Chip> : null}
                  <span>{timeAgo(post.createdAt)}</span>
                </div>

                <h1 className="editorial-title mt-4 text-[2.4rem] leading-[0.94] font-semibold text-slate-950 sm:text-[4rem]">{post.title}</h1>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  由 <span className="font-semibold text-slate-900">{post.authorName}</span> 发布于 {formatDateTime(post.createdAt)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="route-card p-3">
                  <div className="text-[11px] font-bold tracking-[0.18em] text-slate-500 uppercase">评论</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{post.commentCount}</div>
                </div>
                <div className="route-card p-3">
                  <div className="text-[11px] font-bold tracking-[0.18em] text-slate-500 uppercase">收藏</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{post.favoriteCount}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
            {post.status !== "published" ? (
              <Alert status="warning">
                <Alert.Content>
                  <Alert.Description>当前帖子状态为「{post.status === "pending" ? "审核中" : "已拒绝"}」，普通用户可见内容会受限。</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <div className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700 sm:text-base">{post.content}</div>

            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Chip key={tag} size="sm" variant="secondary">
                  #{tag}
                </Chip>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t-2 border-[var(--border-strong)] pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  isPending={busy}
                  onPress={async () => {
                    if (!currentUser) {
                      setMessage("请先登录后再收藏。点击右上角登录。");
                      return;
                    }
                    setBusy(true);
                    setMessage("");
                    try {
                      const favorited = await toggleFavorite(post.id);
                      setMessage(favorited ? "已收藏到你的账号下。" : "已取消收藏。");
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "收藏失败");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {post.favorited ? "已收藏" : "收藏"} · {post.favoriteCount}
                </Button>
                <Button
                  isPending={busy}
                  onPress={async () => {
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
                  variant="secondary"
                >
                  举报
                </Button>
                <Chip variant="soft">评论 {post.commentCount}</Chip>
              </div>
              <TextLink href="/posts">返回广场</TextLink>
            </div>

            {message ? (
              <Alert status="success">
                <Alert.Content>
                  <Alert.Description>{message}</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="space-y-4">
            <SectionCard className="p-5">
              <Card.Header className="p-0">
                <div>
                  <p className="section-kicker">评论区</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">邻居们怎么看？</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">补充信息、确认交易或继续追问，都放在这里按时间往下看。</p>
                </div>
              </Card.Header>
            </SectionCard>
            <CommentList comments={post.comments} />
            {currentUser ? (
              <CommentForm
                onSubmit={async (content) => {
                  await addComment(post.id, { content });
                  setMessage("评论已发布，列表已同步更新。");
                }}
              />
            ) : (
              <div className="paper-panel rounded-[1.35rem] border border-dashed p-6 text-sm leading-6 text-slate-600">
                需要先 <Link href="/login" className="font-semibold text-[var(--primary)] underline underline-offset-4">登录</Link> 才能发表评论。
              </div>
            )}
          </div>

          <aside className="order-first space-y-4 lg:order-last lg:sticky lg:top-24">
            <SectionCard className="p-5">
              <Card.Header className="p-0">
                <Card.Title className="text-lg font-semibold text-slate-950">帖子信息</Card.Title>
              </Card.Header>
              <Card.Content className="space-y-3 p-0 pt-4 text-sm text-slate-700">
                <div className="rounded-[1.15rem] bg-[var(--surface-muted)] p-3.5">
                  <div className="text-xs font-medium tracking-[0.12em] text-slate-500 uppercase">分类</div>
                  <div className="mt-1 font-semibold text-slate-900">{meta.label}</div>
                </div>
                <div className="rounded-[1.15rem] bg-[var(--surface-muted)] p-3.5">
                  <div className="text-xs font-medium tracking-[0.12em] text-slate-500 uppercase">可见范围</div>
                  <div className="mt-1 font-semibold text-slate-900">{visibilityMeta[post.visibility].label}</div>
                </div>
                <div className="rounded-[1.15rem] bg-[var(--surface-muted)] p-3.5">
                  <div className="text-xs font-medium tracking-[0.12em] text-slate-500 uppercase">更新时间</div>
                  <div className="mt-1 font-semibold text-slate-900">{formatDateTime(post.updatedAt)}</div>
                </div>
                <div className="rounded-[1.15rem] bg-[var(--surface-muted)] p-3.5">
                  <div className="text-xs font-medium tracking-[0.12em] text-slate-500 uppercase">互动</div>
                  <div className="mt-1 font-semibold text-slate-900">{post.commentCount} 条评论 · {post.favoriteCount} 次收藏</div>
                </div>
              </Card.Content>
            </SectionCard>

            <SectionCard className="p-5">
              <Card.Header className="p-0">
                <Card.Title className="text-lg font-semibold text-slate-950">浏览建议</Card.Title>
              </Card.Header>
              <Card.Content className="p-0 pt-4">
                <ul className="bullet-list text-sm leading-6 text-slate-700">
                  <li>交易或求助的最新进展，优先在评论里补充。</li>
                  <li>需要更小范围沟通时，可以重新发一条更精准可见的帖子。</li>
                  <li>遇到明显违规内容，直接使用举报入口更高效。</li>
                </ul>
              </Card.Content>
            </SectionCard>
          </aside>
        </section>
      </div>
    </PageShell>
  );
}
