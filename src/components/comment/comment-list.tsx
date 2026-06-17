"use client";

import { Button, TextArea } from "@heroui/react";
import { timeAgo } from "@/lib/utils";
import type { CommunityComment, CommunityUser } from "@/lib/types";

interface CommentListProps {
  comments: CommunityComment[];
  currentUser: CommunityUser | null;
  editingCommentId: string | null;
  editingCommentContent: string;
  onStartEdit: (commentId: string, content: string) => void;
  onCancelEdit: () => void;
  onEditContentChange: (content: string) => void;
  onEditSubmit: () => Promise<void>;
  busy: boolean;
}

export function CommentList({
  comments,
  currentUser,
  editingCommentId,
  editingCommentContent,
  onStartEdit,
  onCancelEdit,
  onEditContentChange,
  onEditSubmit,
  busy,
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="app-panel p-8 text-center text-sm text-muted-foreground">
        暂无评论，来发表第一条评论吧
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const isEditing = editingCommentId === comment.id;
        return (
          <div key={comment.id} className="app-panel p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-bold text-primary-strong">
                  {Array.from(comment.authorName)[0] ?? "匿"}
                </div>
                <span className="text-sm font-semibold">{comment.authorName}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
              </div>
              {comment.isMine && currentUser && !isEditing && (
                <Button className="min-h-11" size="sm" variant="ghost" onPress={() => onStartEdit(comment.id, comment.content)}>
                  编辑
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="mt-3 space-y-2">
                <TextArea
                  aria-label="编辑评论"
                  value={editingCommentContent}
                  onChange={(e) => onEditContentChange(e.target.value)}
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button className="min-h-11" size="sm" variant="ghost" onPress={onCancelEdit}>取消</Button>
                  <Button className="min-h-11" size="sm" variant="primary" isDisabled={!editingCommentContent.trim() || busy} onPress={() => { void onEditSubmit(); }}>
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
