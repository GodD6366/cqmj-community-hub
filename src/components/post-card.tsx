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

  return (
    <Link href={`/posts/${post.id}`} className="forum-row">
      <div className="flex flex-wrap items-center gap-2">
        <Chip color="accent" size="sm" variant="primary">
          {getPostBadge(post.category)}
        </Chip>
        <Chip size="sm" variant="soft">
          {getVisibilityLabel(post.visibility)}
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

      <div className="min-w-0">
        <div className="line-clamp-2 text-[1.02rem] font-semibold leading-6 text-slate-950">
          {post.title}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">
          {post.content}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
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

      <div className="forum-meta">
        <span>{post.authorName}</span>
        <span>{formatDateTime(post.createdAt)}</span>
        <span>{post.commentCount} 评论</span>
        <span>{post.favoriteCount} 收藏</span>
      </div>
    </Link>
  );
}
