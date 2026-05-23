export type AdminTab = "users" | "invites" | "posts" | "polls" | "tickets";

export const adminTabs = ["users", "invites", "posts", "polls", "tickets"] as const;

export const adminTabMeta: Record<AdminTab, { label: string; shortLabel: string; description: string }> = {
  users: {
    label: "用户管理",
    shortLabel: "用户",
    description: "管理住户账号、房号绑定和启用状态。",
  },
  invites: {
    label: "邀请码管理",
    shortLabel: "邀请码",
    description: "创建、停用和删除邀请码。",
  },
  posts: {
    label: "帖子管理",
    shortLabel: "帖子",
    description: "查看并处理社区帖子内容。",
  },
  polls: {
    label: "投票管理",
    shortLabel: "投票",
    description: "查看邻里投票与参与情况。",
  },
  tickets: {
    label: "工单管理",
    shortLabel: "工单",
    description: "切换服务工单状态并同步通知。",
  },
};

export function isAdminTab(value: unknown): value is AdminTab {
  return typeof value === "string" && (adminTabs as readonly string[]).includes(value);
}

export function parseAdminTab(value: string | string[] | null | undefined): AdminTab {
  if (Array.isArray(value)) {
    return parseAdminTab(value[0]);
  }

  return isAdminTab(value) ? value : "users";
}

export function buildAdminTabHref(tab: AdminTab) {
  return `/admin?tab=${tab}`;
}
