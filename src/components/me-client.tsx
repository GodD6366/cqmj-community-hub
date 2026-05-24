"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button } from "@heroui/react";
import {
  CyberPanel,
  CyberStatGrid,
  DataList,
  EmptyState,
  ResidentAvatar,
} from "./resident-shared";
import { useCommunityPosts } from "./community-provider";
import { getCommunityName } from "@/lib/community-brand";

const functionItems = [
  { label: "我的帖子", href: "/posts?mode=mine", mark: "帖" },
  { label: "我的收藏", href: "/posts?mode=favorites", mark: "藏" },
  { label: "我的投票", href: "/publish?kind=poll", mark: "票" },
  { label: "我的工单", href: "/services", mark: "单" },
] as const;

const extraItems = [
  { label: "MCP / AI 配置", href: "/mcp/connect", mark: "AI" },
  { label: "浏览历史", href: "/posts", mark: "史" },
  { label: "邀请邻居", href: "/about", mark: "邀" },
  { label: "社区规则", href: "/rules", mark: "规" },
] as const;

const mobileStats = [
  {
    label: "我的帖子",
    key: "myPosts",
    href: "/posts?mode=mine",
    tone: "green",
    icon: <PostIcon />,
  },
  {
    label: "我的收藏",
    key: "favoritePosts",
    href: "/posts?mode=favorites",
    tone: "amber",
    icon: <StarIcon />,
  },
  {
    label: "我的参与",
    key: "votedPolls",
    href: "/neighbors",
    tone: "green",
    icon: <MessageIcon />,
  },
  {
    label: "我的工单",
    key: "myTickets",
    href: "/services",
    tone: "amber",
    icon: <TicketIcon />,
  },
] as const;

const mobileMenuItems = [
  {
    label: "MCP / AI 配置",
    href: "/mcp/connect",
    tone: "cyan",
    icon: <BrainCircuitIcon />,
  },
  {
    label: "我的帖子",
    href: "/posts?mode=mine",
    tone: "green",
    icon: <PostIcon />,
  },
  {
    label: "我的收藏",
    href: "/posts?mode=favorites",
    tone: "green",
    icon: <StarIcon />,
  },
  { label: "我的投票", href: "/neighbors", tone: "cyan", icon: <PollIcon /> },
  { label: "浏览记录", href: "/posts", tone: "green", icon: <ClockIcon /> },
  { label: "社区规则", href: "/rules", tone: "green", icon: <ShieldIcon /> },
  { label: "项目介绍", href: "/about", tone: "green", icon: <InfoIcon /> },
] as const;

