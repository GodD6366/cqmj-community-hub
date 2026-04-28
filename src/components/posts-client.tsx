"use client";

import type { PostCategory } from "@/lib/types";
import { NeighborsClient } from "./neighbors-client";

export function PostsClient({
  initialCategory = "all",
  initialQuery = "",
}: {
  initialCategory?: PostCategory | "all";
  initialQuery?: string;
}) {
  return <NeighborsClient initialCategory={initialCategory} initialQuery={initialQuery} />;
}
