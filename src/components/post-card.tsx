import Link from "next/link";
import { Card, Chip } from "@heroui/react";
import { formatDateTime, getVisibilityLabel, getPostBadge, timeAgo } from "../lib/utils";
import type { CommunityPost } from "../lib/types";

interface PostCardProps {
  post: CommunityPost;
}

export function PostCard({ post }: PostCardProps) {
  const visibleTags = post.tags.slice(0, 3);
  const extraTagCount = post.tags.length - visibleTags.length;

  return (
    <Card className="glass-card overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="border-b-2 border-[var(--border-strong)] bg-[var(--surface-muted)] p-4 md:border-r-2 md:border-b-0">
          <div className="text-[11px] font-bold tracking-[0.22em] text-slate-500 uppercase">分类</div>
          <div className="mt-3">
            <Chip color="accent" variant="primary">{getPostBadge(post.category)}</Chip>
          </div>
          <div className="mt-5 space-y-2 text-xs text-slate-600">
            <div>{timeAgo(post.createdAt)}</div>
            <div>{getVisibilityLabel(post.visibility)}</div>
            {post.pinned ? <div className="font-semibold text-[var(--danger)]">置顶</div> : null}
            {post.featured ? <div className="font-semibold text-[var(--warning)]">精选</div> : null}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <Card.Header className="p-0">
            <div className="w-full space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                <span>{post.authorName}</span>
                <span>·</span>
                <span>{formatDateTime(post.createdAt)}</span>
              </div>
              <Card.Title className="text-balance text-2xl font-semibold leading-tight tracking-tight text-slate-950">
                <Link href={`/posts/${post.id}`} className="transition hover:text-[var(--accent)]">
                  {post.title}
                </Link>
              </Card.Title>
              <Card.Description className="line-clamp-3 text-sm leading-7 text-slate-700">
                {post.content}
              </Card.Description>
            </div>
          </Card.Header>

          <Card.Content className="flex flex-wrap gap-2 border-t border-dashed border-[var(--separator)] p-0 pt-4">
            {visibleTags.map((tag) => (
              <Chip key={tag} size="sm" variant="secondary">
                #{tag}
              </Chip>
            ))}
            {extraTagCount > 0 ? <Chip size="sm" variant="soft">+{extraTagCount}</Chip> : null}
          </Card.Content>

          <Card.Footer className="mt-4 grid gap-3 border-t-2 border-[var(--border-strong)] p-0 pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex flex-wrap gap-2">
              <Chip size="sm" variant="soft">评论 {post.commentCount}</Chip>
              <Chip size="sm" variant="soft">收藏 {post.favoriteCount}</Chip>
            </div>
            <Link
              href={`/posts/${post.id}`}
              className="inline-flex items-center justify-center rounded-[0.8rem] border-2 border-[var(--border-strong)] bg-[var(--signal)] px-4 py-2 text-sm font-semibold text-[var(--primary-strong)] shadow-[4px_4px_0_rgba(18,18,18,0.08)]"
            >
              打开帖子
            </Link>
          </Card.Footer>
        </div>
      </div>
    </Card>
  );
}
