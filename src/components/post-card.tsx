
import Link from "next/link";
import { categoryMeta } from "../lib/types";
import { formatDateTime, getVisibilityLabel, getPostBadge, timeAgo } from "../lib/utils";
import type { CommunityPost } from "../lib/types";

interface PostCardProps {
  post: CommunityPost;
}

export function PostCard({ post }: PostCardProps) {
  const meta = categoryMeta[post.category];
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">{getPostBadge(post.category)}</span>
        {post.pinned ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">置顶</span> : null}
        {post.featured ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">精选</span> : null}
        <span>{getVisibilityLabel(post.visibility)}</span>
        <span>·</span>
        <span>{timeAgo(post.createdAt)}</span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">
            <Link href={`/posts/${post.id}`} className="hover:text-slate-700">
              {post.title}
            </Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{post.content}</p>
        </div>
        <div className={`hidden h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br ${meta.accent} sm:block`} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {post.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <div>
          <span className="font-medium text-slate-700">{post.authorName}</span>
          <span className="mx-2">·</span>
          <span>{formatDateTime(post.createdAt)}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>评论 {post.commentCount}</span>
          <span>收藏 {post.favoriteCount}</span>
        </div>
      </div>
    </article>
  );
}
