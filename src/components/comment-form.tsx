"use client";

import { useState } from "react";

interface CommentFormProps {
  onSubmit: (content: string) => void | Promise<void>;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
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
      <label className="block text-sm font-medium text-slate-700" htmlFor="comment-content">
        发表评论
      </label>
      <textarea
        id="comment-content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
        placeholder="写下你的补充说明、问题反馈或交易确认"
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="flex justify-end">
        <button disabled={submitting} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60">
          {submitting ? "发送中..." : "发送评论"}
        </button>
      </div>
    </form>
  );
}
