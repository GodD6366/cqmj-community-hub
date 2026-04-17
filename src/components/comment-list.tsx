import { Avatar, Card, Chip } from "@heroui/react";
import { formatDateTime } from "../lib/utils";
import type { CommunityComment } from "../lib/types";

interface CommentListProps {
  comments: CommunityComment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="paper-panel rounded-[1.3rem] border border-dashed p-6 text-sm leading-6 text-slate-500">
        还没有评论，先发第一条吧。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <Card key={comment.id} className="glass-card p-4">
          <Card.Header className="flex flex-row items-center justify-between gap-3 p-0">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="bg-[var(--primary-soft)] text-[var(--primary)]" size="sm">
                <Avatar.Fallback>{comment.authorName.slice(0, 1).toUpperCase()}</Avatar.Fallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{comment.authorName}</div>
              </div>
            </div>
            <Chip size="sm" variant="soft">
              {formatDateTime(comment.createdAt)}
            </Chip>
          </Card.Header>
          <Card.Content className="p-0 pt-4">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{comment.content}</p>
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
