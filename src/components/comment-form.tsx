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
      className="glass-card space-y-4 rounded-[1.4rem] p-4 sm:p-5"
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
        <p className="text-xs leading-5 text-slate-500">补充进展、确认交易细节，或给邻居更明确的回复。</p>
      </div>
      <TextArea
        id="comment-content"
        fullWidth
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={4}
        placeholder="写下你的补充说明、问题反馈或交易确认"
      />
      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs leading-5 text-slate-500">建议写明时间、地点或联系方式偏好，方便对方继续跟进。</div>
        <Button className="sm:w-auto" fullWidth isPending={submitting} type="submit">
          {submitting ? "发送中..." : "发送评论"}
        </Button>
      </div>
    </form>
  );
}
