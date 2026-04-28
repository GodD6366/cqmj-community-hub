"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCommunityPosts } from "./community-provider";
import { SystemLogo } from "./system-logo";

const navigationItems = [
  { key: "home", href: "/", label: "首页", icon: HomeIcon },
  { key: "neighbors", href: "/neighbors", label: "邻里", icon: NeighborsIcon },
  { key: "services", href: "/services", label: "服务", icon: ServicesIcon },
  { key: "messages", href: "/messages", label: "消息", icon: MessagesIcon },
  { key: "me", href: "/me", label: "我的", icon: MeIcon },
] as const;

function isResidentExperience(pathname: string) {
  return !pathname.startsWith("/admin") && !pathname.startsWith("/login") && !pathname.startsWith("/mcp");
}

function getActiveKey(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/neighbors") || pathname === "/posts") return "neighbors";
  if (pathname.startsWith("/services")) return "services";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/me") || pathname.startsWith("/about") || pathname.startsWith("/rules")) return "me";
  if (pathname.startsWith("/posts/") || pathname.startsWith("/publish")) return "neighbors";
  return null;
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, unreadNotificationCount } = useCommunityPosts();
  const residentExperience = isResidentExperience(pathname);
  const activeKey = getActiveKey(pathname);
  const showComposer = residentExperience && !pathname.startsWith("/publish");

  if (!residentExperience) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="app-stage">
      <header className="app-topbar hidden md:block">
        <div className="app-topbar-shell">
          <div className="app-topbar-brand">
            <Link href="/" className="app-brand-link" aria-label="返回邻里圈首页">
              <SystemLogo className="gap-3" markClassName="h-10 w-10 md:h-11 md:w-11" showLabel={false} />
              <div className="min-w-0">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[rgba(19,33,61,0.46)]">Residents</div>
                <div className="mt-1 truncate text-base font-semibold tracking-[-0.04em] text-slate-950">邻里圈居民端</div>
              </div>
            </Link>
          </div>

          <nav className="app-topnav" aria-label="桌面主导航">
            {navigationItems.map((item) => {
              const isActive = activeKey === item.key;
              const showBadge = item.key === "messages" && unreadNotificationCount > 0;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`app-topnav-link ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span>{item.label}</span>
                  {showBadge ? <span className="app-topnav-badge">{Math.min(unreadNotificationCount, 99)}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="app-topbar-actions">
            <Link href="/publish" className="app-topbar-cta">
              <PlusIcon />
              <span>发布内容</span>
            </Link>

            {currentUser ? (
              <Link href="/me" className="app-topbar-profile">
                <span className="app-topbar-profile-mark">{Array.from(currentUser.username)[0] ?? "我"}</span>
                <span className="app-topbar-profile-copy">
                  <span className="app-topbar-profile-name">{currentUser.username}</span>
                  <span className="app-topbar-profile-meta">
                    {currentUser.roomNumber}
                    {currentUser.role === "admin" ? " · 管理员" : ""}
                  </span>
                </span>
              </Link>
            ) : (
              <Link href="/login" className="app-topbar-login">
                登录
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="app-content">{children}</div>

      {showComposer ? (
        <Link aria-label="发布内容" className="app-fab md:hidden" href="/publish">
          <PlusIcon />
        </Link>
      ) : null}

      <nav className="app-tabbar md:hidden" aria-label="主导航">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          const showBadge = item.key === "messages" && unreadNotificationCount > 0;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`app-tab ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="app-tab-icon">
                <Icon />
                {showBadge ? <span className="app-badge">{Math.min(unreadNotificationCount, 99)}</span> : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.5 10.5 12 4l7.5 6.5v8a1 1 0 0 1-1 1h-4.5v-5H10v5H5.5a1 1 0 0 1-1-1v-8Z" />
    </svg>
  );
}

function NeighborsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7.5 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.5 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M3.5 19a4 4 0 0 1 8 0M13 19a3.5 3.5 0 0 1 7 0" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m14.5 5 4.5 4.5-9 9L5.5 19l.5-4.5 8.5-9Z" />
      <path d="m13 6.5 4.5 4.5" />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 7.5h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 3v-5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
