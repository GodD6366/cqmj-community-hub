"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip } from "@heroui/react";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
import { useCommunityPosts } from "./community-provider";
import { PostEditor } from "./post-editor";
import { EmptyState, ResidentAvatar, ResidentMetricGrid, ResidentMobileHero, ResidentMobilePanel } from "./resident-shared";
import { categoryMeta, visibilityMeta } from "../lib/types";
import type { PostDraft } from "../lib/types";
import { formatDateTime, timeAgo } from "../lib/utils";

interface PostDetailClientProps {
  postId: string;
}

export function PostDetailClient({ postId }: PostDetailClientProps) {
  const router = useRouter();
  const { posts, addComment, toggleFavorite, reportPost, updatePost, deletePost, currentUser } = useCommunityPosts();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
          actionHref="/neighbors"
          actionLabel="返回邻里"
        />
      </main>
    );
  }

  const meta = categoryMeta[post.category];
  const activeImage = post.images[activeImageIndex] ?? post.images[0] ?? null;
  const canManagePost = Boolean(currentUser && (post.isMine || currentUser.role === "admin"));
  const postIdValue = post.id;
  const editDraft: PostDraft = {
    title: post.title,
    content: post.content,
    category: post.category,
    tags: post.tags,
    visibility: post.visibility,
    anonymous: post.authorName === "匿名居民",
    images: post.images,
  };

  async function handleDelete() {
    if (!window.confirm("确定删除这篇帖子？删除后评论、收藏和图片记录都会一并移除。")) {
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");
    try {
      await deletePost(postIdValue);
      router.push("/neighbors");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleFavorite() {
    if (!currentUser) {
      setError("先登录再收藏。");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");
    try {
      const favorited = await toggleFavorite(postIdValue);
      setMessage(favorited ? "已收藏。" : "已取消收藏。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "收藏失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleReport() {
    if (!currentUser) {
      setError("先登录再举报。");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");
    try {
      await reportPost(postIdValue);
      setMessage("已提交举报。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "举报失败");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
        <div className="mobile-resident-only mobile-resident-stack">
          <ResidentMobilePanel delay="40ms">
            <button
              type="button"
              className="text-sm font-semibold text-[var(--primary)]"
              onClick={() => setEditing(false)}
            >
              ← 返回帖子详情
            </button>
          </ResidentMobilePanel>
        </div>

        <section className="hidden md:flex flex-wrap items-center justify-between gap-3 px-1 md:px-0">
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
          editorTitle="编辑帖子"
          initialCategory={post.category}
          initialDraft={editDraft}
          persistDraft={false}
          submitLabel="保存修改"
          submittingLabel="保存中..."
          visibleCategories={["request", "secondhand", "discussion", "play"]}
          onSubmit={async (draft) => {
            await updatePost(postIdValue, draft);
            setEditing(false);
            setError("");
            setMessage("帖子已更新。");
          }}
        />
      </main>
    );
  }

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <div className="mobile-resident-only mobile-resident-stack">
        <ResidentMobileHero
          background="radial-gradient(circle at 16% 18%, rgba(237,170,92,0.3), transparent 24%), radial-gradient(circle at 84% 12%, rgba(96,188,255,0.22), transparent 22%), linear-gradient(160deg, #1a2034 0%, #24405f 46%, #315f88 100%)"
        >
          <Link href="/neighbors" className="inline-flex text-sm font-semibold text-white/82">
            ← 返回邻里
          </Link>

          <div className="mt-5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <ResidentAvatar name={post.authorName} size="lg" tone="inverse" />
              <div className="min-w-0">
                <div className="mobile-resident-kicker text-white/72">帖子详情</div>
                <div className="mt-3 text-lg font-semibold text-white">{post.authorName}</div>
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

          <h1 className="mobile-resident-title mt-5 max-w-[10ch]">{post.title}</h1>

          <ResidentMetricGrid
            className="mt-5"
            columns={3}
            items={[
              { label: "评论", value: String(post.commentCount).padStart(2, "0") },
              { label: "收藏", value: String(post.favoriteCount).padStart(2, "0") },
              { label: "图片", value: String(post.images.length).padStart(2, "0") },
            ]}
            tone="inverse"
          />

          {canManagePost ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onPress={() => {
                  setMessage("");
                  setError("");
                  setEditing(true);
                }}
              >
                编辑
              </Button>
              <Button isPending={busy} size="sm" type="button" variant="ghost" onPress={handleDelete}>
                删除
              </Button>
            </div>
          ) : null}
        </ResidentMobileHero>

        <ResidentMobilePanel delay="120ms">
          <div className="mobile-resident-kicker text-[#315d8f]">正文</div>
          <h2 className="mobile-resident-panel-title">内容</h2>

          <div className="mt-4 space-y-4">
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
              <Button isPending={busy} onPress={handleFavorite}>
                {post.favorited ? "已收藏" : "收藏"} · {post.favoriteCount}
              </Button>
              <Button isPending={busy} onPress={handleReport} variant="secondary">
                举报
              </Button>
            </div>
          </div>
        </ResidentMobilePanel>

        <ResidentMobilePanel delay="200ms">
          <div className="mobile-resident-kicker text-[#2d8e94]">评论</div>
          <h2 className="mobile-resident-panel-title">评论</h2>

          <div className="mt-4 space-y-3">
            <CommentList comments={post.comments} />
          </div>
        </ResidentMobilePanel>
      </div>

      <div className="hidden md:block">
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
                    setError("");
                    setEditing(true);
                  }}
                >
                  编辑
                </Button>
                <Button isPending={busy} size="sm" type="button" variant="ghost" onPress={handleDelete}>
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
              <Button isPending={busy} onPress={handleFavorite}>
                {post.favorited ? "已收藏" : "收藏"} · {post.favoriteCount}
              </Button>
              <Button isPending={busy} onPress={handleReport} variant="secondary">
                举报内容
              </Button>
            </div>
          </div>
        </article>

        <section className="space-y-3 xl:max-w-5xl">
          <div className="px-1 text-base font-semibold text-slate-950 md:px-0">评论 {post.comments.length}</div>
          <CommentList comments={post.comments} />
        </section>
      </div>

      {message ? (
        <Alert status="success">
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {currentUser ? (
        <CommentForm
          onSubmit={async (content) => {
            await addComment(postIdValue, { content });
            setError("");
            setMessage("评论已发布。");
          }}
        />
      ) : (
        <EmptyState
          title="登录后参与评论"
          actionHref={`/login?next=/posts/${postIdValue}`}
          actionLabel="去登录"
        />
      )}
    </main>
  );
}
