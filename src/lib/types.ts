export type PostCategory = "request" | "secondhand" | "discussion" | "play";
export type SortMode = "latest" | "popular" | "featured";
export type VisibilityScope = "community" | "building" | "private";
export type PostStatus = "published" | "pending" | "rejected";

export const postCategories = ["request", "secondhand", "discussion", "play"] as const;

export function isPostCategory(value: unknown): value is PostCategory {
  return typeof value === "string" && (postCategories as readonly string[]).includes(value);
}

export function parsePostCategoryFilter(value: string | null | undefined): PostCategory | "all" {
  return isPostCategory(value) ? value : "all";
}

export interface CommunityComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  tags: string[];
  authorName: string;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  favoriteCount: number;
  visibility: VisibilityScope;
  status: PostStatus;
  comments: CommunityComment[];
  pinned?: boolean;
  featured?: boolean;
  favorited?: boolean;
  reported?: boolean;
}

export interface CommunityUser {
  id: string;
  username: string;
  roomNumber: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface PostDraft {
  title: string;
  content: string;
  category: PostCategory;
  tags: string[];
  visibility: VisibilityScope;
  anonymous: boolean;
}

export const categoryMeta: Record<
  PostCategory,
  { label: string; badge: string; accent: string; description: string }
> = {
  request: {
    label: "发布需求",
    badge: "需求",
    accent: "from-emerald-500 to-teal-500",
    description: "找维修、找家政、找服务、找推荐。",
  },
  secondhand: {
    label: "卖闲置",
    badge: "闲置",
    accent: "from-amber-500 to-orange-500",
    description: "转让、免费送、以物换物，减少浪费。",
  },
  discussion: {
    label: "发帖交流",
    badge: "交流",
    accent: "from-sky-500 to-blue-500",
    description: "公告、讨论、反馈、经验分享。",
  },
  play: {
    label: "发起约玩",
    badge: "约玩",
    accent: "from-rose-500 to-orange-400",
    description: "组队运动、桌游、遛娃、饭搭子、同路活动。",
  },
};

export const visibilityMeta: Record<
  VisibilityScope,
  { label: string; description: string }
> = {
  community: { label: "全小区可见", description: "适合公告、交流和公开售卖。" },
  building: { label: "楼栋可见", description: "适合小范围互助、临时通知。" },
  private: { label: "私密可见", description: "适合比较敏感的求助或交易。" },
};

export const sortMeta: Record<
  SortMode,
  { label: string; description: string }
> = {
  latest: { label: "最新", description: "按发布时间排序" },
  popular: { label: "最热", description: "按互动热度排序" },
  featured: { label: "精选", description: "优先显示置顶和精选内容" },
};
