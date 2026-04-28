"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip } from "@heroui/react";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
import { useCommunityPosts } from "./community-provider";
import { PostEditor } from "./post-editor";
import { categoryMeta, visibilityMeta } from "../lib/types";
import type { PostDraft } from "../lib/types";
import { formatDateTime, timeAgo } from "../lib/utils";
import { EmptyState, ResidentAvatar } from "./resident-shared";

interface PostDetailClientProps {
  postId: string;
}

export function PostDetailClient({ postId }: PostDetailClientProps) {
  const router = useRouter();
  const { posts, addComment, toggleFavorite, reportPost, updatePost, deletePost, currentUser } = useCommunityPosts();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const post = useMemo(() => posts.find((item) => item.id === postId), [postId, posts]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [postId, post?.images.length]);

  if (!post) {
    return (
      <main className="page-shell pt-4 md:pt-6">
        <EmptyState
          title="帖子不存在"
          description="你访问的帖子可能已经删除、未登录，或者当前不可见。"
          actionHref="/neighbors"
          actionLabel="返回邻里"
        />
      </main>
    );
  }

  const meta = categoryMeta[post.category];
  const activeImage = post.images[activeImageIndex] ?? post.images[0] ?? null;
  const canManagePost = Boolean(currentUser && (post.isMine || currentUser.role === "admin"));
  const editDraft: PostDraft = {
    title: post.title,
    content: post.content,
    category: post.category,
    tags: post.tags,
    visibility: post.visibility,
    anonymous: post.authorName === "匿名居民",
    images: post.images,
  };

  if (editing) {
    return (
      <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
        <section className="flex flex-wrap items-center justify-between gap-3 px-1 md:px-0">
          <button
            type="button"
            className="text-sm font-semibold text-[var(--primary)]"
            onClick={() => setEditing(false)}
          >
            ← 返回帖子详情
          </button>
        </section>

        <PostEditor
          clearLabel="恢复原内容"
          editorDescription="修改标题、正文、分类、标签、可见范围和图片后保存。"
          editorTitle="编辑帖子"
          initialCategory={post.category}
          initialDraft={editDraft}
          persistDraft={false}
          submitLabel="保存修改"
          submittingLabel="保存中..."
          visibleCategories={["request", "secondhand", "discussion", "play"]}
          onSubmit={async (draft) => {
            await updatePost(post.id, draft);
            setEditing(false);
            setMessage("帖子已更新。");
          }}
        />
      </main>
    );
  }

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <section className="px-1 md:px-0">
        <Link href="/neighbors" className="text-sm font-semibold text-[var(--primary)]">
          ← 返回邻里
        </Link>
      </section>

      <article className="app-card overflow-hidden">
        <div className="app-gradient-card rounded-none px-4 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ResidentAvatar name={post.authorName} size="lg" tone="inverse" />
              <div>
                <div className="text-lg font-semibold">{post.authorName}</div>
                <div className="mt-1 text-sm text-white/70">{formatDateTime(post.createdAt)}</div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Chip color="accent" size="sm" variant="soft">
                {meta.label}
              </Chip>
              <Chip size="sm" variant="soft">
                {visibilityMeta[post.visibility].label}
              </Chip>
            </div>
          </div>

          {canManagePost ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onPress={() => {
                  setMessage("");
                  setEditing(true);
                }}
              >
                编辑
              </Button>
              <Button
                isPending={busy}
                size="sm"
                type="button"
                variant="ghost"
                onPress={async () => {
                  if (!window.confirm("确定删除这篇帖子？删除后评论、收藏和图片记录都会一并移除。")) {
                    return;
                  }
                  setBusy(true);
                  setMessage("");
                  try {
                    await deletePost(post.id);
                    router.push("/neighbors");
                  } catch (submitError) {
                    setMessage(submitError instanceof Error ? submitError.message : "删除失败");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                删除
              </Button>
            </div>
          ) : null}

          <h1 className="mt-5 text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.06em]">{post.title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/76">
            {timeAgo(post.createdAt)} · 评论 {post.commentCount} · 收藏 {post.favoriteCount}
          </p>
        </div>

        <div className="space-y-4 px-4 py-4 md:px-5 md:py-5">
          {activeImage ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-[1.3rem] bg-[var(--surface-muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured URLs are loaded from the existing object storage service. */}
                <img alt={post.title} className="max-h-[26rem] w-full object-cover" src={activeImage.url} />
              </div>
              {post.images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {post.images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      className={`overflow-hidden rounded-[1rem] border ${index === activeImageIndex ? "border-[var(--primary)]" : "border-[var(--separator)]"}`}
                      onClick={() => setActiveImageIndex(index)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured URLs are loaded from the existing object storage service. */}
                      <img alt={`${post.title} 缩略图 ${index + 1}`} className="h-20 w-20 object-cover" src={image.url} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="whitespace-pre-wrap text-[0.97rem] leading-8 text-slate-700">{post.content}</div>

          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[0.74rem] font-semibold text-[var(--primary)]">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
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
                } catch (submitError) {
                  setMessage(submitError instanceof Error ? submitError.message : "收藏失败");
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
                  setMessage("请先登录后再举报。");
                  return;
                }
                setBusy(true);
                setMessage("");
                try {
                  await reportPost(post.id);
                  setMessage("已收到举报，我们会尽快处理。");
                } catch (submitError) {
                  setMessage(submitError instanceof Error ? submitError.message : "举报失败");
                } finally {
                  setBusy(false);
                }
              }}
              variant="secondary"
            >
              举报内容
            </Button>
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

      <section className="space-y-3 xl:max-w-5xl">
        <div className="px-1 text-base font-semibold text-slate-950 md:px-0">评论 {post.comments.length}</div>
        <CommentList comments={post.comments} />
      </section>

      {currentUser ? (
        <CommentForm
          onSubmit={async (content) => {
            await addComment(post.id, { content });
            setMessage("评论已发布，列表已同步更新。");
          }}
        />
      ) : (
        <EmptyState
          title="登录后参与评论"
          description="需要先登录，才能继续回复邻居或补充进展。"
          actionHref={`/login?next=/posts/${post.id}`}
          actionLabel="去登录"
        />
      )}
    </main>
  );
}
