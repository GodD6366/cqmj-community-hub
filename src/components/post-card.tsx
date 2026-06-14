import Link from "next/link";
import { getPostBadge, getVisibilityLabel, timeAgo } from "../lib/utils";
import type { CommunityPost } from "../lib/types";
import { requestStatusMeta } from "../lib/types";
import { ResidentAvatar } from "./resident-shared";

interface PostCardProps {
  post: CommunityPost;
  compact?: boolean;
}

function getCategoryTone(category: CommunityPost["category"]) {
  switch (category) {
    case "request":
      return "#39f58f";
    case "secondhand":
      return "#48c9ff";
    case "discussion":
      return "#f6c85f";
    case "play":
      return "#ffb74d";
  }
}

export function PostCard({ post, compact = false }: PostCardProps) {
  const images = post.images.slice(0, compact ? 1 : 3);
  const tags = post.tags.slice(0, compact ? 2 : 3);
  const tone = getCategoryTone(post.category);

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group block rounded-[1.45rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,251,255,0.92))] p-4 shadow-[0_16px_36px_rgba(73,98,128,0.08)] transition duration-150 hover:border-[rgba(123,166,214,0.28)] hover:shadow-[0_18px_40px_rgba(73,98,128,0.12)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ResidentAvatar name={post.authorName} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-950">{post.authorName}</span>
              <span className="rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold" style={{ borderColor: `${tone}44`, color: tone, background: `${tone}12` }}>
                {getPostBadge(post.category)}
              </span>
            </div>
            <div className="mt-1 text-[0.72rem] text-[var(--muted)]">{timeAgo(post.createdAt)}</div>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[rgba(123,166,214,0.18)] bg-[rgba(255,255,255,0.82)] px-2.5 py-1 text-[0.65rem] text-[var(--muted)]">{getVisibilityLabel(post.visibility)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {post.pinned ? <span className="app-chip">置顶</span> : null}
        {post.featured ? <span className="app-chip app-chip-muted">精选</span> : null}
        {post.attachments.length > 0 ? <span className="app-chip app-chip-muted">{post.attachments.length} 个附件</span> : null}
        {post.category === "request" && post.requestStatus ? (
          <span
            className="rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold"
            style={{
              borderColor:
                requestStatusMeta[post.requestStatus].tone === "green"
                  ? "rgba(57,245,143,0.24)"
                  : requestStatusMeta[post.requestStatus].tone === "amber"
                  ? "rgba(246,200,95,0.24)"
                  : "rgba(72,201,255,0.24)",
              color:
                requestStatusMeta[post.requestStatus].tone === "green"
                  ? "#39f58f"
                  : requestStatusMeta[post.requestStatus].tone === "amber"
                  ? "#f6c85f"
                  : "#48c9ff",
              background:
                requestStatusMeta[post.requestStatus].tone === "green"
                  ? "rgba(57,245,143,0.08)"
                  : requestStatusMeta[post.requestStatus].tone === "amber"
                  ? "rgba(246,200,95,0.08)"
                  : "rgba(72,201,255,0.08)",
            }}
          >
            {requestStatusMeta[post.requestStatus].label}
          </span>
        ) : null}
      </div>

      <h3 className={`mt-3 font-semibold tracking-[-0.04em] text-slate-950 ${compact ? "text-[1rem] line-clamp-2" : "text-[1.08rem] line-clamp-2"}`}>
        {post.title}
      </h3>
      <p className={`mt-2 whitespace-pre-wrap text-[var(--muted)] ${compact ? "line-clamp-3 text-[0.84rem] leading-6" : "line-clamp-3 text-[0.9rem] leading-6"}`}>
        {post.content}
      </p>

      {images.length > 0 ? (
        <div className={`mt-3 grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
          {images.map((image, index) => (
            <div key={image.id} className={`overflow-hidden rounded-[1rem] border border-[var(--border)] bg-[rgba(244,248,252,0.92)] ${images.length === 1 ? "aspect-[16/10]" : "aspect-square"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`${post.title} ${index + 1}`} className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" src={image.url} />
            </div>
          ))}
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-[rgba(94,169,135,0.14)] bg-[rgba(94,169,135,0.08)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--primary-strong)]">#{tag}</span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[rgba(123,166,214,0.12)] pt-3 text-[0.76rem] text-[var(--muted)]">
        <div className="flex items-center gap-4">
          <span>☆ 收藏 {post.favoriteCount}</span>
          <span>💬 评论 {post.commentCount}</span>
        </div>
        <span>{compact ? "查看详情" : "进入帖子"}</span>
      </div>
    </Link>
  );
}
