"use client";

import { cn } from "@heroui/react";
import { CategoryGlyph } from "./category-glyph";
import { postCategoryTabs, type PostCategory } from "@/lib/types";

interface PostCategoryTabsProps {
  value?: PostCategory | null;
  onChange?: (value: PostCategory | null) => void;
  allowDeselect?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function PostCategoryTabs({
  value = null,
  onChange,
  allowDeselect = false,
  ariaLabel = "帖子分类",
  className,
}: PostCategoryTabsProps) {
  return (
    <div className={cn("publish-type-grid", className)} role="tablist" aria-label={ariaLabel}>
      {postCategoryTabs.map((item) => {
        const active = value === item.category;

        return (
          <button
            key={item.category}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn("publish-type-card", `tone-${item.tone}`, active && "is-active")}
            onClick={() => onChange?.(allowDeselect && active ? null : item.category)}
          >
            <span className="publish-type-icon">
              <CategoryGlyph category={item.category} />
            </span>
            <span className="publish-type-title">{item.title}</span>
            <span className="publish-type-desc">{item.description}</span>
          </button>
        );
      })}
    </div>
  );
}
