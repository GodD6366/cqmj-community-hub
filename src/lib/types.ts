export type PostCategory = "request" | "secondhand" | "discussion" | "play";
export type SortMode = "latest" | "popular" | "featured";
export type VisibilityScope = "community" | "building" | "private";
export type PostStatus = "published" | "pending" | "rejected";
export type PollStatus = "active" | "closed";
export type ServiceTicketCategory = "repair" | "complaint" | "cleaning" | "facility" | "other";
export type ServiceTicketStatus = "open" | "processing" | "resolved";
export type NotificationType = "comment" | "favorite" | "poll" | "ticket" | "group" | "system";

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

export interface PostImage {
  id: string;
  objectKey: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  sortOrder: number;
}

export interface DraftPostImage {
  id?: string;
  objectKey: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  sortOrder: number;
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
  images: PostImage[];
  pinned?: boolean;
  featured?: boolean;
  favorited?: boolean;
  reported?: boolean;
}

export interface PollOptionSummary {
  id: string;
  label: string;
  voteCount: number;
}

export interface PollSummary {
  id: string;
  title: string;
  description: string;
  authorName: string;
  status: PollStatus;
  endsAt: string | null;
  createdAt: string;
  totalVotes: number;
  options: PollOptionSummary[];
  hasVoted: boolean;
  selectedOptionId: string | null;
}

export interface PollDraft {
  title: string;
  description: string;
  options: string[];
  endsAt?: string | null;
}

export interface ServiceTicketSummary {
  id: string;
  title: string;
  description: string;
  category: ServiceTicketCategory;
  status: ServiceTicketStatus;
  authorName: string;
  roomNumber: string;
  assigneeNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  isMine: boolean;
}

export interface ServiceTicketDraft {
  title: string;
  description: string;
  category: ServiceTicketCategory;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface CommunityUser {
  id: string;
  username: string;
  roomNumber: string;
  role: "user" | "admin";
  mcpTokenVersion: number;
  createdAt: string;
}

export interface ResidentAppData {
  posts: CommunityPost[];
  polls: PollSummary[];
  serviceTickets: ServiceTicketSummary[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  currentUser: CommunityUser | null;
}

export interface AdminUser {
  id: string;
  username: string;
  roomNumber: string;
  role: "user" | "admin";
  disabled: boolean;
  createdAt: string;
  postCount: number;
  commentCount: number;
}

export interface PostDraft {
  title: string;
  content: string;
  category: PostCategory;
  tags: string[];
  visibility: VisibilityScope;
  anonymous: boolean;
  images: DraftPostImage[];
}

export const categoryMeta: Record<
  PostCategory,
  { label: string; badge: string; accent: string; description: string }
> = {
  request: {
    label: "发布需求",
    badge: "需求",
    accent: "from-sky-500 to-blue-500",
    description: "找维修、找家政、找服务、找推荐。",
  },
  secondhand: {
    label: "发闲置",
    badge: "闲置",
    accent: "from-emerald-500 to-teal-500",
    description: "转让、免费送、以物换物，减少浪费。",
  },
  discussion: {
    label: "发帖子",
    badge: "帖子",
    accent: "from-violet-500 to-fuchsia-500",
    description: "公告、讨论、反馈、经验分享。",
  },
  play: {
    label: "发起约玩",
    badge: "约玩",
    accent: "from-amber-500 to-orange-400",
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

export const pollStatusMeta: Record<PollStatus, { label: string; tone: "accent" | "success" }> = {
  active: { label: "进行中", tone: "accent" },
  closed: { label: "已结束", tone: "success" },
};

export const serviceTicketCategoryMeta: Record<
  ServiceTicketCategory,
  { label: string; description: string }
> = {
  repair: { label: "报修报事", description: "设备故障、维修申请、应急处理。" },
  complaint: { label: "投诉建议", description: "物业服务、噪音秩序、治理反馈。" },
  cleaning: { label: "保洁环境", description: "清运、消杀、卫生维护与巡检。" },
  facility: { label: "公共设施", description: "门禁、电梯、照明、停车等公共问题。" },
  other: { label: "其他服务", description: "暂不归类的服务申请与补充说明。" },
};

export const serviceTicketStatusMeta: Record<
  ServiceTicketStatus,
  { label: string; description: string; tone: "warning" | "accent" | "success" }
> = {
  open: { label: "待处理", description: "工单已提交，等待受理。", tone: "warning" },
  processing: { label: "处理中", description: "已进入处理流程。", tone: "accent" },
  resolved: { label: "已完成", description: "工单已处理完成。", tone: "success" },
};

export const notificationTypeMeta: Record<
  NotificationType,
  { label: string; icon: string }
> = {
  comment: { label: "评论提醒", icon: "💬" },
  favorite: { label: "收藏提醒", icon: "⭐" },
  poll: { label: "投票动态", icon: "📊" },
  ticket: { label: "工单动态", icon: "🛠" },
  group: { label: "群组动态", icon: "👥" },
  system: { label: "系统通知", icon: "🔔" },
};
