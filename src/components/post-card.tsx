import Link from "next/link";
import { Chip } from "@heroui/react";
import { formatDateTime, getPostBadge, getVisibilityLabel } from "../lib/utils";
import type { CommunityPost } from "../lib/types";

interface PostCardProps {
  post: CommunityPost;
}

export function PostCard({ post }: PostCardProps) {
  const visibleTags = post.tags.slice(0, 2);
  const extraTagCount = post.tags.length - visibleTags.length;
  const firstImage = post.images[0];

  return (
    <Link
      href={`/posts/${post.id}`}
      className={`forum-row ${firstImage ? "sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4" : ""}`}
    >
      {firstImage ? (
        <div className="aspect-[4/3] overflow-hidden rounded-[1rem] bg-[var(--surface-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured CDN URLs are not a fit for static remotePatterns here. */}
          <img
            alt={post.title}
            className="h-full w-full object-cover"
            src={firstImage.url}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Chip color="accent" size="sm" variant="primary">
          {getPostBadge(post.category)}
        </Chip>
        <Chip size="sm" variant="soft">
          {getVisibilityLabel(post.visibility)}
        </Chip>
        {firstImage ? (
          <Chip size="sm" variant="soft">
            有图
          </Chip>
        ) : null}
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

      <div className={`min-w-0 ${firstImage ? "sm:col-start-2" : ""}`}>
        <div className="line-clamp-2 text-[1.02rem] font-semibold leading-6 text-slate-950">
          {post.title}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">
          {post.content}
        </p>
      </div>

      <div className={`flex flex-wrap gap-2 ${firstImage ? "sm:col-start-2" : ""}`}>
        {visibleTags.map((tag) => (
          <Chip key={tag} size="sm" variant="secondary">
            #{tag}
          </Chip>
        ))}
        {extraTagCount > 0 ? (
          <Chip size="sm" variant="soft">
            +{extraTagCount}
          </Chip>
        ) : null}
      </div>

      <div className={`forum-meta ${firstImage ? "sm:col-start-2" : ""}`}>
        <span>{post.authorName}</span>
        <span>{formatDateTime(post.createdAt)}</span>
        <span>{post.commentCount} 评论</span>
        <span>{post.favoriteCount} 收藏</span>
      </div>
    </Link>
  );
}
