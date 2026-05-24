"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCommunityPosts } from "./community-provider";
import { PostEditor } from "./post-editor";
import { EmptyState } from "./resident-shared";
import { categoryMeta, visibilityMeta } from "../lib/types";
import type { PostDraft } from "../lib/types";
import { formatDateTime, timeAgo, copyToClipboard } from "../lib/utils";

interface PostDetailClientProps { postId: string; }

type CommentSort = "hot" | "new";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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

  if (!post) return <main className="page-shell"><EmptyState title="帖子不存在" actionHref={postListHref} actionLabel="返回动态" /></main>;

  const meta = categoryMeta[post.category];
  const activeImage = post.images[activeImageIndex] ?? post.images[0] ?? null;
  const canManagePost = Boolean(currentUser && (post.isMine || currentUser.role === "admin"));
  const postIdValue = post.id;
  const editDraft: PostDraft = { title: post.title, content: post.content, category: post.category, tags: post.tags, visibility: post.visibility, anonymous: post.authorName === "匿名居民", images: post.images };

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

    const url = window.location.href;
    const shareData = {
      title: post.title,
      text: `${post.authorName} 发布的帖子：${post.title}`,
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
    return <main className="page-shell space-y-4"><Link href="#" onClick={(e) => { e.preventDefault(); setEditing(false); }} className="app-section-link">← 返回帖子详情</Link><PostEditor clearLabel="恢复原内容" editorTitle="编辑帖子" initialCategory={post.category} initialDraft={editDraft} persistDraft={false} submitLabel="保存修改" submittingLabel="保存中..." visibleCategories={["request", "secondhand", "discussion", "play"]} onSubmit={async (draft) => { await updatePost(postIdValue, draft); setEditing(false); setError(""); setMessage("帖子已更新。"); }} /></main>;
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

      {/* 移动端布局 */}
      <section className="mobile-post-detail md:!hidden">
        {/* 顶部标题栏 */}
        <div className="mobile-post-topbar">
          <button type="button" className="mobile-post-back" onClick={navigateBackOrFallback} aria-label="返回">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="mobile-post-topbar-title">帖子详情</span>
          <div className="relative">
            <button type="button" className="mobile-post-more-btn" aria-label="更多选项" onClick={() => setShowMoreMenu(!showMoreMenu)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
            {showMoreMenu && canManagePost && (
              <div className="absolute right-0 top-full mt-1 rounded-md border border-[rgba(76,255,177,0.15)] bg-[rgba(8,16,16,0.95)] py-1 min-w-[100px] z-50 shadow-lg backdrop-blur-sm">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-[#f0fff6] hover:bg-[rgba(57,245,143,0.08)] transition-colors"
                  onClick={() => { setShowMoreMenu(false); setEditing(true); }}
                >
                  编辑
                </button>
                <div className="mx-3 border-t border-[rgba(232,255,242,0.12)]" />
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-[#ff6b8a] hover:bg-[rgba(255,107,138,0.08)] transition-colors"
                  onClick={() => { setShowMoreMenu(false); handleDelete(); }}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        </div>

        {error && <div className="mobile-login-error">{error}</div>}
        {message && <div className="mobile-login-success">{message}</div>}

        {/* 作者信息 */}
        <div className="mobile-post-author-section">
          <div className="mobile-post-author-row">
            <span className="mobile-post-author-avatar">
              {Array.from(post.authorName)[0] ?? "邻"}
            </span>
            <div className="mobile-post-author-info">
              <div className="mobile-post-author-name">{post.authorName}</div>
              <div className="mobile-post-author-meta">
                <span className="mobile-post-author-room">2栋-1502</span>
                {post.pinned && <span className="mobile-post-author-badge mobile-post-author-badge--pinned">置顶</span>}
                {post.featured && <span className="mobile-post-author-badge mobile-post-author-badge--featured">精选</span>}
              </div>
            </div>
            {!post.isMine && post.authorId && (
              <button
                type="button"
                className={`mobile-post-follow-btn ${following ? "is-following" : ""}`}
                onClick={handleFollow}
                disabled={busy}
              >
                {following ? "已关注" : "+ 关注"}
              </button>
            )}
          </div>
          <div className="mobile-post-publish-meta">
            <span>{timeAgo(post.createdAt)}</span>
            <span>·</span>
            <span>发布于</span>
            <span>{meta.label}</span>
          </div>
        </div>

        <h1 className="mobile-post-title">{post.title}</h1>
        <div className="mobile-post-content">{post.content}</div>

        {post.tags.length > 0 && (
          <div className="mobile-post-tags">
            {post.tags.map((tag) => (
              <span key={tag} className="mobile-post-tag">#{tag}</span>
            ))}
          </div>
        )}

        {post.category === "request" && post.skillMatches && post.skillMatches.length > 0 && (
          <div className="mt-6 border border-[var(--primary)] rounded-xl p-4 bg-[rgba(57,245,143,0.05)]">
            <h3 className="text-[var(--primary)] font-semibold mb-3 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              AI 推荐邻居
            </h3>
            <div className="space-y-3">
              {post.skillMatches.map(match => (
                <div key={match.id} className="flex flex-col gap-2 p-3 bg-[rgba(8,16,16,0.6)] rounded-lg border border-[var(--border)]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-[#f0fff6]">{match.roomNumber} {match.ownerName}</span>
                    <span className="text-xs text-[var(--muted)]">{match.skillTitle}</span>
                  </div>
                  {match.reasons && match.reasons.length > 0 && (
                    <div className="text-xs text-[#a0dfbc]">{match.reasons[0]}</div>
                  )}
                  {post.isMine && (
                    <button
                      type="button"
                      className="mt-1 w-full py-1.5 text-xs font-semibold rounded bg-[var(--primary)] text-[#032111] disabled:opacity-50"
                      onClick={() => handleNotifyMatch(match.id)}
                      disabled={busy || !!match.notifiedAt}
                    >
                      {match.notifiedAt ? "已通知" : "一键通知TA来帮忙"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 图片展示（点击打开灯箱） */}
        {post.images.length > 0 && (
          <div className="mobile-post-images-section">
            <div className="mobile-post-images-grid">
              {post.images.slice(0, 9).map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={`mobile-post-image-thumb ${index === activeImageIndex ? "is-active" : ""}`}
                  onClick={() => { setActiveImageIndex(index); setLightboxIndex(index); }}
                  aria-label={`查看第 ${index + 1} 张图片`}
                >
                  <img src={image.url} alt={`${post.title} ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 互动按钮 */}
        <div className="mobile-post-interactions">
          <button type="button" className={`mobile-post-interact-btn ${post.favorited ? "is-active" : ""}`} onClick={handleFavorite} disabled={busy}>
            <svg viewBox="0 0 24 24" fill={post.favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>{post.favoriteCount}</span>
          </button>
          <button type="button" className="mobile-post-interact-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{post.commentCount}</span>
          </button>
          <button type="button" className="mobile-post-interact-btn" onClick={handleShare} disabled={sharing}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            <span>{sharing ? "处理中" : "分享"}</span>
          </button>
        </div>

        {/* 评论列表 */}
        <div className="mobile-post-comments-section">
          <div className="mobile-post-comments-header">
            全部评论 ({post.comments.length})
            <div className="mobile-post-comments-sort">
              <button
                type="button"
                className={`mobile-post-sort-btn ${commentSort === "hot" ? "is-active" : ""}`}
                onClick={() => setCommentSort("hot")}
              >
                最热
              </button>
              <button
                type="button"
                className={`mobile-post-sort-btn ${commentSort === "new" ? "is-active" : ""}`}
                onClick={() => setCommentSort("new")}
              >
                最新
              </button>
            </div>
          </div>

          {sortedComments.length === 0 ? (
            <div className="mobile-post-no-comments">还没有评论，快来抢沙发吧</div>
          ) : (
            sortedComments.map((comment) => (
              <div key={comment.id} className="mobile-post-comment">
                <span className="mobile-post-comment-avatar">
                  {Array.from(comment.authorName)[0] ?? "邻"}
                </span>
                <div className="mobile-post-comment-body">
                  <div className="mobile-post-comment-header">
                    <span className="mobile-post-comment-name">{comment.authorName}</span>
                    <span className="mobile-post-comment-time">{timeAgo(comment.createdAt)}</span>
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        className="mobile-post-comment-input !min-h-[88px]"
                        value={editingCommentContent}
                        onChange={(e) => setEditingCommentContent(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button type="button" className="mobile-post-comment-reply" onClick={handleCommentEditSubmit} disabled={busy}>
                          保存
                        </button>
                        <button type="button" className="mobile-post-comment-reply" onClick={() => { setEditingCommentId(null); setEditingCommentContent(""); }}>
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mobile-post-comment-text">{comment.content}</p>
                  )}
                  <div className="mobile-post-comment-actions">
                    {comment.isMine ? (
                      <button
                        type="button"
                        className="mobile-post-comment-reply"
                        onClick={() => { setEditingCommentId(comment.id); setEditingCommentContent(comment.content); }}
                      >
                        编辑
                      </button>
                    ) : (
                      <button type="button" className="mobile-post-comment-reply">回复</button>
                    )}
                    <div className="mobile-post-comment-stats">
                      <button type="button" className="mobile-post-comment-like">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                        <span>0</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部评论输入框 */}
        <div className="mobile-post-comment-input-bar">
          {currentUser ? (
            <>
              <input
                name="mobileComment"
                className="mobile-post-comment-input"
                placeholder="写下你的回复..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCommentSubmit();
                  }
                }}
              />
              <button type="button" className="mobile-post-comment-send" onClick={handleCommentSubmit} disabled={isSubmittingComment}>
                发送
              </button>
            </>
          ) : (
            <Link href={`/login?next=/posts/${post.id}`} className="mobile-post-comment-send !w-full !text-center">
              登录后回复
            </Link>
          )}
        </div>
      </section>

      {/* 桌面端布局 */}
      <section className="hidden md:grid gap-4 space-y-4 md:space-y-5 xl:grid-cols-[minmax(0,1.3fr)_320px]">
        <div className="space-y-4">
          <div className="glass-card p-4 md:p-5">
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
                <span className="app-chip">{meta.label}</span>
                <span className="app-chip app-chip-muted">{visibilityMeta[post.visibility].label}</span>
              </div>
            </div>
            <h1 className="mt-5 text-[1.8rem] font-semibold leading-[1.08] tracking-[-0.05em] text-slate-950">{post.title}</h1>
            <div className="mt-3 text-sm text-[var(--muted)]">{timeAgo(post.createdAt)} · 评论 {post.commentCount} · 收藏 {post.favoriteCount}</div>
          </div>

          {/* 桌面端图片区（点击放大） */}
          {activeImage ? (
            <div className="space-y-3 rounded-[1.2rem] border border-[var(--border)] bg-[rgba(8,16,16,0.94)] p-4">
              <div
                className="overflow-hidden rounded-[1rem] border border-[var(--border)] bg-[rgba(8,16,16,0.9)] cursor-zoom-in"
                onClick={() => setLightboxIndex(activeImageIndex)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightboxIndex(activeImageIndex); }}
                aria-label="点击放大查看"
              >
                <Image
                  alt={post.title}
                  className="max-h-[32rem] w-full object-cover transition-transform hover:scale-[1.01]"
                  src={activeImage.url}
                  width={activeImage.width || 1200}
                  height={activeImage.height || 900}
                  unoptimized
                />
              </div>
              {post.images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {post.images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      className={`overflow-hidden rounded-[0.9rem] border flex-shrink-0 transition-all ${index === activeImageIndex ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : "border-[var(--border)] hover:border-[var(--primary)]"}`}
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`选择第 ${index + 1} 张图片`}
                    >
                      <Image
                        alt={`${post.title} 缩略图 ${index + 1}`}
                        className="h-20 w-20 object-cover"
                        src={image.url}
                        width={image.width || 80}
                        height={image.height || 80}
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="glass-card p-4 md:p-5">
            <div className="text-sm font-semibold text-slate-900">正文内容</div>
            <div className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-8 text-[var(--foreground)]">{post.content}</div>
            {post.tags.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-[rgba(57,245,143,0.12)] bg-[rgba(57,245,143,0.05)] px-3 py-1 text-[0.74rem] font-semibold text-[var(--primary)]">#{tag}</span>)}</div> : null}
          </div>

          {post.category === "request" && post.skillMatches && post.skillMatches.length > 0 && (
            <div className="glass-card p-4 md:p-5 border border-[var(--primary)] shadow-[0_0_15px_rgba(57,245,143,0.1)]">
              <h3 className="text-[var(--primary)] font-semibold mb-4 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                AI 技能匹配推荐
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {post.skillMatches.map(match => (
                  <div key={match.id} className="p-4 bg-[rgba(8,16,16,0.6)] rounded-xl border border-[var(--border)] hover:border-[rgba(57,245,143,0.4)] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-sm text-[#f0fff6]">{match.roomNumber} {match.ownerName}</div>
                        <div className="text-xs text-[var(--primary)] mt-0.5">{match.skillTitle}</div>
                      </div>
                    </div>
                    {match.reasons && match.reasons.length > 0 && (
                      <div className="text-xs text-[var(--muted)] mb-3 leading-relaxed">匹配理由：{match.reasons[0]}</div>
                    )}
                    {post.isMine && (
                      <button
                        type="button"
                        className="w-full py-2 text-xs font-semibold rounded-lg bg-[var(--primary)] text-[#032111] hover:shadow-[0_0_10px_rgba(57,245,143,0.3)] disabled:opacity-50 disabled:shadow-none transition-all"
                        onClick={() => handleNotifyMatch(match.id)}
                        disabled={busy || !!match.notifiedAt}
                      >
                        {match.notifiedAt ? "已发送互助请求" : "一键通知TA来帮忙"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 桌面端评论区 */}
          <div className="glass-card p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">评论区 ({post.comments.length})</div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${commentSort === "hot" ? "bg-[var(--primary)] text-[#032111]" : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]"}`}
                  onClick={() => setCommentSort("hot")}
                >
                  最热
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${commentSort === "new" ? "bg-[var(--primary)] text-[#032111]" : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]"}`}
                  onClick={() => setCommentSort("new")}
                >
                  最新
                </button>
              </div>
            </div>
            {sortedComments.length === 0 ? (
              <div className="mt-3 text-sm text-[var(--muted)]">还没有评论，快来抢沙发吧</div>
            ) : (
              <div className="mt-3 grid gap-3">
                {sortedComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-3.5 rounded-[1rem] border border-[var(--border)] bg-[rgba(6,12,12,0.6)] transition-all hover:bg-[rgba(10,18,18,0.88)] hover:border-[var(--border-strong)]">
                    <div className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-gradient-to-br from-[rgba(57,245,143,0.15)] to-[rgba(72,201,255,0.1)] text-[var(--primary)] text-sm font-bold flex-shrink-0">
                      {Array.from(comment.authorName)[0] ?? "邻"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-950">{comment.authorName}</span>
                        <span className="text-xs text-[var(--muted)]">{timeAgo(comment.createdAt)}</span>
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            className="w-full p-3 rounded-2xl border border-[var(--border)] bg-[rgba(3,7,7,0.4)] text-[var(--field-foreground)] resize-none transition-colors focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:bg-[rgba(10,20,20,0.92)]"
                            rows={3}
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button type="button" className="px-3 py-1.5 rounded-full bg-[var(--primary)] text-[#032111] text-xs font-semibold" onClick={handleCommentEditSubmit} disabled={busy}>保存</button>
                            <button type="button" className="px-3 py-1.5 rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--foreground)]" onClick={() => { setEditingCommentId(null); setEditingCommentContent(""); }}>取消</button>
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
          </div>

          <div className="glass-card p-4 md:p-5">
            <div className="text-sm font-semibold text-slate-900">发表评论</div>
            <div className="mt-3">
              {currentUser ? (
                <>
                  <textarea
                    className="w-full p-4 rounded-2xl border border-[var(--border)] bg-[rgba(3,7,7,0.4)] text-[var(--field-foreground)] resize-none transition-colors focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:bg-[rgba(10,20,20,0.92)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                    placeholder="写下你的评论..."
                    rows={4}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className={`px-5 py-2.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[#7affc6] text-[#032111] font-semibold shadow-[0_4px_16px_rgba(57,245,143,0.25)] transition-all hover:shadow-[0_6px_24px_rgba(57,245,143,0.4)] hover:-translate-y-[1px] ${isSubmittingComment ? "opacity-70 cursor-not-allowed" : ""}`}
                      onClick={handleCommentSubmit}
                      disabled={isSubmittingComment}
                    >
                      {isSubmittingComment ? "发送中..." : "发布评论"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[rgba(3,7,7,0.4)] p-4 text-sm text-[var(--muted)]">
                  登录后可发表评论。
                  <div className="mt-3">
                    <Link href={`/login?next=/posts/${post.id}`} className="inline-flex px-4 py-2 rounded-full bg-[var(--primary)] text-[#032111] font-semibold">
                      去登录
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="text-sm font-semibold text-slate-900">互动操作</div>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                className={`w-full py-2.5 px-4 rounded-full border ${post.favorited ? "border-[var(--primary)] bg-[var(--primary)] text-[#032111] shadow-[0_0_16px_rgba(57,245,143,0.3)]" : "border-[var(--border)] bg-[rgba(10,18,18,0.88)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[rgba(57,245,143,0.05)] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(57,245,143,0.1)]"} font-semibold transition-all duration-200 ${busy ? "opacity-70 cursor-not-allowed" : ""}`}
                onClick={handleFavorite}
                disabled={busy}
              >
                {post.favorited ? "已收藏" : "收藏"} · {post.favoriteCount}
              </button>
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-full border border-[var(--border)] bg-[rgba(10,18,18,0.88)] text-[var(--foreground)] font-semibold transition-all duration-200 hover:border-[var(--primary)] hover:bg-[rgba(57,245,143,0.05)] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(57,245,143,0.1)]"
                onClick={handleReport}
                disabled={busy}
              >
                举报内容
              </button>
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-full border border-[var(--border)] bg-[rgba(10,18,18,0.88)] text-[var(--foreground)] font-semibold transition-all duration-200 hover:border-[var(--primary)] hover:bg-[rgba(57,245,143,0.05)] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(57,245,143,0.1)]"
                onClick={handleShare}
                disabled={sharing}
              >
                {sharing ? "分享中..." : "分享帖子"}
              </button>
              {canManagePost && (
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-full border border-[var(--border)] bg-[rgba(10,18,18,0.88)] text-[var(--foreground)] font-semibold transition-all duration-200 hover:border-[var(--primary)] hover:bg-[rgba(57,245,143,0.05)] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(57,245,143,0.1)]"
                  onClick={() => { setMessage(""); setError(""); setEditing(true); }}
                >
                  编辑帖子
                </button>
              )}
              {canManagePost && (
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-full border border-[rgba(255,93,122,0.2)] bg-[rgba(255,93,122,0.08)] text-[#ff8da4] font-semibold transition-all duration-200 hover:border-[rgba(255,93,122,0.3)] hover:bg-[rgba(255,93,122,0.15)] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(255,93,122,0.2)]"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  删除帖子
                </button>
              )}
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="text-sm font-semibold text-slate-900">数据概览</div>
            <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
              <div className="flex justify-between"><span>评论</span><span className="font-semibold text-[var(--foreground)]">{post.commentCount}</span></div>
              <div className="flex justify-between"><span>收藏</span><span className="font-semibold text-[var(--foreground)]">{post.favoriteCount}</span></div>
              <div className="flex justify-between"><span>图片</span><span className="font-semibold text-[var(--foreground)]">{post.images.length}</span></div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="text-sm font-semibold text-slate-900">帖子属性</div>
            <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
              <div className="flex justify-between"><span>分类</span><span className="font-semibold text-[var(--foreground)]">{meta.label}</span></div>
              <div className="flex justify-between"><span>可见范围</span><span className="font-semibold text-[var(--foreground)]">{visibilityMeta[post.visibility].label}</span></div>
              <div className="flex justify-between"><span>作者</span><span className="font-semibold text-[var(--foreground)]">{post.authorName}</span></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
