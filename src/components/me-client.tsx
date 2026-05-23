"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Button } from "@heroui/react";
import { EmptyState, ResidentAvatar, ResidentMetricGrid, ResidentMobileHero, ResidentMobilePanel, SectionHeader } from "./resident-shared";
import { SystemLogo } from "./system-logo";
import { useCommunityPosts } from "./community-provider";

const menuItems = [
  { label: "我的服务", href: "/services", mark: "务" },
  { label: "我的帖子", href: "/posts?mode=mine", mark: "帖" },
  { label: "我的收藏", href: "/posts?mode=favorites", mark: "藏" },
  { label: "项目介绍", href: "/about", mark: "问" },
  { label: "社区规则", href: "/rules", mark: "规" },
] as const;

export function MeClient() {
  const { currentUser, posts, polls, serviceTickets, notifications, logout } = useCommunityPosts();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setError("");
    setLoggingOut(true);
    try {
      await logout();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "退出失败");
    } finally {
      setLoggingOut(false);
    }
  };

  const stats = useMemo(() => {
    const myPosts = currentUser ? posts.filter((post) => post.isMine) : [];
    const votedPolls = polls.filter((poll) => poll.hasVoted);
    const myTickets = serviceTickets.filter((ticket) => ticket.isMine);
    const favoritePosts = posts.filter((post) => post.favorited);

    return {
      myPosts: myPosts.length,
      votedPolls: votedPolls.length,
      myTickets: myTickets.length,
      favoritePosts: favoritePosts.length,
      notifications: notifications.length,
    };
  }, [currentUser, notifications, polls, posts, serviceTickets]);

  if (!currentUser) {
    const lockedFeatures = [
      { title: "我的帖子" },
      { title: "我的工单" },
      { title: "我的消息" },
    ] as const;

    return (
      <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
        <div className="mobile-resident-only mobile-resident-stack">
          <ResidentMobileHero
            background="radial-gradient(circle at 16% 18%, rgba(237,170,92,0.34), transparent 25%), radial-gradient(circle at 84% 14%, rgba(97,172,167,0.24), transparent 22%), linear-gradient(160deg, #241b16 0%, #473223 46%, #6b4a32 100%)"
          >
            <div className="flex items-center gap-3">
              <SystemLogo className="gap-0" markClassName="h-11 w-11" showLabel={false} />
              <div className="mobile-resident-kicker text-white/72">个人中心</div>
            </div>

            <h1 className="mobile-resident-title mt-5 max-w-[9ch]">个人中心</h1>

            <Link
              href="/login?next=/me"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold shadow-[0_16px_28px_rgba(26,18,13,0.18)]"
              style={{ color: "#4f3526" }}
            >
              <span>去登录</span>
              <span aria-hidden="true">→</span>
            </Link>
          </ResidentMobileHero>

          <ResidentMobilePanel delay="120ms">
            <div className="mobile-resident-kicker text-[#8a5d39]">入口</div>
            <h2 className="mobile-resident-panel-title">登录后可用</h2>

            <div className="mt-4 grid gap-2.5">
              {lockedFeatures.map((item) => (
                <div key={item.title} className="rounded-[1.2rem] bg-white/78 px-4 py-3 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                </div>
              ))}
            </div>
          </ResidentMobilePanel>
        </div>

        <div className="hidden md:block pt-4 md:pt-6">
          <EmptyState
            title="登录后查看个人中心"
            actionHref="/login?next=/me"
            actionLabel="去登录"
          />
        </div>
      </main>
    );
  }

  const shortcutItems = [
    {
      label: "我的工单",
      href: "/services",
      value: stats.myTickets,
      hint: "工单",
      icon: "工",
      accent: "linear-gradient(135deg,#c97c45,#e4ab6a)",
    },
    {
      label: "我的消息",
      href: "/messages",
      value: stats.notifications,
      hint: "消息",
      icon: "信",
      accent: "linear-gradient(135deg,#2f7d8a,#59afb5)",
    },
    {
      label: "我的帖子",
      href: "/posts?mode=mine",
      value: stats.myPosts,
      hint: "帖子",
      icon: "帖",
      accent: "linear-gradient(135deg,#3a5d86,#638dc1)",
    },
    {
      label: "我的收藏",
      href: "/posts?mode=favorites",
      value: stats.favoritePosts,
      hint: "收藏",
      icon: "藏",
      accent: "linear-gradient(135deg,#7b6151,#b08469)",
    },
  ] as const;

  const activityItems = [
    {
      label: "投票参与",
      value: stats.votedPolls,
      tag: stats.votedPolls > 0 ? "已参与" : "未参与",
    },
    {
      label: "提醒箱",
      value: stats.notifications,
      tag: stats.notifications > 0 ? "有消息" : "暂无",
    },
    {
      label: "房号状态",
      value: currentUser.roomNumber || "未绑定",
      tag: "身份",
    },
  ] as const;

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <div className="mobile-resident-only mobile-resident-stack">
        <ResidentMobileHero
          background="radial-gradient(circle at 14% 20%, rgba(231,162,84,0.34), transparent 26%), radial-gradient(circle at 85% 14%, rgba(95,178,150,0.26), transparent 22%), linear-gradient(160deg, #221812 0%, #38271f 46%, #5f4638 100%)"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <ResidentAvatar name={currentUser.username} size="lg" tone="inverse" />
              <div className="min-w-0">
                <div className="mobile-resident-kicker text-white/72">个人中心</div>
                <h1 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.05em] text-white">{currentUser.username}</h1>
                <p className="mt-1 text-sm text-white/72">{currentUser.roomNumber || "未绑定房号"}</p>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[0.72rem] font-semibold text-white/80 ring-1 ring-white/10">
              我的
            </span>
          </div>

          <ResidentMetricGrid
            className="mt-5"
            items={[
              { label: "发布", value: String(stats.myPosts).padStart(2, "0") },
              { label: "参与", value: String(stats.votedPolls).padStart(2, "0") },
              { label: "收藏", value: String(stats.favoritePosts).padStart(2, "0") },
              { label: "工单", value: String(stats.myTickets).padStart(2, "0") },
            ]}
            tone="inverse"
          />
        </ResidentMobileHero>

        <ResidentMobilePanel delay="120ms">
          <div className="mobile-resident-kicker text-[#8a5d39]">我的</div>
          <h2 className="mobile-resident-panel-title">快捷入口</h2>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {shortcutItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-[1.28rem] border border-[rgba(95,116,176,0.08)] bg-white/78 px-3.5 py-3 shadow-[0_14px_28px_rgba(58,75,124,0.06)]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] text-sm font-semibold text-white shadow-[0_12px_24px_rgba(58,75,124,0.14)]"
                    style={{ background: item.accent }}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  </div>
                </div>
                <div className="mt-4 text-[1.65rem] font-semibold tracking-[-0.05em] text-[#17263f]">{String(item.value).padStart(2, "0")}</div>
              </Link>
            ))}
          </div>
        </ResidentMobilePanel>

        <ResidentMobilePanel delay="200ms">
          <div className="mobile-resident-kicker text-[#2f7d8a]">状态</div>
          <h2 className="mobile-resident-panel-title">当前状态</h2>

          <div className="mt-4 grid gap-2.5">
            {activityItems.map((item) => (
              <div key={item.label} className="rounded-[1.2rem] bg-white/78 px-4 py-3 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[rgba(49,93,143,0.08)] px-2.5 py-1 text-[0.68rem] font-semibold text-[#315d8f]">
                      {item.tag}
                    </span>
                    <div className="text-sm font-semibold text-[#2b435e]">{item.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ResidentMobilePanel>

        <ResidentMobilePanel delay="280ms">
          <div className="mobile-resident-kicker text-[#315d8f]">更多</div>
          <h2 className="mobile-resident-panel-title">更多入口</h2>

          <div className="mt-4 grid gap-2.5">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-[1.22rem] bg-white/82 px-3.5 py-3 shadow-[0_12px_26px_rgba(58,75,124,0.06)]"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] bg-[rgba(49,93,143,0.1)] text-sm font-semibold text-[#315d8f]">
                  {item.mark}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                </div>
                <span className="text-sm text-[var(--muted)]">›</span>
              </Link>
            ))}
            <Button isPending={loggingOut} onPress={handleLogout} variant="secondary">
              {loggingOut ? "退出中..." : "退出登录"}
            </Button>
          </div>
        </ResidentMobilePanel>
      </div>

      <div className="hidden md:block">
        <section className="app-gradient-card px-4 py-5 text-white md:px-5 md:py-6">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] md:items-end">
            <div>
              <div className="flex items-start gap-3">
                <ResidentAvatar name={currentUser.username} size="lg" tone="inverse" />
                <div className="min-w-0">
                  <h1 className="text-[1.55rem] font-semibold tracking-[-0.05em] md:text-[2.05rem]">{currentUser.username}</h1>
                  <p className="mt-1 text-sm text-white/72">{currentUser.roomNumber || "未绑定房号"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-[1rem] bg-white/10 px-3 py-3">
                <div className="text-xl font-semibold">{stats.myPosts}</div>
                <div className="mt-1 text-[0.72rem] text-white/72">发布</div>
              </div>
              <div className="rounded-[1rem] bg-white/10 px-3 py-3">
                <div className="text-xl font-semibold">{stats.votedPolls}</div>
                <div className="mt-1 text-[0.72rem] text-white/72">参与</div>
              </div>
              <div className="rounded-[1rem] bg-white/10 px-3 py-3">
                <div className="text-xl font-semibold">{stats.favoritePosts}</div>
                <div className="mt-1 text-[0.72rem] text-white/72">收藏</div>
              </div>
              <div className="rounded-[1rem] bg-white/10 px-3 py-3">
                <div className="text-xl font-semibold">{stats.myTickets}</div>
                <div className="mt-1 text-[0.72rem] text-white/72">工单</div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start">
          <section className="app-card px-4 py-4 md:px-5 md:py-5">
            <SectionHeader title="快捷入口" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {shortcutItems.map((item) => (
                <Link key={item.label} href={item.href} className="app-card-muted rounded-[1.2rem] px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <div className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-[var(--primary)]">{item.value}</div>
                  <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.hint}</div>
                </Link>
              ))}
            </div>
          </section>

          <section className="app-card px-4 py-4 md:px-5 md:py-5">
            <SectionHeader title="更多" />
            <div className="mt-4 grid gap-1">
              {menuItems.map((item, index) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between gap-3 rounded-[1rem] px-3 py-3 transition hover:bg-[var(--surface-muted)] ${index > 0 ? "border-t border-[var(--separator)]" : ""}`}
                >
                  <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                  <span className="text-sm text-[var(--muted)]">›</span>
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <Button isPending={loggingOut} onPress={handleLogout} variant="secondary">
                {loggingOut ? "退出中..." : "退出登录"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
