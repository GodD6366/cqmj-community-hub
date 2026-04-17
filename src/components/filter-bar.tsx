"use client";

import { Button, Input, ScrollShadow } from "@heroui/react";
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
  const categories: Array<{ value: PostCategory | "all"; label: string }> = [
    { value: "all", label: "全部" },
    ...Object.entries(categoryMeta).map(([value, meta]) => ({ value: value as PostCategory, label: meta.badge })),
  ];

  function renderOptionBar<T extends string>(
    items: readonly { value: T; label: string }[],
    activeValue: T,
    onChange: (value: T) => void,
  ) {
    const renderButtons = () =>
      items.map((item) => (
        <Button
          key={item.value}
          className="min-w-[5rem]"
          onPress={() => onChange(item.value)}
          variant={activeValue === item.value ? "primary" : "secondary"}
        >
          {item.label}
        </Button>
      ));

    return (
      <>
        <div className="min-w-0 md:hidden">
          <ScrollShadow className="w-full max-w-full" hideScrollBar orientation="horizontal" size={42}>
            <div className="flex min-w-max gap-2 pb-1 pr-3">{renderButtons()}</div>
          </ScrollShadow>
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">{renderButtons()}</div>
      </>
    );
  }

  return (
    <div className="glass-card space-y-4 rounded-[1rem] p-4 sm:p-5">
      <div className="space-y-2">
        <p className="section-kicker">搜索与筛选</p>
        <Input
          aria-label="搜索帖子"
          fullWidth
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索标题、正文、标签、作者"
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">频道切换</p>
          {renderOptionBar(categories, category, onCategoryChange)}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">排序视角</p>
          {renderOptionBar(
            Object.entries(sortMeta).map(([value, meta]) => ({ value: value as SortMode, label: meta.label })),
            sort,
            onSortChange,
          )}
        </div>
      </div>
    </div>
  );
}