export function MeClient() {
  const { currentUser, posts, polls, serviceTickets, notifications, logout } =
    useCommunityPosts();
  const communityName = getCommunityName();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleSettings = () => {
    setSettingsOpen((isOpen) => !isOpen);
  };
  const closeSettings = () => {
    setSettingsOpen(false);
  };

  useEffect(() => {
    if (!settingsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [settingsOpen]);

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
      favoritePosts: favoritePosts.length,
      votedPolls: votedPolls.length,
      myTickets: myTickets.length,
      comments: notifications.filter((item) => item.type === "comment").length,
    };
  }, [currentUser, notifications, polls, posts, serviceTickets]);

  if (!currentUser) {
    return (
      <main className="page-shell">
        <EmptyState
          title="登录后查看个人中心"
          actionHref="/login?next=/me"
          actionLabel="去登录"
        />
      </main>
    );
  }

  return (
    <main className="page-shell space-y-4 md:space-y-5">
      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <section className="mobile-me md:hidden">
        <section className="mobile-me-profile-card">
          <div className="mobile-me-profile-glitch" />
          <div className="mobile-me-avatar-ring">
            <div className="mobile-me-avatar">
              {Array.from(currentUser.username)[0] ?? "我"}
            </div>
          </div>
          <div className="mobile-me-profile-copy">
            <div className="mobile-me-name-row">
              <h1 className="mobile-me-name">{currentUser.username}</h1>
              <span className="mobile-me-level">LV.6 探索者</span>
            </div>
            <div className="mobile-me-room">
              {communityName} · {currentUser.roomNumber || "未绑定房号"}
              <CopyIcon />
            </div>
            <span className="mobile-me-status">SYS:ONLINE</span>
            <p>探索 · 连接 · 共建未来社区</p>
          </div>
          <Link href="/me" className="mobile-me-edit">
            <EditIcon /> 编辑资料
          </Link>
        </section>

        <section className="mobile-me-stats" aria-label="个人统计">
          {mobileStats.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="mobile-me-stat-item"
            >
              <span className={`mobile-me-stat-icon is-${item.tone}`}>
                {item.icon}
              </span>
              <strong>{stats[item.key]}</strong>
              <span>{item.label}</span>
            </Link>
          ))}
        </section>

        <section className="mobile-me-list" aria-label="个人功能列表">
          {mobileMenuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="mobile-me-menu-item"
            >
              <span className={`mobile-me-menu-icon is-${item.tone}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              <span className="mobile-me-menu-arrow">›</span>
            </Link>
          ))}
          <button
            type="button"
            className="mobile-me-menu-item"
            aria-controls="mobile-me-settings"
            aria-expanded={settingsOpen}
            onClick={toggleSettings}
          >
            <span className="mobile-me-menu-icon is-green">
              <SettingsIcon />
            </span>
            <span>设置</span>
            <span className="mobile-me-menu-arrow" aria-hidden="true">
              {settingsOpen ? "⌃" : "›"}
            </span>
          </button>
        </section>

        {settingsOpen ? (
          <div
            className="mobile-me-settings-modal"
            onClick={closeSettings}
            role="presentation"
          >
            <section
              id="mobile-me-settings"
              className="mobile-me-settings-panel"
              aria-label="账户设置"
              aria-modal="true"
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mobile-me-settings-toolbar">
                <div className="mobile-me-settings-head">
                  <span className="mobile-me-settings-icon">
                    <SettingsIcon />
                  </span>
                  <div>
                    <h2>账户设置</h2>
                    <p>管理当前登录账号与系统连接状态</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mobile-me-settings-close"
                  aria-label="关闭设置"
                  onClick={closeSettings}
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="mobile-me-settings-meta">
                <span>当前账号</span>
                <strong>{currentUser.username}</strong>
              </div>
              <div className="mobile-me-settings-meta">
                <span>房号状态</span>
                <strong>{currentUser.roomNumber || "未绑定房号"}</strong>
              </div>
              <button
                type="button"
                className="mobile-me-logout"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogoutIcon />
                {loggingOut ? "退出中..." : "退出登录"}
              </button>
            </section>
          </div>
        ) : null}
      </section>

      <section className="hidden gap-4 xl:grid-cols-[280px_minmax(0,1fr)] md:grid">
        <CyberPanel title="个人中心" kicker="Profile">
          <div className="flex items-start gap-4">
            <ResidentAvatar name={currentUser.username} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[1.3rem] font-semibold text-slate-950">
                  {currentUser.username}
                </div>
                <span className="app-chip">
                  {currentUser.role === "admin" ? "管理员" : "已认证业主"}
                </span>
              </div>
              <div className="mt-2 text-sm text-[var(--muted)]">
                {currentUser.roomNumber}
              </div>
            </div>
            <Button size="sm" variant="secondary">
              编辑资料
            </Button>
          </div>
          <div className="mt-4">
            <CyberStatGrid
              columns={4}
              items={[
                { label: "我的帖子", value: stats.myPosts },
                { label: "我的收藏", value: stats.favoritePosts },
                { label: "我的参与", value: stats.votedPolls },
                { label: "我的工单", value: stats.myTickets },
              ]}
            />
          </div>
        </CyberPanel>

        <CyberPanel title="功能中心" kicker="Function Center">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="grid gap-3">
              {functionItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="app-shell-link !p-3"
                >
                  <span className="app-shell-link-icon">{item.mark}</span>
                  <span className="app-shell-link-copy">
                    <span className="app-shell-link-title">{item.label}</span>
                    <span className="app-shell-link-meta">进入模块</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="grid gap-3">
              {extraItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="app-shell-link !p-3"
                >
                  <span className="app-shell-link-icon">{item.mark}</span>
                  <span className="app-shell-link-copy">
                    <span className="app-shell-link-title">{item.label}</span>
                    <span className="app-shell-link-meta">更多信息</span>
                  </span>
                </Link>
              ))}
              <Button
                isPending={loggingOut}
                onPress={handleLogout}
                variant="secondary"
              >
                {loggingOut ? "退出中..." : "退出登录"}
              </Button>
            </div>
          </div>
        </CyberPanel>
      </section>

      <section className="hidden gap-4 xl:grid-cols-3 md:grid">
        <CyberPanel title="账户统计" kicker="Summary">
          <DataList
            items={[
              { label: "我的评论提醒", value: stats.comments },
              { label: "我的收藏", value: stats.favoritePosts },
              { label: "我的工单", value: stats.myTickets },
            ]}
          />
        </CyberPanel>
        <CyberPanel title="参与记录" kicker="Activity">
          <DataList
            items={[
              { label: "投票参与", value: stats.votedPolls },
              { label: "房号状态", value: currentUser.roomNumber },
              {
                label: "账号角色",
                value: currentUser.role === "admin" ? "管理员" : "居民",
              },
            ]}
          />
        </CyberPanel>
        <CyberPanel title="快捷跳转" kicker="Links">
          <DataList
            items={[
              {
                label: "返回首页",
                value: (
                  <Link href="/" className="text-[var(--primary)]">
                    前往
                  </Link>
                ),
              },
              {
                label: "查看邻里",
                value: (
                  <Link href="/neighbors" className="text-[var(--primary)]">
                    前往
                  </Link>
                ),
              },
              {
                label: "发布内容",
                value: (
                  <Link href="/publish" className="text-[var(--primary)]">
                    前往
                  </Link>
                ),
              },
            ]}
          />
        </CyberPanel>
      </section>
    </main>
  );
}

function PostIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M7 5h10M7 9h10M7 13h6" />
      <path d="M5 3h14v18H5z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-5 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <path d="M8 11h3M14 11h2" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M7 5h10v3h2v11H5V8h2V5Z" />
      <path d="M9 5V3h6v2M8 12h8M8 16h5" />
    </svg>
  );
}

function PollIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 20V10M12 20V4M19 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 11v6M12 7h.01" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <path d="M14 5v4" />
      <path d="M8 15v4" />
      <path d="M13 7a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" />
      <path d="M6.5 17a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </svg>
  );
}


function BrainCircuitIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M9 13a4.5 4.5 0 0 0 3-4" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M12 13h4" />
      <path d="M12 18h6a2 2 0 0 1 2 2v1" />
      <path d="M12 8h8" />
      <path d="M16 8V5a2 2 0 0 1 2-2" />
      <circle cx="16" cy="13" r=".5" />
      <circle cx="18" cy="3" r=".5" />
      <circle cx="20" cy="21" r=".5" />
      <circle cx="20" cy="8" r=".5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 8h10v10H8z" />
      <path d="M6 16H4V4h12v2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 20h4l11-11-4-4L4 16v4Z" />
      <path d="m13 7 4 4" />
    </svg>
  );
}
