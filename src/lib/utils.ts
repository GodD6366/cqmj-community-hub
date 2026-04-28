import type { CommunityPost, PostCategory, SortMode, VisibilityScope } from "./types";

export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function splitTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[，,\n]/)
        .map((item) => normalizeText(item))
        .filter(Boolean),
    ),
  );
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatDateTime(value);
}

export function createId(prefix = "item") {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function uniquePosts<T extends { id: string; authorName: string; title: string; content: string; createdAt: string }>(posts: T[]) {
  const seen = new Set<string>();
  return posts.filter((post) => {
    const contentSignature = [post.authorName, post.title, post.content, post.createdAt].join("\u0000");
    if (seen.has(post.id) || seen.has(contentSignature)) return false;
    seen.add(post.id);
    seen.add(contentSignature);
    return true;
  });
}

export function filterPosts(
  posts: CommunityPost[],
  options: { category: PostCategory | "all"; query: string },
) {
  const query = options.query.trim().toLowerCase();
  return posts.filter((post) => {
    const byCategory = options.category === "all" || post.category === options.category;
    if (!byCategory) return false;
    if (!query) return true;
    const haystack = [post.title, post.content, post.authorName, ...post.tags].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export function sortPosts(posts: CommunityPost[], mode: SortMode) {
  const items = [...posts];
  if (mode === "featured") {
    return items.sort((a, b) => {
      const pinned = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinned !== 0) return pinned;
      const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featured !== 0) return featured;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  if (mode === "popular") {
    return items.sort((a, b) => {
      const scoreA = a.commentCount * 2 + a.favoriteCount + Number(Boolean(a.featured)) * 3 + Number(Boolean(a.pinned)) * 5;
      const scoreB = b.commentCount * 2 + b.favoriteCount + Number(Boolean(b.featured)) * 3 + Number(Boolean(b.pinned)) * 5;
      return scoreB - scoreA;
    });
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getPostBadge(category: PostCategory) {
  switch (category) {
    case "request":
      return "需求";
    case "secondhand":
      return "闲置";
    case "discussion":
      return "交流";
    case "play":
      return "约玩";
  }
}

export function getVisibilityLabel(scope: VisibilityScope) {
  switch (scope) {
    case "community":
      return "全小区可见";
    case "building":
      return "楼栋可见";
    case "private":
      return "私密可见";
  }
}
