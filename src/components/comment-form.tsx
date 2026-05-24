"use client";

import { useState } from "react";
import { Alert, Button, TextArea } from "@heroui/react";

interface CommentFormProps {
  onSubmit: (content: string) => void | Promise<void>;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="terminal-comment-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const value = content.trim();
        if (!value) {
          setError("评论内容不能为空");
          return;
        }
        setError("");
        setSubmitting(true);
        try {
          await onSubmit(value);
          setContent("");
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "评论发布失败");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <TextArea id="comment-content" fullWidth value={content} onChange={(event) => setContent(event.target.value)} rows={3} placeholder="写下你的评论..." />
      {error ? <Alert status="danger"><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-[var(--muted)]">支持换行，提交后会实时同步。</div>
        <Button className="sm:w-auto" fullWidth isPending={submitting} type="submit">{submitting ? "发送中..." : "发送"}</Button>
      </div>
    </form>
  );
}
