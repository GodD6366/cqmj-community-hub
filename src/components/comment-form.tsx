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
      className="glass-card space-y-3.5 rounded-[1.2rem] p-4"
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
      <div className="space-y-1">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="comment-content">
          发表评论
        </label>
      </div>
      <TextArea
        id="comment-content"
        fullWidth
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        placeholder="写回复"
      />
      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button className="sm:w-auto" fullWidth isPending={submitting} type="submit">
          {submitting ? "发送中..." : "发送"}
        </Button>
      </div>
    </form>
  );
}
