"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Breadcrumbs, Button, Card, Chip } from "@heroui/react";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
import { useCommunityPosts } from "./community-provider";
import { categoryMeta, visibilityMeta } from "../lib/types";
import { formatDateTime, getPostBadge, timeAgo } from "../lib/utils";
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
    <PageShell className="space-y-4">
      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <article className="glass-card overflow-hidden rounded-[1rem]">
          <div className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-4 sm:px-5">
            <Breadcrumbs>
              <Breadcrumbs.Item href="/">首页</Breadcrumbs.Item>
              <Breadcrumbs.Item href="/posts">帖子广场</Breadcrumbs.Item>
              <Breadcrumbs.Item>{meta.label}</Breadcrumbs.Item>
            </Breadcrumbs>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Chip color="accent" size="sm" variant="primary">
                {getPostBadge(post.category)}
              </Chip>
              <Chip size="sm" variant="soft">
                {visibilityMeta[post.visibility].label}
              </Chip>
              {post.pinned ? (
                <Chip color="danger" size="sm" variant="soft">
                  置顶
                </Chip>
              ) : null}
              {post.featured ? (
                <Chip color="warning" size="sm" variant="soft">
                  精选
                </Chip>
              ) : null}
            </div>

            <h1 className="mt-4 text-[1.95rem] font-semibold leading-tight tracking-tight text-slate-950 sm:text-[2.4rem]">
              {post.title}
            </h1>

            <div className="forum-meta mt-3">
              <span>作者 {post.authorName}</span>
              <span>{formatDateTime(post.createdAt)}</span>
              <span>{timeAgo(post.createdAt)}</span>
              <span>{post.commentCount} 评论</span>
              <span>{post.favoriteCount} 收藏</span>
            </div>
          </div>

          <div className="space-y-5 px-4 py-5 sm:px-5">
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

            <div className="flex flex-col gap-3 border-t border-[var(--separator)] pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  isPending={busy}
                  onPress={async () => {
                    if (!currentUser) {
                      setMessage("请先登录后再收藏。");
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
                  size="sm"
                >
                  {post.favorited ? "已收藏" : "收藏"} · {post.favoriteCount}
                </Button>
                <Button
                  isPending={busy}
                  onPress={async () => {
                    if (!currentUser) {
                      setMessage("请先登录后再举报。");
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
                  size="sm"
                  variant="secondary"
                >
                  举报
                </Button>
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
        </article>

        <aside className="forum-sidebar order-last lg:sticky lg:top-24 lg:self-start">
          <SectionCard className="overflow-hidden">
            <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3">
              <Card.Title className="text-lg font-semibold text-slate-950">帖子信息</Card.Title>
            </Card.Header>
            <Card.Content className="grid gap-3 p-4 text-sm text-slate-700">
              <div className="forum-panel rounded-[1rem] px-3 py-3">
                <div className="text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">分类</div>
                <div className="mt-1 font-semibold text-slate-900">{meta.label}</div>
              </div>
              <div className="forum-panel rounded-[1rem] px-3 py-3">
                <div className="text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">可见范围</div>
                <div className="mt-1 font-semibold text-slate-900">{visibilityMeta[post.visibility].label}</div>
              </div>
              <div className="forum-panel rounded-[1rem] px-3 py-3">
                <div className="text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">更新时间</div>
                <div className="mt-1 font-semibold text-slate-900">{formatDateTime(post.updatedAt)}</div>
              </div>
              <div className="forum-panel rounded-[1rem] px-3 py-3">
                <div className="text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">互动统计</div>
                <div className="mt-1 font-semibold text-slate-900">{post.commentCount} 条评论 · {post.favoriteCount} 次收藏</div>
              </div>
            </Card.Content>
          </SectionCard>
        </aside>
      </section>

      <section className="space-y-4">
        <SectionCard className="overflow-hidden">
          <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3">
            <div>
              <p className="section-kicker">评论区</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">邻居们的补充与回应</h2>
            </div>
          </Card.Header>
          <Card.Content className="p-4">
            <CommentList comments={post.comments} />
          </Card.Content>
        </SectionCard>

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
      </section>
    </PageShell>
  );
}
