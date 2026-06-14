"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCommunityPosts } from "./community-provider";
import { SystemLogo } from "./system-logo";
import {
  BuildingIcon,
  HomeIcon,
  MessagesIcon,
  PublishIcon,
  ServiceIcon,
  UserIcon,
  UsersIcon,
} from "./app-icons";
import { getCommunityName } from "@/lib/community-brand";

const communityName = getCommunityName();

const desktopNavigationItems = [
  { key: "home", href: "/", label: "首页", meta: "社区动态", icon: HomeIcon },
  { key: "neighbors", href: "/neighbors", label: "邻里", meta: "技能互助", icon: UsersIcon },
  { key: "services", href: "/services", label: "服务", meta: "报修工单", icon: ServiceIcon },
  { key: "messages", href: "/messages", label: "消息", meta: "互动提醒", icon: MessagesIcon },
  { key: "me", href: "/me", label: "我的", meta: "账户中心", icon: UserIcon },
] as const;

const mobileNavigationItems = [
  { key: "home", href: "/", label: "首页", icon: HomeIcon },
  { key: "neighbors", href: "/neighbors", label: "邻里", icon: UsersIcon },
  { key: "publish", href: "/publish", label: "发布", icon: PublishIcon, isPublish: true },
  { key: "messages", href: "/messages", label: "消息", icon: MessagesIcon },
  { key: "me", href: "/me", label: "我的", icon: UserIcon },
] as const;

function isResidentExperience(pathname: string) {
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return false;
  if ((pathname === "/mcp" || pathname === "/api/skill/bundle")) return false;
  return true;
}

function getActiveKey(pathname: string) {
  if (pathname === "/" || pathname.startsWith("/posts") || pathname.startsWith("/publish")) return "home";
  if (pathname.startsWith("/neighbors") || pathname.startsWith("/polls")) return "neighbors";
  if (pathname.startsWith("/services")) return "services";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/me") || pathname.startsWith("/about") || pathname.startsWith("/rules") || pathname.startsWith("/skill/connect") || pathname.startsWith("/login")) return "me";
  return null;
}

