"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { useCommunityPosts } from "@/lib/community-store";
import { PostEditor } from "./post/post-editor";
import { MarkdownRenderer } from "./markdown/markdown-renderer";
import { EmptyState } from "./ui/empty-state";
import { Toast, useToast } from "./ui/toast";
import { CommentForm } from "./comment/comment-form";
import { CommentList } from "./comment/comment-list";
import { categoryMeta, visibilityMeta } from "@/lib/types";
import type { PostAttachment, PostDraft } from "@/lib/types";
import { formatDateTime, timeAgo, copyToClipboard } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  FileTextIcon,
  ShareIcon,
  ShieldIcon,
  StarIcon,
  UserPlusIcon,
} from "./app-icons";

interface PostDetailClientProps { postId: string; }
type CommentSort = "hot" | "new";

function formatAttachmentSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / 1024 * 1024).toFixed(sizeBytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
  return `${Math.max(1, Math.round(sizeBytes / 1024))}KB`;
}

// ── 图片灯箱 ───────────────────────────
function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: { id: string; url: string }[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const img = images[index];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      role="dialog" aria-modal="true" aria-label="图片预览"
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx > 50) prev(); else if (dx < -50) next();
        touchStartX.current = null;
      }}
    >
      <button type="button" className="fixed right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white" onClick={onClose} aria-label="关闭">
        <CloseIcon className="h-6 w-6" aria-hidden="true" />
      </button>
      {images.length > 1 && <div className="fixed left-4 top-4 z-10 rounded-xl bg-white/20 px-3 py-1 text-sm text-white">{index + 1} / {images.length}</div>}
      <div className="max-h-[80vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={`图片 ${index + 1}`} className="max-h-[80vh] max-w-[90vw] rounded-xl object-contain" draggable={false} />
      </div>
      {images.length > 1 && (
        <>
          <button type="button" className="fixed left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-white/20 text-white" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="上一张">
            <ArrowLeftIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          <button type="button" className="fixed right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-white/20 text-white" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="下一张">
            <ArrowRightIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}

// ── 附件列表 ───────────────────────────
function AttachmentList({ attachments }: { attachments: PostAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <div className="text-sm font-semibold">附件</div>
      <div className="space-y-1.5">
        {attachments.map((att) => (
          <a key={att.id} href={att.url} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileTextIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{att.filename}</div>
              <div className="text-xs text-muted-foreground">{formatAttachmentSize(att.sizeBytes)} · 点击打开或下载</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── 主组件 ───────────────────────────
export function PostDetailClient({ postId }: PostDetailClientProps) {
  const router = useRouter();
  const { posts, addComment, updateComment, toggleFavorite, reportPost, updatePost, deletePost, currentUser, refresh } = useCommunityPosts();
  const { toast, show } = useToast();
  const setMessage = (msg: string) => { if (msg) show(msg, "success"); };
  const setError = (msg: string) => { if (msg) show(msg, "error"); };
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSort, setCommentSort] = useState<CommentSort>("hot");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [following, setFollowing] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [sharing, setSharing] = useState(false);
  const postListHref = "/posts";

  const post = useMemo(() => posts.find((item) => item.id === postId), [postId, posts]);

  const navigateBackOrFallback = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) { router.back(); return; }
    router.replace(postListHref);
  }, [router]);

  // 检查关注状态
  useEffect(() => {
    if (!currentUser || !post?.authorId || post.isMine) { setFollowing(false); return; }
    fetch(`/api/users/${post.authorId}/follow`)
      .then((r) => r.json()).then((d) => setFollowing(d.following)).catch(() => setFollowing(false));
  }, [currentUser, post?.authorId, post?.isMine]);

  const sortedComments = useMemo(() => {
    if (!post) return [];
    const list = [...post.comments];
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [post]);

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl p-4 pt-8">
        <EmptyState title="帖子不存在" actionHref={postListHref} actionLabel="返回动态" />
        <Toast toast={toast} />
      </div>
    );
  }

  const meta = categoryMeta[post.category];
  const canManagePost = Boolean(currentUser && (post.isMine || currentUser.role === "admin"));
  const editDraft: PostDraft = { title: post.title, content: post.content, category: post.category, tags: post.tags, visibility: post.visibility, anonymous: post.authorName === "匿名居民", images: post.images, attachments: post.attachments };

  // ── 操作处理 ───────────────────────────
  async function handleDelete() {
    if (!window.confirm("确定删除这篇帖子？")) return;
    setBusy(true);
    try { await deletePost(postId); navigateBackOrFallback(); }
    catch (e) { setError(e instanceof Error ? e.message : "删除失败"); }
    finally { setBusy(false); }
  }

  async function handleFavorite() {
    if (!currentUser) { setError("先登录再收藏。"); return; }
    setBusy(true);
    try { const favorited = await toggleFavorite(postId); setMessage(favorited ? "已收藏。" : "已取消收藏。"); }
    catch (e) { setError(e instanceof Error ? e.message : "收藏失败"); }
    finally { setBusy(false); }
  }

  async function handleReport() {
    if (!currentUser) { setError("先登录再举报。"); return; }
    setBusy(true);
    try { await reportPost(postId); setMessage("已提交举报。"); }
    catch (e) { setError(e instanceof Error ? e.message : "举报失败"); }
    finally { setBusy(false); }
  }

  async function handleFollow() {
    if (!currentUser || !post || !post.authorId || post.isMine) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${post.authorId}/follow`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "操作失败");
      setFollowing(d.following);
      setMessage(d.following ? "已关注。" : "已取消关注。");
    } catch (e) { setError(e instanceof Error ? e.message : "关注失败"); }
    finally { setBusy(false); }
  }

  async function handleNotifyMatch(matchId: string) {
    if (!currentUser) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/notify-match`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "通知失败");
      setMessage("已通知邻居。");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "通知失败"); }
    finally { setBusy(false); }
  }

  async function handleCommentSubmit(content: string) {
    if (!currentUser) { setError("请先登录"); return; }
    setIsSubmittingComment(true);
    try { await addComment(postId, { content }); }
    catch (e) { setError(e instanceof Error ? e.message : "评论发布失败"); }
    finally { setIsSubmittingComment(false); }
  }

  async function handleCommentEditSubmit() {
    if (!editingCommentId) return;
    setBusy(true);
    try {
      await updateComment(postId, editingCommentId, { content: editingCommentContent.trim() });
      setEditingCommentId(null); setEditingCommentContent(""); setMessage("评论已更新。");
    } catch (e) { setError(e instanceof Error ? e.message : "评论修改失败"); }
    finally { setBusy(false); }
  }

  async function handleShare() {
    if (typeof window === "undefined" || !post) return;
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || window.location.origin;
    const url = `${origin}/posts/${postId}`;
    setSharing(true);
    try {
      if (navigator.share) { await navigator.share({ title: post.title, url }); return; }
      const copied = await copyToClipboard(url);
      if (!copied) throw new Error("无法复制链接");
      setMessage("链接已复制。");
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) setError(e instanceof Error ? e.message : "分享失败");
    } finally { setSharing(false); }
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 pt-8 md:p-6">
        <Link href="#" onClick={(e) => { e.preventDefault(); setEditing(false); }} className="text-sm font-semibold text-primary">返回帖子详情</Link>
        <PostEditor
          editorTitle="编辑帖子"
          initialCategory={post.category}
          initialDraft={editDraft}
          persistDraft={false}
          submitLabel="保存修改"
          submittingLabel="保存中..."
          visibleCategories={["request", "secondhand", "discussion", "play"]}
          onSubmit={async (draft) => { await updatePost(postId, draft); setEditing(false); setMessage("帖子已更新。"); }}
        />
        <Toast toast={toast} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3 px-2 pb-28 pt-3 md:space-y-5 md:p-6">
      {lightboxIndex !== null && <ImageLightbox images={post.images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
      <Toast toast={toast} />

      <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,1.3fr)_320px]">
        {/* 左栏：帖子详情 + 评论 */}
        <div className="space-y-3 md:space-y-4">
          {/* 返回按钮 */}
          <button type="button" onClick={navigateBackOrFallback} className="app-action min-h-11 border border-border bg-white/78 px-3 text-sm text-primary hover:bg-primary/8">
            返回
          </button>

          {/* 帖子正文卡片 */}
          <Card className="app-panel-strong p-3.5 md:p-6">
            {/* 作者信息 */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-bold text-primary-strong">
                  {Array.from(post.authorName)[0] ?? "匿"}
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-semibold">{post.authorName}</span>
                    <Chip size="sm" color="accent" variant="soft">{meta.label}</Chip>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {timeAgo(post.createdAt)} · {visibilityMeta[post.visibility].label}
                    {post.isMine && <span className="ml-1 text-primary">(我的帖子)</span>}
                  </div>
                </div>
              </div>
              {canManagePost && (
                <div className="flex gap-1 self-start">
                  <Button className="min-h-10 px-3" size="sm" variant="ghost" onPress={() => setEditing(true)}>编辑</Button>
                  <Button className="min-h-10 px-3" size="sm" variant="ghost" isDisabled={busy} onPress={() => { void handleDelete(); }}>删除</Button>
                </div>
              )}
            </div>

            {/* 标签行 */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.pinned && <Chip size="sm" color="warning" variant="soft">置顶</Chip>}
              {post.featured && <Chip size="sm" color="default" variant="soft">精选</Chip>}
              {post.category === "request" && post.requestStatus && (
                <Chip size="sm" variant="soft">{post.requestStatus === "open" ? "待处理" : post.requestStatus === "processing" ? "处理中" : "已解决"}</Chip>
              )}
            </div>

            {/* 标题 */}
            <h1 className="mt-3 text-[1.18rem] font-bold leading-snug tracking-tight md:text-xl">{post.title}</h1>

            {/* 正文 */}
            <div className="mt-2.5 md:mt-3">
              <MarkdownRenderer content={post.content} />
            </div>

            {/* 图片 */}
            {post.images.length > 0 && (
              <div className={`mt-4 grid gap-2 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3"}`}>
                {post.images.map((img, i) => (
                  <button key={img.id} type="button" className="overflow-hidden rounded-xl border bg-muted/30" onClick={() => setLightboxIndex(i)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`图片 ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* 附件 */}
            <AttachmentList attachments={post.attachments} />

            {/* 标签 */}
            {post.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <Chip key={tag} size="sm" variant="soft">{`#${tag}`}</Chip>
                ))}
              </div>
            )}

            {/* 互动栏 */}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/70 pt-3 sm:flex sm:flex-wrap sm:items-center">
              <Button className="min-h-10 px-2 text-xs sm:min-h-11 sm:px-3 sm:text-sm" size="sm" variant={post.favorited ? "secondary" : "ghost"} isDisabled={busy} onPress={() => { void handleFavorite(); }}>
                <StarIcon className={post.favorited ? "fill-current" : undefined} />
                {post.favorited ? "已收藏" : "收藏"} ({post.favoriteCount})
              </Button>
              <Button className="min-h-10 px-2 text-xs sm:min-h-11 sm:px-3 sm:text-sm" size="sm" variant="ghost" isDisabled={busy || sharing} onPress={() => { void handleShare(); }}>
                <ShareIcon />
                分享
              </Button>
              {!post.isMine && post.authorId && (
                <Button className="min-h-10 px-2 text-xs sm:min-h-11 sm:px-3 sm:text-sm" size="sm" variant={following ? "secondary" : "ghost"} isDisabled={busy} onPress={() => { void handleFollow(); }}>
                  {following ? <CheckIcon /> : <UserPlusIcon />}
                  {following ? "已关注" : "关注"}
                </Button>
              )}
              <Button className="min-h-10 px-2 text-xs sm:min-h-11 sm:px-3 sm:text-sm" size="sm" variant="ghost" isDisabled={busy || post.reported} onPress={() => { void handleReport(); }}>
                {!post.reported && <ShieldIcon />}
                {post.reported ? "已举报" : "举报"}
              </Button>
            </div>
          </Card>

          {/* 评论区域 */}
          <div className="space-y-3 md:space-y-4">
            {/* 评论排序 */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold">评论 ({post.comments.length})</h2>
              <div className="flex gap-2 text-sm">
                <button type="button" className={`app-chip ${commentSort === "hot" ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  onClick={() => setCommentSort("hot")}>最热</button>
                <button type="button" className={`app-chip ${commentSort === "new" ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  onClick={() => setCommentSort("new")}>最新</button>
              </div>
            </div>

            <CommentForm onSubmit={handleCommentSubmit} isSubmitting={isSubmittingComment} currentUser={currentUser} />
            <CommentList
              comments={sortedComments}
              currentUser={currentUser}
              editingCommentId={editingCommentId}
              editingCommentContent={editingCommentContent}
              onStartEdit={(id, content) => { setEditingCommentId(id); setEditingCommentContent(content); }}
              onCancelEdit={() => { setEditingCommentId(null); setEditingCommentContent(""); }}
              onEditContentChange={setEditingCommentContent}
              onEditSubmit={handleCommentEditSubmit}
              busy={busy}
            />
          </div>
        </div>

        {/* 右栏：侧边信息 */}
        <aside className="hidden space-y-4 lg:block">
          {/* 帖子信息 */}
          <Card className="app-panel p-5">
            <Card.Title className="text-base">帖子信息</Card.Title>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">分类</span><span>{meta.label}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">可见范围</span><span>{visibilityMeta[post.visibility].label}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">发布时间</span><span>{formatDateTime(post.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">收藏数</span><span>{post.favoriteCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">评论数</span><span>{post.commentCount}</span></div>
            </div>
          </Card>

          {/* 技能匹配推荐 */}
          {post.skillMatches && post.skillMatches.length > 0 && (
            <Card className="app-panel p-5">
              <Card.Title className="text-base">技能匹配推荐</Card.Title>
              <Card.Description>以下邻居可能能帮到你</Card.Description>
              <div className="mt-3 space-y-2">
                {post.skillMatches.map((match) => (
                  <div key={match.id} className="rounded-xl border border-border bg-white/70 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                        {Array.from(match.ownerName)[0] ?? "邻"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{match.ownerName}</div>
                        <div className="text-xs text-muted-foreground">{match.roomNumber}</div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {match.skillTitle} · 匹配度 {match.score}
                    </div>
                    {match.reasons.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {match.reasons.map((r, i) => <Chip key={i} size="sm" variant="soft">{r}</Chip>)}
                      </div>
                    )}
                    {!match.notifiedAt && (
                      <Button size="sm" variant="primary" className="mt-2 min-h-11 w-full" isDisabled={busy} onPress={() => { void handleNotifyMatch(match.id); }}>
                        通知邻居
                      </Button>
                    )}
                    {match.notifiedAt && (
                      <div className="mt-2 text-center text-xs text-success">已通知</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
