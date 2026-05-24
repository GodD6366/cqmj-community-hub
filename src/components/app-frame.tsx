"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCommunityPosts } from "./community-provider";
import { SystemLogo } from "./system-logo";
import {
  HomeIcon,
  MessagesIcon,
  PublishIcon,
  ServiceIcon,
  UserIcon,
  VoteIcon,
} from "./app-icons";
import { getCommunityName } from "@/lib/community-brand";

const communityName = getCommunityName();

const desktopNavigationItems = [
  { key: "home", href: "/", label: "社区首页", meta: "Feed", icon: HomeIcon },
  { key: "neighbors", href: "/neighbors", label: "投票", meta: "Voting", icon: VoteIcon },
  { key: "services", href: "/services", label: "工单服务", meta: "Service Desk", icon: ServiceIcon },
  { key: "messages", href: "/messages", label: "消息中心", meta: "Inbox", icon: MessagesIcon },
  { key: "me", href: "/me", label: "个人中心", meta: "Profile", icon: UserIcon },
] as const;

const mobileNavigationItems = [
  { key: "home", href: "/", label: "首页", icon: HomeIcon },
  { key: "neighbors", href: "/neighbors", label: "投票", icon: VoteIcon },
  { key: "publish", href: "/publish", label: "发布", icon: PublishIcon, isPublish: true },
  { key: "messages", href: "/messages", label: "消息", icon: MessagesIcon },
  { key: "me", href: "/me", label: "我的", icon: UserIcon },
] as const;

function isResidentExperience(pathname: string) {
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return false;
  if (pathname === "/mcp") return false;
  return true;
}

function getActiveKey(pathname: string) {
  if (pathname === "/" || pathname.startsWith("/posts") || pathname.startsWith("/publish")) return "home";
  if (pathname.startsWith("/neighbors") || pathname.startsWith("/polls")) return "neighbors";
  if (pathname.startsWith("/services")) return "services";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/me") || pathname.startsWith("/about") || pathname.startsWith("/rules") || pathname.startsWith("/mcp/connect") || pathname.startsWith("/login")) return "me";
  return null;
}

function getPageMeta(pathname: string) {
  if (pathname === "/") return { title: "社区终端", description: "社区动态与邻里互助" };
  if (pathname.startsWith("/posts")) return { title: "社区动态", description: "需求、闲置、交流、约玩" };
  if (pathname.startsWith("/neighbors")) return { title: "投票", description: "社区投票与意见征集" };
  if (pathname.startsWith("/polls")) return { title: "投票详情", description: "社区治理与意见征集" };
  if (pathname.startsWith("/services")) return { title: "工单服务", description: "物业报修与处理进度" };
  if (pathname.startsWith("/messages")) return { title: "消息中心", description: "评论、收藏、投票与系统提醒" };
  if (pathname.startsWith("/publish")) return { title: "发布内容", description: "发帖、报修、投票、活动" };
  if (pathname.startsWith("/me")) return { title: "个人中心", description: "我的互动、工单与账户信息" };
  return { title: communityName, description: "让社区投票更直接" };
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser, unreadNotificationCount } = useCommunityPosts();
  const residentExperience = isResidentExperience(pathname);
  const activeKey = getActiveKey(pathname);
  const pageMeta = getPageMeta(pathname);

  if (!residentExperience) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="app-stage">
      <div className="app-shell">
        <aside className="app-shell-sidebar">
          <div className="app-shell-sidebar-inner">
            <div className="app-shell-brand">
              <SystemLogo className="items-start gap-0" markClassName="h-12 w-12" showLabel={false} />
              <div className="app-shell-brand-title">
                社区终端 · <span className="app-shell-brand-highlight">Community Terminal</span>
              </div>
              <div className="app-shell-brand-subtitle">居民互助 · 公开透明 · Mobile-first</div>
              <div className="app-shell-brand-kicker" style={{ marginTop: "0.85rem" }}>
                动态 · 投票 · 消息 · 我的
              </div>
            </div>

            <section className="cyber-terminal">
              <div className="cyber-terminal-title">Community_Terminal v1.0.0</div>
              <pre>{`> CONNECTING TO NEIGHBORHOOD... OK\n> AUTH SESSION............... ${currentUser ? "RESIDENT" : "GUEST"}\n> CURRENT ROOM............... ${currentUser?.roomNumber ?? "UNBOUND"}\n> UNREAD MESSAGES............ ${unreadNotificationCount}\n\n{ TERMINAL ONLINE }`}</pre>
            </section>

            <nav className="app-shell-nav" aria-label="桌面主导航">
              {desktopNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeKey === item.key || (item.key === "services" && pathname.startsWith("/services"));
                const showBadge = item.key === "messages" && unreadNotificationCount > 0;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`app-shell-link ${isActive ? "is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="app-shell-link-icon"><Icon /></span>
                    <span className="app-shell-link-copy">
                      <span className="app-shell-link-title">{item.label}</span>
                      <span className="app-shell-link-meta">{item.meta}</span>
                    </span>
                    {showBadge ? <span className="app-shell-badge">{Math.min(unreadNotificationCount, 99)}</span> : null}
                  </Link>
                );
              })}
            </nav>

            <div className="app-shell-footer">
              <Link href="/publish" className="app-chip" style={{ justifyContent: "center", padding: "0.85rem 1rem" }}>
                <PublishIcon />
                <span style={{ marginLeft: 8 }}>快速发布</span>
              </Link>
              {currentUser ? (
                <Link href="/me" className="app-shell-user">
                  <span className="app-shell-user-mark">{Array.from(currentUser.username)[0] ?? "我"}</span>
                  <span>
                    <span className="app-shell-user-name">{currentUser.username}</span>
                    <span className="app-shell-user-meta">{currentUser.roomNumber}{currentUser.role === "admin" ? " · 管理员" : ""}</span>
                  </span>
                </Link>
              ) : (
                <Link href="/login" className="app-shell-user">
                  <span className="app-shell-user-mark">登</span>
                  <span>
                    <span className="app-shell-user-name">访客模式</span>
                    <span className="app-shell-user-meta">登录后解锁完整社区功能</span>
                  </span>
                </Link>
              )}
            </div>
          </div>
        </aside>

        <div className="app-shell-main">
          <div className="app-shell-content">
            <header className="app-shell-topbar">
              <div>
                <div className="app-shell-brand-kicker">{pageMeta.description}</div>
                <div className="app-shell-topbar-title">{pageMeta.title}</div>
              </div>
              <div className="app-shell-topbar-meta">
                {currentUser ? `${currentUser.username} · ${currentUser.roomNumber}` : "Guest Session"}
              </div>
            </header>
            {children}
          </div>
        </div>
      </div>

      <nav className="mobile-tabbar md:hidden" aria-label="移动主导航">
        {mobileNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          const showBadge = item.key === "messages" && unreadNotificationCount > 0;
          const isPublish = "isPublish" in item && item.isPublish;

          if (isPublish) {
            return (
              <Link
                key={item.key}
                href={item.href}
                className="mobile-tab-link mobile-tab-link--publish"
                aria-current={isActive ? "page" : undefined}
              >
                <span className="mobile-tab-icon mobile-tab-icon--publish">
                  <Icon />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`mobile-tab-link ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="mobile-tab-icon">
                <Icon />
                {showBadge ? <span className="mobile-tab-badge">{Math.min(unreadNotificationCount, 9)}</span> : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