function getPageMeta(pathname: string) {
  if (pathname === "/") return { title: "社区首页", description: "动态、邻里互助与便民入口" };
  if (pathname.startsWith("/posts")) return { title: "社区动态", description: "需求、闲置、交流、约玩" };
  if (pathname.startsWith("/neighbors")) return { title: "邻里互助", description: "技能登记与互助广场" };
  if (pathname.startsWith("/polls")) return { title: "社区投票", description: "社区治理与意见征集" };
  if (pathname.startsWith("/services")) return { title: "工单服务", description: "物业报修与处理进度" };
  if (pathname.startsWith("/messages")) return { title: "消息中心", description: "评论、收藏、投票与系统提醒" };
  if (pathname.startsWith("/publish")) return { title: "发布内容", description: "发帖、报修、投票、活动" };
  if (pathname.startsWith("/me")) return { title: "个人中心", description: "我的互动、工单与账户信息" };
  return { title: communityName, description: "让社区互助更简单" };
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, unreadNotificationCount, hydrated } = useCommunityPosts();
  const residentExperience = isResidentExperience(pathname);
  const activeKey = getActiveKey(pathname);
  const pageMeta = getPageMeta(pathname);

  if (!residentExperience) {
    return (
      <div className="app-stage">
        <div className="site-brand-bg" aria-hidden="true" />
        <div className="site-brand-content min-h-screen">{children}</div>
      </div>
    );
  }

  // 仅对需要登录的页面显示登录引导；帖子浏览对访客开放
  if (hydrated && !currentUser && pathname !== "/" && !pathname.startsWith("/posts")) {
    return (
      <div className="app-stage">
        <div className="site-brand-bg" aria-hidden="true" />
        <div className="site-brand-content">
          <GuestGateway onLogin={() => router.push("/login")} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-stage">
      <div className="site-brand-bg" aria-hidden="true" />
      <div className="site-brand-content">
        <div className="app-shell app-shell--resident">
          <aside className="app-shell-sidebar">
            <div className="app-shell-sidebar-inner">
              <div className="app-shell-brand">
                <div className="app-shell-brand-row">
                  <SystemLogo className="items-center gap-0" markClassName="h-11 w-11" showLabel={false} />
                  <div className="min-w-0">
                    <div className="app-shell-brand-title">{communityName}</div>
                    <div className="app-shell-brand-subtitle">居民生活协作平台</div>
                  </div>
                </div>
              </div>

              <section className="app-shell-status" aria-label="今日社区概况">
                <div className="app-shell-status-row">
                  <span>身份</span>
                  <strong>{currentUser ? "居民" : "访客"}</strong>
                </div>
                <div className="app-shell-status-row">
                  <span>房号</span>
                  <strong>{currentUser?.roomNumber ?? "未绑定"}</strong>
                </div>
                <div className="app-shell-status-row">
                  <span>未读</span>
                  <strong>{unreadNotificationCount}</strong>
                </div>
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
                <Link href="/publish" className="app-shell-action">
                  <PublishIcon />
                  <span>发布内容</span>
                </Link>
                {currentUser ? (
                  <Link href="/me" className="app-shell-user">
                    <span className="app-shell-user-mark">{Array.from(currentUser.nickname)[0] ?? "我"}</span>
                    <span>
                      <span className="app-shell-user-name">{currentUser.nickname}</span>
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
                <div className="app-shell-topbar-copy">
                  <div className="app-shell-brand-kicker">{pageMeta.description}</div>
                  <div className="app-shell-topbar-title">{pageMeta.title}</div>
                </div>
                <div className="app-shell-topbar-meta">
                  <span className="app-shell-topbar-chip">
                    <BuildingIcon />
                    {currentUser ? `${currentUser.nickname} · ${currentUser.roomNumber}` : "访客浏览"}
                  </span>
                </div>
              </header>
              {children}
            </div>
          </div>
        </div>

        <nav className="mobile-tabbar md:!hidden" aria-label="移动主导航">
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
    </div>
  );
}

function GuestGateway({ onLogin }: { onLogin: () => void }) {
  const communityDisplayName = getCommunityName();
  return (
    <div className="guest-gateway">
      {/* 背景装饰 */}
      <div className="guest-gateway-bg" aria-hidden="true" />

      <div className="guest-gateway-inner">
        {/* 品牌标识 */}
        <div className="guest-gateway-brand">
          <SystemLogo className="items-center gap-3" markClassName="h-14 w-14" showLabel={false} />
          <div className="guest-gateway-brand-name">{communityDisplayName}</div>
          <div className="guest-gateway-brand-sub">居民社区应用 · 登录后解锁完整互动</div>
        </div>

        <h1 className="guest-gateway-headline">
          欢迎回到<br />
          <span className="guest-gateway-headline-accent">居民社区</span>
        </h1>
        <p className="guest-gateway-desc">登录后即可查看社区动态、参与投票、发布内容，与邻居一起共建更顺手的社区生活。</p>

        <ul className="guest-gateway-features" aria-label="社区功能">
          {[
            { icon: "🏡", text: "社区动态 · 邻里帖子" },
            { icon: "🗳️", text: "社区投票 · 公开透明" },
            { icon: "🛠️", text: "工单报修 · 快速响应" },
            { icon: "💬", text: "消息中心 · 实时互动" },
          ].map((item) => (
            <li key={item.text} className="guest-gateway-feature-item">
              <span className="guest-gateway-feature-icon">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>

        {/* 操作按钮 */}
        <div className="guest-gateway-actions">
          <button
            type="button"
            id="guest-gateway-login-btn"
            className="guest-gateway-btn-primary"
            onClick={onLogin}
          >
            登录账户
          </button>
          <Link href="/login?tab=register" className="guest-gateway-btn-secondary">
            注册新账户
          </Link>
        </div>

        <p className="guest-gateway-footer">仅限已验证居民使用 · 需要邀请码注册</p>
      </div>
    </div>
  );
}
