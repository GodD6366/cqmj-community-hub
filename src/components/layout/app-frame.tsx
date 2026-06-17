"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCommunityPosts } from "@/lib/community-store";
import { getCommunityName } from "@/lib/community-brand";
import { SystemLogo } from "../system-logo";
import {
  HomeIcon,
  UsersIcon,
  ServiceIcon,
  MessagesIcon,
  UserIcon,
  PublishIcon,
  BuildingIcon,
  VoteIcon,
  ChevronRightIcon,
} from "../app-icons";

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
  if (pathname === "/mcp" || pathname === "/api/skill/bundle") return false;
  return true;
}

function getActiveKey(pathname: string | null) {
  if (!pathname || pathname === "/" || pathname.startsWith("/posts")) return "home";
  if (pathname.startsWith("/publish")) return "publish";
  if (pathname.startsWith("/neighbors") || pathname.startsWith("/polls")) return "neighbors";
  if (pathname.startsWith("/services")) return "services";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/me") || pathname.startsWith("/skill/connect") || pathname.startsWith("/login")) return "me";
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
  const isProtectedPage = pathname !== "/" && !pathname.startsWith("/posts") && !pathname.startsWith("/about") && !pathname.startsWith("/rules");
  const mobileNavItems = mobileNavigationItems.map((item) =>
    pathname.startsWith("/services") && item.key === "neighbors"
      ? { ...item, key: "services", href: "/services", label: "服务", icon: ServiceIcon }
      : item,
  );

  // 非居民体验页面直接渲染
  if (!residentExperience) {
    return <>{children}</>;
  }

  // 需要登录的页面但用户未登录，显示 GuestGateway
  if (hydrated && !currentUser && isProtectedPage) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
        <GuestGateway onLogin={() => router.push("/login")} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* 桌面端侧边栏 */}
      <aside className="hidden border-r border-border/70 bg-white/88 shadow-[12px_0_44px_rgba(27,54,71,0.08)] backdrop-blur-2xl md:flex md:w-72 md:flex-col">
        <div className="flex h-full flex-col px-4 py-5">
          {/* 品牌区域 */}
          <div className="mb-6 flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-white/68 p-2.5 shadow-sm">
            <SystemLogo className="items-center gap-0" markClassName="h-11 w-11" showLabel={false} />
            <div className="min-w-0">
              <div className="app-display truncate text-xl leading-tight">{communityName}</div>
              <div className="app-utility mt-0.5 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Resident atlas</div>
            </div>
          </div>

          {/* 用户状态 */}
          <div className="mb-5 rounded-[1.2rem] border border-primary/20 bg-[linear-gradient(135deg,rgba(47,154,114,0.94),rgba(53,111,158,0.88))] p-4 text-sm text-primary-foreground shadow-lg shadow-primary/15">
            <div className="map-coordinate border-white/22 bg-white/14 text-white">Caiqi station</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <div className="text-[0.64rem] font-bold uppercase tracking-[0.12em] text-primary-foreground/72">身份</div>
                <div className="mt-1 font-semibold">{currentUser ? "居民" : "访客"}</div>
              </div>
              <div>
                <div className="text-[0.64rem] font-bold uppercase tracking-[0.12em] text-primary-foreground/72">房号</div>
                <div className="mt-1 truncate font-semibold">{currentUser?.roomNumber ?? "未绑定"}</div>
              </div>
              <div>
                <div className="text-[0.64rem] font-bold uppercase tracking-[0.12em] text-primary-foreground/72">未读</div>
                <div className="mt-1 font-semibold tabular-nums">{unreadNotificationCount}</div>
              </div>
            </div>
          </div>

          {/* 导航 */}
          <nav className="flex-1 space-y-1.5" aria-label="桌面主导航">
            {desktopNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeKey === item.key;
              const showBadge = item.key === "messages" && unreadNotificationCount > 0;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`group flex min-h-[3.25rem] items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-foreground text-white shadow-md shadow-foreground/10"
                      : "text-foreground hover:bg-primary/10 hover:text-primary-strong"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className={`relative flex h-9 w-9 items-center justify-center rounded-xl ${
                    isActive ? "bg-white/16 text-white" : "bg-white/72 text-primary-strong ring-1 ring-border/60"
                  }`}>
                    <Icon />
                    {showBadge && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
                        {Math.min(unreadNotificationCount, 99)}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col">
                    <span>{item.label}</span>
                    <span className={isActive ? "text-xs text-primary-foreground/75" : "text-xs text-muted-foreground"}>{item.meta}</span>
                  </span>
                  <ChevronRightIcon className={`ml-auto h-4 w-4 transition-transform ${isActive ? "opacity-80" : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-60"}`} />
                </Link>
              );
            })}
          </nav>

          {/* 底部发布按钮和用户区 */}
          <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
            <Link
              href="/publish"
              className="app-action flex w-full bg-primary px-4 text-sm text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary-strong"
            >
              <PublishIcon />
              <span>发布内容</span>
            </Link>
            {currentUser ? (
              <Link href="/me" className="flex min-h-12 items-center gap-3 rounded-[1rem] border border-transparent p-2 transition-colors hover:border-border/70 hover:bg-white/64">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/18 to-accent/16 text-sm font-bold text-primary-strong">
                  {Array.from(currentUser.nickname)[0] ?? "我"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{currentUser.nickname}</div>
                  <div className="text-xs text-muted-foreground">
                    {currentUser.roomNumber}{currentUser.role === "admin" ? " · 管理员" : ""}
                  </div>
                </div>
              </Link>
            ) : (
              <Link href="/login" className="flex min-h-12 items-center gap-3 rounded-[1rem] border border-transparent p-2 transition-colors hover:border-border/70 hover:bg-white/64">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-sm font-bold text-muted-foreground">
                  登
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">访客模式</div>
                  <div className="text-xs text-muted-foreground">登录后解锁完整社区功能</div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className="flex-1">
        {/* 桌面端顶部栏 */}
        <header className="sticky top-0 z-40 hidden border-b border-border/70 bg-white/80 shadow-sm backdrop-blur-2xl md:flex md:items-center md:justify-between md:px-8 md:py-4">
          <div>
            <div className="map-coordinate">{pageMeta.description}</div>
            <h1 className="app-display mt-1 text-2xl leading-tight">{pageMeta.title}</h1>
          </div>
          <div className="flex min-h-11 items-center gap-2 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-foreground/15">
            <BuildingIcon />
            <span>{currentUser ? `${currentUser.nickname} · ${currentUser.roomNumber}` : "访客浏览"}</span>
          </div>
        </header>

        {/* 页面内容：底部预留移动端 TabBar + 安全区域高度 */}
        <div className="pb-32 md:pb-0">
          {children}
        </div>
      </div>

      {/* 移动端底部 TabBar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-white/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_40px_rgba(27,54,71,0.12)] backdrop-blur-2xl md:hidden"
        aria-label="移动主导航"
      >
        <div className="mx-auto flex max-w-md items-end justify-around px-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            const showBadge = item.key === "messages" && unreadNotificationCount > 0;
            const isPublish = "isPublish" in item && item.isPublish;

            if (isPublish) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2"
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="-mt-5 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-white/85 transition-transform active:scale-95">
                    <Icon />
                  </span>
                  <span className="text-[10px] font-bold text-primary-strong">{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 ${
                  isActive ? "text-primary-strong" : "text-muted-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={`relative flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? "bg-primary/10" : ""}`}>
                  <Icon />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 text-[8px] font-bold text-danger-foreground">
                      {Math.min(unreadNotificationCount, 9)}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function GuestGateway({ onLogin }: { onLogin: () => void }) {
  const communityDisplayName = getCommunityName();
  const features = [
    { icon: HomeIcon, text: "动态流转", meta: "邻里帖子" },
    { icon: VoteIcon, text: "公开议事", meta: "社区投票" },
    { icon: ServiceIcon, text: "事务闭环", meta: "工单报修" },
    { icon: MessagesIcon, text: "即时回音", meta: "消息提醒" },
  ];

  return (
    <div className="app-panel-strong w-full max-w-lg p-6 text-center md:p-8">
      <div className="mb-6">
        <SystemLogo className="justify-center gap-3" markClassName="h-14 w-14" showLabel={false} />
        <div className="map-coordinate mx-auto mt-4">Resident checkpoint</div>
        <div className="app-display mt-3 text-2xl leading-tight">{communityDisplayName}</div>
        <div className="text-sm text-muted-foreground">居民社区应用 · 登录后解锁完整互动</div>
      </div>

      <h1 className="app-display mb-3 text-3xl leading-tight">
        欢迎回到<br />
        <span className="text-primary">居民社区</span>
      </h1>
      <p className="mx-auto mb-6 max-w-sm text-sm leading-7 text-muted-foreground">
        登录后即可查看社区动态、参与投票、发布内容，与邻居一起共建更顺手的社区生活。
      </p>

      <ul className="mb-6 grid gap-2 text-left sm:grid-cols-2" aria-label="社区功能">
        {features.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.text} className="station-card flex min-h-16 items-center gap-3 p-3 text-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon />
              </span>
              <span className="min-w-0">
                <span className="block font-bold">{item.text}</span>
                <span className="block text-xs text-muted-foreground">{item.meta}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="app-action w-full bg-primary px-6 text-sm text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary-strong"
          onClick={onLogin}
        >
          登录账户
        </button>
        <Link
          href="/login?tab=register"
          className="app-action w-full border border-border bg-white/72 px-6 text-sm text-foreground hover:bg-white"
        >
          注册新账户
        </Link>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">仅限已验证居民使用 · 需要邀请码注册</p>
    </div>
  );
}
