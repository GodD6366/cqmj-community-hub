export type AdminTab = "users" | "invites" | "posts";

export const adminTabs = ["users", "invites", "posts"] as const;

export const adminTabMeta: Record<AdminTab, { label: string; description: string }> = {
  users: {
    label: "用户管理",
    description: "管理住户账号、房号绑定和启用状态。",
  },
  invites: {
    label: "邀请码管理",
    description: "创建、停用和删除邀请码。",
  },
  posts: {
    label: "帖子管理",
    description: "查看并处理社区帖子内容。",
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
