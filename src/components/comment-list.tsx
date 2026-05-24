import { formatDateTime } from "../lib/utils";
import type { CommunityComment } from "../lib/types";
import { EmptyState, ResidentAvatar } from "./resident-shared";

interface CommentListProps {
  comments: CommunityComment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return <EmptyState title="还没有评论" description="先发第一条回复，帮楼主把讨论带起来。" />;
  }

  return (
    <div className="space-y-3">
      {comments.map((comment, index) => (
        <article key={comment.id} className="terminal-comment-item">
          <div className="flex items-start gap-3">
            <ResidentAvatar name={comment.authorName} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-semibold text-slate-950">{comment.authorName}</div>
                <div className="text-xs text-[var(--muted)]">#{String(index + 1).padStart(2, "0")}</div>
              </div>
              <div className="mt-1 text-xs text-[var(--muted)]">{formatDateTime(comment.createdAt)}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">{comment.content}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
