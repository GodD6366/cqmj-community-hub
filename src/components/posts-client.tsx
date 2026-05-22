"use client";

import type { PostCategory } from "@/lib/types";
import { NeighborsClient } from "./neighbors-client";

export function PostsClient({
  initialCategory = "all",
  initialQuery = "",
  initialMode = "all",
}: {
  initialCategory?: PostCategory | "all";
  initialQuery?: string;
  initialMode?: "all" | "mine" | "favorites";
}) {
  return <NeighborsClient initialCategory={initialCategory} initialMode={initialMode} initialQuery={initialQuery} />;
}
