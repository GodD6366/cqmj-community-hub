"use client";

import type { PostCategory } from "@/lib/types";
import { postCategoryTabs } from "@/lib/types";
import { cn } from "@heroui/react";

const toneClasses: Record<string, string> = {
  green: "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:border-primary hover:bg-primary/8",
  orange: "data-[selected=true]:bg-clay data-[selected=true]:text-clay-foreground data-[selected=true]:border-clay hover:bg-clay/8",
  cyan: "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:border-accent hover:bg-accent/8",
  teal: "data-[selected=true]:bg-success data-[selected=true]:text-success-foreground data-[selected=true]:border-success hover:bg-success/8",
};

interface PostCategoryTabsProps {
  value: PostCategory | null;
  onChange: (category: PostCategory | null) => void;
  allowDeselect?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function PostCategoryTabs({
  value,
  onChange,
  allowDeselect = false,
  ariaLabel = "筛选帖子分类",
  className,
}: PostCategoryTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group" aria-label={ariaLabel}>
      {postCategoryTabs.map((tab) => {
        const isSelected = value === tab.category;
        return (
          <button
            key={tab.category}
            type="button"
            data-selected={isSelected ? "true" : undefined}
            aria-pressed={isSelected}
            className={cn(
              "app-chip min-h-11 border bg-white/64 px-3.5 py-2 text-xs font-bold transition-all",
              "border-border text-muted-foreground shadow-sm",
              toneClasses[tab.tone] ?? ""
            )}
            onClick={() => {
              if (allowDeselect && isSelected) {
                onChange(null);
              } else {
                onChange(tab.category);
              }
            }}
          >
            <span>{tab.title}</span>
            <span className="ml-1 hidden text-[0.65rem] opacity-70 sm:inline">{tab.description}</span>
          </button>
        );
      })}
    </div>
  );
}
