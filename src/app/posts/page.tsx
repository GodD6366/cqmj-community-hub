
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { listPostsForViewer } from "@/lib/community-server";
import { PostsClient } from "../../components/posts-client";
import { parsePostCategoryFilter } from "@/lib/types";
import type { PostCategory, SortMode } from "@/lib/types";

interface PostsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function parseSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const currentUser = await getCurrentUserFromCookie();
  const initialPosts = await listPostsForViewer(currentUser?.id ?? null);
  const params = (await searchParams) ?? {};

  const category = parseSingle(params.category);
  const sort = parseSingle(params.sort);
  const query = parseSingle(params.q) ?? "";

  const initialCategory: PostCategory | "all" = parsePostCategoryFilter(category);
  const initialSort: SortMode =
    sort === "latest" || sort === "popular" || sort === "featured" ? sort : "latest";

  return <PostsClient initialPosts={initialPosts} initialCategory={initialCategory} initialSort={initialSort} initialQuery={query} />;
}
