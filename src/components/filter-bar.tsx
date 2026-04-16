
"use client";

import type { PostCategory, SortMode } from "../lib/types";
import { categoryMeta, sortMeta } from "../lib/types";

interface FilterBarProps {
  category: PostCategory | "all";
  onCategoryChange: (value: PostCategory | "all") => void;
  sort: SortMode;
  onSortChange: (value: SortMode) => void;
  query: string;
  onQueryChange: (value: string) => void;
}

export function FilterBar({
  category,
  onCategoryChange,
  sort,
  onSortChange,
  query,
  onQueryChange,
}: FilterBarProps) {
  const categories = [
    { value: "all", label: "全部" },
    ...Object.entries(categoryMeta).map(([value, meta]) => ({ value, label: meta.badge })),
  ] as const;

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">筛选和排序</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">快速找到需要的信息</h2>
        </div>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 lg:max-w-sm"
          placeholder="搜索标题、正文、标签、作者"
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onCategoryChange(item.value as PostCategory | "all")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                category === item.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(sortMeta).map(([value, meta]) => (
            <button
              key={value}
              type="button"
              onClick={() => onSortChange(value as SortMode)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                sort === value
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
