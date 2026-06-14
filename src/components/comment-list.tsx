import { formatDateTime } from "../lib/utils";
import type { CommunityComment } from "../lib/types";
import { EmptyState, ResidentAvatar, ResidentListRow } from "./resident-shared";

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
        <ResidentListRow
          key={comment.id}
          leading={<ResidentAvatar name={comment.authorName} size="sm" />}
          meta={<span>#{String(index + 1).padStart(2, "0")}</span>}
          subtitle={
            <div className="grid gap-2">
              <span className="text-xs text-[var(--muted)]">{formatDateTime(comment.createdAt)}</span>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{comment.content}</p>
            </div>
          }
          title={<span className="truncate">{comment.authorName}</span>}
        />
      ))}
    </div>
  );
}
