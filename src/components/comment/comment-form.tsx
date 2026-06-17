"use client";

import { useState } from "react";
import { Button, TextArea } from "@heroui/react";
import type { CommunityUser } from "@/lib/types";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  isSubmitting: boolean;
  currentUser: CommunityUser | null;
}

export function CommentForm({ onSubmit, isSubmitting, currentUser }: CommentFormProps) {
  const [content, setContent] = useState("");

  async function handleSubmit() {
    if (!content.trim()) return;
    await onSubmit(content.trim());
    setContent("");
  }

  if (!currentUser) {
    return (
      <div className="app-panel p-4 text-center text-sm text-muted-foreground">
        请先登录后再发表评论
      </div>
    );
  }

  return (
    <div className="app-panel space-y-3 p-4">
      <TextArea
        aria-label="发表评论"
        placeholder="写下你的评论..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <div className="flex justify-end">
        <Button
          className="min-h-11 font-bold"
          variant="primary"
          isDisabled={!content.trim() || isSubmitting}
          onPress={() => { void handleSubmit(); }}
          size="sm"
        >
          {isSubmitting ? "发布中..." : "发表评论"}
        </Button>
      </div>
    </div>
  );
}
