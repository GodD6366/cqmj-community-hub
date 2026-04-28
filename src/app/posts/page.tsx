import { PostsClient } from "../../components/posts-client";
import { parsePostCategoryFilter } from "@/lib/types";
import type { PostCategory } from "@/lib/types";

interface PostsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function parseSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = (await searchParams) ?? {};

  const category = parseSingle(params.category);
  const query = parseSingle(params.q) ?? "";

  const initialCategory: PostCategory | "all" = parsePostCategoryFilter(category);

  return <PostsClient initialCategory={initialCategory} initialQuery={query} />;
}
