import Link from "next/link";
import { Chip } from "@heroui/react";
import { getPostBadge, getVisibilityLabel, timeAgo } from "@/lib/utils";
import type { CommunityPost } from "@/lib/types";
import { requestStatusMeta } from "@/lib/types";
import { StarIcon, CommentIcon, BuildingIcon, ChevronRightIcon } from "../app-icons";

interface PostCardProps {
  post: CommunityPost;
  compact?: boolean;
}

function getCategoryTone(category: CommunityPost["category"]) {
  switch (category) {
    case "request": return "border-primary/24 bg-primary/10 text-primary-strong";
    case "secondhand": return "border-accent/26 bg-accent/12 text-accent";
    case "discussion": return "border-warning/24 bg-warning/12 text-warning";
    case "play": return "border-success/24 bg-success/10 text-success";
  }
}

function getStatusTone(tone: string) {
  if (tone === "green") return "border-primary/24 bg-primary/10 text-primary-strong";
  if (tone === "amber") return "border-warning/24 bg-warning/12 text-warning";
  return "border-accent/24 bg-accent/10 text-accent";
}

export function PostCard({ post, compact = false }: PostCardProps) {
  const images = post.images.slice(0, compact ? 1 : 3);
  const tags = post.tags.slice(0, compact ? 2 : 3);
  const categoryTone = getCategoryTone(post.category);

  return (
    <Link
      href={`/posts/${post.id}`}
      className="app-panel group block p-4 transition duration-150 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_22px_58px_rgba(27,54,71,0.14)]"
    >
      {/* 头部：作者 + 分类 + 可见范围 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/18 to-accent/16 text-sm font-bold text-primary-strong ring-1 ring-primary/15">
            {Array.from(post.authorName)[0] ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{post.authorName}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${categoryTone}`}>
                {getPostBadge(post.category)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{timeAgo(post.createdAt)}</div>
          </div>
        </div>
        <span className="map-coordinate shrink-0 border-border/80 text-[0.62rem] normal-case tracking-normal">
          <BuildingIcon className="h-3.5 w-3.5" />
          {getVisibilityLabel(post.visibility)}
        </span>
      </div>

      {/* 徽章行 */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {post.pinned && (
          <Chip size="sm" color="warning" variant="soft">置顶</Chip>
        )}
        {post.featured && (
          <Chip size="sm" color="default" variant="soft">精选</Chip>
        )}
        {post.attachments.length > 0 && (
          <Chip size="sm" variant="soft">{post.attachments.length} 个附件</Chip>
        )}
        {post.category === "request" && post.requestStatus && (
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(requestStatusMeta[post.requestStatus].tone)}`}>
            {requestStatusMeta[post.requestStatus].label}
          </span>
        )}
      </div>

      {/* 标题和内容预览 */}
      <h3 className={`app-display mt-3 leading-snug text-foreground ${compact ? "text-lg line-clamp-2" : "text-2xl line-clamp-2"}`}>
        {post.title}
      </h3>
      <p className={`mt-2 whitespace-pre-wrap leading-7 text-muted-foreground ${compact ? "line-clamp-3 text-sm" : "line-clamp-3 text-sm"}`}>
        {post.content}
      </p>

      {/* 图片网格 */}
      {images.length > 0 && (
        <div className={`mt-2.5 grid gap-1.5 ${images.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
          {images.map((image, index) => (
            <div
              key={image.id}
                className={`overflow-hidden rounded-2xl border bg-muted/30 ${images.length === 1 ? "aspect-[16/10]" : "aspect-square"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${post.title} ${index + 1}`}
                className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                src={image.url}
              />
            </div>
          ))}
        </div>
      )}

      {/* 标签 */}
      {tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-primary/20 bg-primary/7 px-2.5 py-1 text-xs font-semibold text-primary-strong"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 底部互动统计 */}
      <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <StarIcon className="h-3.5 w-3.5" />
            收藏 {post.favoriteCount}
          </span>
          <span className="flex items-center gap-1">
            <CommentIcon className="h-3.5 w-3.5" />
            评论 {post.commentCount}
          </span>
        </div>
        <span className="flex items-center gap-1 font-bold text-primary-strong transition-transform group-hover:translate-x-0.5">
          {compact ? "查看详情" : "进入帖子"}
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
