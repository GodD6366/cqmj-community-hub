
import { formatDateTime } from "../lib/utils";
import type { CommunityComment } from "../lib/types";

interface CommentListProps {
  comments: CommunityComment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
        还没有评论，先发第一条吧。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <article key={comment.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-900">{comment.authorName}</span>
            <span className="text-slate-500">{formatDateTime(comment.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{comment.content}</p>
        </article>
      ))}
    </div>
  );
}
