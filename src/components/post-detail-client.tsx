"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Chip, TextArea } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { PostEditor } from "./post-editor";
import { MarkdownRenderer } from "./markdown-renderer";
import { EmptyState, Toast, useToast } from "./resident-shared";
import { categoryMeta, visibilityMeta } from "../lib/types";
import type { PostAttachment, PostDraft } from "../lib/types";
import { formatDateTime, timeAgo, copyToClipboard } from "../lib/utils";

interface PostDetailClientProps { postId: string; }

type CommentSort = "hot" | "new";

function formatAttachmentSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(sizeBytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))}KB`;
}

function AttachmentList({ attachments }: { attachments: PostAttachment[] }) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="post-attachments">
      <div className="post-attachments-title">附件</div>
      <div className="post-attachments-list">
        {attachments.map((attachment) => (
          <a
            key={attachment.id}
            className="post-attachment-item"
            href={attachment.url}
            rel="noreferrer"
            target="_blank"
          >
            <span className="post-attachment-icon" aria-hidden="true">
              FILE
            </span>
            <span className="min-w-0 flex-1">
              <span className="post-attachment-name">{attachment.filename}</span>
              <span className="post-attachment-meta">
                {formatAttachmentSize(attachment.sizeBytes)} · 点击打开或下载
              </span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── 图片灯箱组件 ─────────────────────────────────── */
function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: { id: string; url: string; width?: number; height?: number }[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);

  // 键盘控制
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  // 锁定背景滚动
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const img = images[index];

  return (
    <div
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx > 50) prev();
        else if (dx < -50) next();
        touchStartX.current = null;
      }}
    >
      {/* 关闭按钮 */}
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* 计数器 */}
      {images.length > 1 && (
        <div className="lightbox-counter">{index + 1} / {images.length}</div>
      )}

      {/* 主图 */}
      <div
        className="lightbox-img-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt={`图片 ${index + 1}`}
          className="lightbox-img"
          draggable={false}
        />
      </div>

      {/* 左右切换按钮 */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="lightbox-nav lightbox-nav--prev"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="上一张"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className="lightbox-nav lightbox-nav--next"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="下一张"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* 缩略图栏 */}
      {images.length > 1 && (
        <div className="lightbox-thumbs" onClick={(e) => e.stopPropagation()}>
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              className={`lightbox-thumb ${i === index ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`切换到第 ${i + 1} 张`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={`缩略图 ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 主组件 ──────────────────────────────────────── */
export function PostDetailClient({ postId }: PostDetailClientProps) {
  const router = useRouter();
  const { posts, addComment, updateComment, toggleFavorite, reportPost, updatePost, deletePost, currentUser, refresh } = useCommunityPosts();
  const { toast, show: showToast } = useToast();
  const setMessage = (msg: string) => { if (msg) showToast(msg, "success"); };
  const setError = (msg: string) => { if (msg) showToast(msg, "error"); };
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSort, setCommentSort] = useState<CommentSort>("hot");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [following, setFollowing] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [sharing, setSharing] = useState(false);
  const postListHref = "/posts";

  const post = useMemo(() => posts.find((item) => item.id === postId), [postId, posts]);

  const navigateBackOrFallback = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(postListHref);
  }, [router]);

  useEffect(() => { setActiveImageIndex(0); }, [postId, post?.images.length]);

  // 检查关注状态
  useEffect(() => {
    if (!currentUser || !post?.authorId || post.isMine) {
      setFollowing(false);
      return;
    }
    fetch(`/api/users/${post.authorId}/follow`)
      .then((res) => res.json())
      .then((data) => setFollowing(data.following))
      .catch(() => setFollowing(false));
  }, [currentUser, post?.authorId, post?.isMine]);

  // 排序后的评论
  const sortedComments = useMemo(() => {
    if (!post) return [];
    const list = [...post.comments];
    if (commentSort === "new") {
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    // 最热：优先显示新的（暂无点赞数据，按时间倒序兜底）
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [post, commentSort]);

  if (!post) return <main className="page-shell"><EmptyState title="帖子不存在" actionHref={postListHref} actionLabel="返回动态" /><Toast toast={toast} /></main>;

  const meta = categoryMeta[post.category];
  const activeImage = post.images[activeImageIndex] ?? post.images[0] ?? null;
  const canManagePost = Boolean(currentUser && (post.isMine || currentUser.role === "admin"));
  const postIdValue = post.id;
  const editDraft: PostDraft = { title: post.title, content: post.content, category: post.category, tags: post.tags, visibility: post.visibility, anonymous: post.authorName === "匿名居民", images: post.images, attachments: post.attachments };

  async function handleDelete() {
    if (!window.confirm("确定删除这篇帖子？删除后评论、收藏和图片记录都会一并移除。")) return;
    setBusy(true); setMessage(""); setError("");
    try { await deletePost(postIdValue); navigateBackOrFallback(); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "删除失败"); } finally { setBusy(false); }
  }
  async function handleFavorite() {
    if (!currentUser) { setError("先登录再收藏。"); return; }
    setBusy(true); setMessage(""); setError("");
    try { const favorited = await toggleFavorite(postIdValue); setMessage(favorited ? "已收藏。" : "已取消收藏。"); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "收藏失败"); } finally { setBusy(false); }
  }
  async function handleReport() {
    if (!currentUser) { setError("先登录再举报。"); return; }
    setBusy(true); setMessage(""); setError("");
    try { await reportPost(postIdValue); setMessage("已提交举报。"); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "举报失败"); } finally { setBusy(false); }
  }
  async function handleFollow() {
    if (!currentUser || !post) { setError("先登录再关注。"); return; }
    if (!post.authorId || post.isMine) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/users/${post.authorId}/follow`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "操作失败");
      setFollowing(data.following);
      setMessage(data.following ? "已关注。" : "已取消关注。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "关注失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleNotifyMatch(matchId: string) {
    if (!currentUser) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/posts/${postIdValue}/notify-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "通知失败");
      setMessage("已通知邻居，请耐心等待回复。");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "通知失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommentSubmit() {
    if (!currentUser) { setError("请先登录"); return; }
    if (!commentContent.trim()) { setError("请填写评论内容"); return; }
    setIsSubmittingComment(true); setError("");
    try {
      await addComment(postId, { content: commentContent.trim() });
      setCommentContent(""); setMessage("评论已发布。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "评论发布失败");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleCommentEditSubmit() {
    if (!currentUser || !editingCommentId) {
      return;
    }
    if (!editingCommentContent.trim()) {
      setError("请填写评论内容");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      await updateComment(postId, editingCommentId, { content: editingCommentContent.trim() });
      setEditingCommentId(null);
      setEditingCommentContent("");
      setMessage("评论已更新。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "评论修改失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (typeof window === "undefined" || !post) {
      return;
    }

    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || window.location.origin;
    const url = `${origin}/posts/${postIdValue}`;
    const shareData = {
      title: post.title,
      url,
    };

    setSharing(true); setError(""); setMessage("");
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setMessage("分享成功。");
        return;
      }

      const copied = await copyToClipboard(url);
      if (!copied) throw new Error("无法复制链接，请手动复制");
      setMessage("链接已复制，快去分享吧。");
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") {
        return;
      }
      setError(shareError instanceof Error ? shareError.message : "分享失败");
    } finally {
      setSharing(false);
    }
  }

  if (editing) {
    return <main className="page-shell space-y-4"><Link href="#" onClick={(e) => { e.preventDefault(); setEditing(false); }} className="app-section-link">← 返回帖子详情</Link><PostEditor clearLabel="恢复原内容" editorTitle="编辑帖子" initialCategory={post.category} initialDraft={editDraft} persistDraft={false} submitLabel="保存修改" submittingLabel="保存中..." visibleCategories={["request", "secondhand", "discussion", "play"]} onSubmit={async (draft) => { await updatePost(postIdValue, draft); setEditing(false); setError(""); setMessage("帖子已更新。"); }} /><Toast toast={toast} /></main>;
  }

  return (
    <main className="page-shell">
      {/* 灯箱 */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={post.images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* 统一的自适应布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_320px] gap-4">
        {/* 左栏/主栏：包含详情、图片、评论、评论输入框 */}
        <div className="space-y-4">
          
          {/* 移动端专属 PageHeader：在 lg:hidden 下显示 */}
          <div className="lg:hidden">
            <div className="mobile-post-detail-header resident-page-header flex justify-between items-center pb-3">
              <button type="button" className="resident-page-header-back mobile-post-detail-header-back p-2" onClick={navigateBackOrFallback} aria-label="返回">
                ←
              </button>
              <div className="relative">
                <button
                  type="button"
                  className="mobile-post-more-btn mobile-post-detail-header-more p-2"
                  onClick={() => setShowMoreMenu((v) => !v)}
                  aria-label="更多操作"
                >
                  •••
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 mt-2 w-32 rounded-xl bg-white border border-[var(--border)] shadow-lg p-1 z-10">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                      onClick={() => { setShowMoreMenu(false); handleReport(); }}
                    >
                      举报
                    </button>
                    {canManagePost && (
                      <>
                        <div className="border-t my-1" />
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                          onClick={() => { setShowMoreMenu(false); handleDelete(); }}
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-3">
              <div className="text-xs text-indigo-600 font-semibold">{meta.label}</div>
              <h1 className="text-xl font-bold mt-1 text-slate-900">帖子详情</h1>
            </div>
          </div>

          {/* 桌面端专属的帖子头部面板：在 hidden lg:block 下显示 */}
          <div className="hidden lg:block">
            <Card className="app-card p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-gradient-to-br from-[rgba(57,245,143,0.2)] to-[rgba(72,201,255,0.15)] text-[var(--primary)] text-lg font-bold flex-shrink-0">
                    {Array.from(post.authorName)[0] ?? "邻"}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{post.authorName}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{formatDateTime(post.createdAt)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Chip size="sm" variant="soft">{meta.label}</Chip>
                  <Chip size="sm" variant="secondary">{visibilityMeta[post.visibility].label}</Chip>
                </div>
              </div>
              <h1 className="mt-5 text-[1.8rem] font-semibold leading-[1.08] tracking-[-0.05em] text-slate-950">{post.title}</h1>
              <div className="mt-3 text-sm text-[var(--muted)]">{timeAgo(post.createdAt)} · 评论 {post.commentCount} · 收藏 {post.favoriteCount}</div>
            </Card>
          </div>

          {/* 移动端专属的作者信息栏：仅在 lg:hidden 下显示 */}
          <div className="lg:hidden bg-white p-4 rounded-2xl border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgba(57,245,143,0.2)] to-[rgba(72,201,255,0.15)] flex items-center justify-center font-bold text-indigo-600">
                  {Array.from(post.authorName)[0] ?? "邻"}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{post.authorName}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">{post.authorRoom || "未知"}</div>
                </div>
              </div>
              {!post.isMine && currentUser && (
                <button
                  type="button"
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                    following 
                      ? "bg-slate-100 text-slate-600 border-slate-200" 
                      : "bg-indigo-600 text-white border-indigo-600"
                  }`}
                  onClick={handleFollow}
                  disabled={busy}
                >
                  {following ? "已关注" : "关注TA"}
                </button>
              )}
            </div>
            <div className="mt-2 text-[11px] text-[var(--muted)] flex gap-2">
              <span>发布于 {timeAgo(post.createdAt)}</span>
              {post.pinned && <span className="text-red-500">置顶</span>}
              {post.featured && <span className="text-amber-500">精选</span>}
            </div>
          </div>

          {/* 帖子图片区域（共享） */}
          {activeImage ? (
            <Card className="app-card p-4">
              <div
                className="cursor-zoom-in overflow-hidden rounded-[1rem] border border-[var(--border)] bg-[var(--surface-secondary)]"
                onClick={() => setLightboxIndex(activeImageIndex)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightboxIndex(activeImageIndex); }}
                aria-label="点击放大查看"
              >
                <img
                  alt={post.title}
                  className="max-h-[32rem] w-full object-cover transition-transform hover:scale-[1.01]"
                  src={activeImage.url}
                />
              </div>
              {post.images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
                  {post.images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      className={`overflow-hidden rounded-[0.9rem] border flex-shrink-0 transition-all ${index === activeImageIndex ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : "border-[var(--border)] hover:border-[var(--primary)]"}`}
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`选择第 ${index + 1} 张图片`}
                    >
                      <img
                        alt={`${post.title} 缩略图 ${index + 1}`}
                        className="h-20 w-20 object-cover"
                        src={image.url}
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </Card>
          ) : null}

          {/* 帖子正文（共享） */}
          <Card className="app-card p-4 md:p-5">
            {/* 移动端专属的标题在正文卡片中显示 */}
            <h1 className="lg:hidden text-lg font-bold text-slate-900 mb-3">{post.title}</h1>
            <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">正文内容</div>
            <div className="text-[0.95rem] leading-8 text-[var(--foreground)]">
              <MarkdownRenderer content={post.content} />
            </div>
            <AttachmentList attachments={post.attachments} />
            {post.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Chip key={tag} size="sm" variant="secondary">#{tag}</Chip>
                ))}
              </div>
            ) : null}
          </Card>

          {/* AI 推荐面板（共享） */}
          {post.category === "request" && post.skillMatches && post.skillMatches.length > 0 && (
            <Card className="app-card border-[rgba(109,221,175,0.34)] p-4 md:p-5">
              <h3 className="text-[var(--primary)] font-semibold mb-4 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                AI 技能匹配推荐
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {post.skillMatches.map(match => (
                  <div key={match.id} className="app-card-muted rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[rgba(109,221,175,0.34)]">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{match.roomNumber} {match.ownerName}</div>
                        <div className="text-xs text-[var(--primary)] mt-0.5">{match.skillTitle}</div>
                      </div>
                    </div>
                    {match.reasons && match.reasons.length > 0 && (
                      <div className="text-xs text-[var(--muted)] mb-3 leading-relaxed">匹配理由：{match.reasons[0]}</div>
                    )}
                    {post.isMine && (
                      <Button
                        className="w-full"
                        isDisabled={busy || !!match.notifiedAt}
                        onClick={() => handleNotifyMatch(match.id)}
                        size="sm"
                      >
                        {match.notifiedAt ? "已发送互助请求" : "一键通知TA来帮忙"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 评论区（共享） */}
          <Card className="app-card p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">评论区 ({post.comments.length})</div>
              <div className="flex gap-1">
                <Button size="sm" variant={commentSort === "hot" ? undefined : "secondary"} onPress={() => setCommentSort("hot")}>
                  最热
                </Button>
                <Button size="sm" variant={commentSort === "new" ? undefined : "secondary"} onPress={() => setCommentSort("new")}>
                  最新
                </Button>
              </div>
            </div>
            {sortedComments.length === 0 ? (
              <div className="mt-3 text-sm text-[var(--muted)] text-center py-6">还没有评论，快来抢沙发吧</div>
            ) : (
              <div className="mt-3 grid gap-3">
                {sortedComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface-secondary)] p-3.5 transition-all hover:border-[var(--border-strong)] hover:bg-white">
                    <div className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-gradient-to-br from-[rgba(57,245,143,0.15)] to-[rgba(72,201,255,0.1)] text-[var(--primary)] text-sm font-bold flex-shrink-0">
                      {Array.from(comment.authorName)[0] ?? "邻"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-950">{comment.authorName}</span>
                        <span className="text-xs text-[var(--muted)]">{timeAgo(comment.createdAt)}</span>
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="mt-2 space-y-2">
                          <TextArea
                            aria-label={`编辑评论 ${comment.authorName}`}
                            fullWidth
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onPress={handleCommentEditSubmit} isDisabled={busy}>保存</Button>
                            <Button size="sm" variant="secondary" onPress={() => { setEditingCommentId(null); setEditingCommentContent(""); }}>取消</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">{comment.content}</p>
                      )}
                      {comment.isMine && editingCommentId !== comment.id ? (
                        <div className="mt-2">
                          <button type="button" className="text-xs font-semibold text-[var(--primary)]" onClick={() => { setEditingCommentId(comment.id); setEditingCommentContent(comment.content); }}>
                            编辑评论
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 发表评论（共享） */}
          <Card className="app-card p-4 md:p-5">
            <div className="text-sm font-semibold text-slate-900">发表评论</div>
            <div className="mt-3">
              {currentUser ? (
                <>
                  <TextArea
                    aria-label="发表评论"
                    fullWidth
                    placeholder="写下你的评论..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    rows={4}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button isPending={isSubmittingComment} onPress={handleCommentSubmit}>
                      {isSubmittingComment ? "发送中..." : "发布评论"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="app-card-muted rounded-[1rem] p-4 text-sm text-[var(--muted)]">
                  登录后可发表评论。
                  <div className="mt-3">
                    <Link href={`/login?next=/posts/${post.id}`} className="inline-flex rounded-full bg-[var(--primary)] px-4 py-2 font-semibold text-[var(--primary-foreground)]">
                      去登录
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 右栏/侧边栏：仅在 lg 屏幕下显示，移动端隐藏 */}
        <div className="hidden lg:block space-y-4">
          <Card className="app-card p-4">
            <div className="text-sm font-semibold text-slate-900">互动操作</div>
            <div className="mt-3 grid gap-2">
              <Button className="w-full" isDisabled={busy} onPress={handleFavorite} variant={post.favorited ? undefined : "secondary"}>
                {post.favorited ? "已收藏" : "收藏"} · {post.favoriteCount}
              </Button>
              <Button className="w-full" isDisabled={busy} onPress={handleReport} variant="secondary">
                举报内容
              </Button>
              <Button className="w-full" isDisabled={sharing} onPress={handleShare} variant="secondary">
                {sharing ? "分享中..." : "分享帖子"}
              </Button>
              {canManagePost && (
                <Button className="w-full" onPress={() => { setMessage(""); setError(""); setEditing(true); }} variant="secondary">
                  编辑帖子
                </Button>
              )}
              {canManagePost && (
                <Button className="w-full" isDisabled={busy} onPress={handleDelete} variant="danger">
                  删除帖子
                </Button>
              )}
            </div>
          </Card>

          <Card className="app-card p-4">
            <div className="text-sm font-semibold text-slate-900">数据概览</div>
            <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
              <div className="flex justify-between"><span>评论</span><span className="font-semibold text-[var(--foreground)]">{post.commentCount}</span></div>
              <div className="flex justify-between"><span>收藏</span><span className="font-semibold text-[var(--foreground)]">{post.favoriteCount}</span></div>
              <div className="flex justify-between"><span>图片</span><span className="font-semibold text-[var(--foreground)]">{post.images.length}</span></div>
              <div className="flex justify-between"><span>附件</span><span className="font-semibold text-[var(--foreground)]">{post.attachments.length}</span></div>
            </div>
          </Card>

          <Card className="app-card p-4">
            <div className="text-sm font-semibold text-slate-900">帖子属性</div>
            <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
              <div className="flex justify-between"><span>分类</span><span className="font-semibold text-[var(--foreground)]">{meta.label}</span></div>
              <div className="flex justify-between"><span>可见范围</span><span className="font-semibold text-[var(--foreground)]">{visibilityMeta[post.visibility].label}</span></div>
              <div className="flex justify-between"><span>作者</span><span className="font-semibold text-[var(--foreground)]">{post.authorName}</span></div>
            </div>
          </Card>
        </div>
      </div>
      <Toast toast={toast} />
    </main>
  );
}
