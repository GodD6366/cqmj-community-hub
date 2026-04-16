"use client";

import { useMemo, useState } from "react";
import type { PostCategory, PostDraft, VisibilityScope } from "../lib/types";
import { categoryMeta, visibilityMeta } from "../lib/types";
import { splitTags } from "../lib/utils";

interface PostEditorProps {
  onSubmit: (draft: PostDraft) => void | Promise<void>;
}

const categoryOptions = Object.entries(categoryMeta) as [PostCategory, (typeof categoryMeta)[PostCategory]][];
const visibilityOptions = Object.entries(visibilityMeta) as [VisibilityScope, (typeof visibilityMeta)[VisibilityScope]][];

export function PostEditor({ onSubmit }: PostEditorProps) {
  const [category, setCategory] = useState<PostCategory>("request");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("求助, 邻里互助");
  const [visibility, setVisibility] = useState<VisibilityScope>("community");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedTags = useMemo(() => splitTags(tags), [tags]);

  return (
    <form
      className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextTitle = title.trim();
        const nextContent = content.trim();
        if (!nextTitle) {
          setError("标题不能为空");
          return;
        }
        if (!nextContent) {
          setError("内容不能为空");
          return;
        }
        if (parsedTags.length === 0) {
          setError("请至少填写一个标签");
          return;
        }
        setError("");
        setSubmitting(true);
        try {
          await onSubmit({
            title: nextTitle,
            content: nextContent,
            category,
            tags: parsedTags,
            visibility,
            anonymous,
          });
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "发布失败");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <div>
        <p className="text-sm font-medium text-slate-500">发布内容</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">发一条对邻里有帮助的帖子</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          先选择类型，再填写标题和内容。建议标题具体、标签清晰，方便大家快速找到你的帖子。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {categoryOptions.map(([value, meta]) => (
          <button
            key={value}
            type="button"
            onClick={() => setCategory(value)}
            className={`rounded-3xl border px-4 py-4 text-left transition ${
              category === value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
            }`}
          >
            <p className="text-base font-semibold">{meta.label}</p>
            <p className={`mt-1 text-sm ${category === value ? "text-slate-200" : "text-slate-500"}`}>
              {meta.description}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>标题</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            placeholder="例如：求助：周末有没有靠谱的空调清洗师傅？"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>可见范围</span>
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as VisibilityScope)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          >
            {visibilityOptions.map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>内容</span>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={7}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          placeholder="补充说明、价格范围、时间要求、交易方式等"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>标签</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            placeholder="使用逗号分隔，例如：家政, 周末, 推荐"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          <input
            checked={anonymous}
            onChange={(event) => setAnonymous(event.target.checked)}
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
          />
          匿名发布
        </label>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <div className="text-sm text-slate-500">当前标签：{parsedTags.map((tag) => `#${tag}`).join(" · ")}</div>
        <button
          disabled={submitting}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "发布中..." : "立即发布"}
        </button>
      </div>
    </form>
  );
}
