"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, Button } from "@heroui/react";
import {
  BrainCircuitIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClockIcon,
  CloseIcon,
  CopyIcon,
  EditIcon,
  FileTextIcon,
  InfoIcon,
  LogoutIcon,
  MessagesIcon,
  ServiceIcon,
  SettingsIcon,
  ShieldIcon,
  StarIcon,
  VoteIcon,
} from "./app-icons";
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
  { label: "我的帖子", href: "/posts?mode=mine", icon: <FileTextIcon /> },
  { label: "我的收藏", href: "/posts?mode=favorites", icon: <StarIcon /> },
  { label: "我的投票", href: "/publish?kind=poll", icon: <VoteIcon /> },
  { label: "我的工单", href: "/services", icon: <ServiceIcon /> },
] as const;

const extraItems = [
  { label: "MCP / AI 配置", href: "/mcp/connect", icon: <BrainCircuitIcon /> },
  { label: "浏览历史", href: "/posts", icon: <ClockIcon /> },
  { label: "邀请邻居", href: "/about", icon: <MessagesIcon /> },
  { label: "社区规则", href: "/rules", icon: <ShieldIcon /> },
] as const;

const mobileStats = [
  {
    label: "我的帖子",
    key: "myPosts",
    href: "/posts?mode=mine",
    tone: "green",
    icon: <FileTextIcon />,
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
    icon: <MessagesIcon />,
  },
  {
    label: "我的工单",
    key: "myTickets",
    href: "/services",
    tone: "amber",
    icon: <ServiceIcon />,
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
    icon: <FileTextIcon />,
  },
  {
    label: "我的收藏",
    href: "/posts?mode=favorites",
    tone: "green",
    icon: <StarIcon />,
  },
  { label: "我的投票", href: "/neighbors", tone: "cyan", icon: <VoteIcon /> },
  { label: "浏览记录", href: "/posts", tone: "green", icon: <ClockIcon /> },
  { label: "社区规则", href: "/rules", tone: "green", icon: <ShieldIcon /> },
  { label: "项目介绍", href: "/about", tone: "green", icon: <InfoIcon /> },
] as const;

export function MeClient() {
  const { currentUser, posts, polls, serviceTickets, notifications, logout, updateProfile } =
    useCommunityPosts();
  const communityName = getCommunityName();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ username: "", nickname: "", roomNumber: "" });


  const openProfileEditor = () => {
    if (!currentUser) return;
    setError("");
    setMessage("");
    setProfileDraft({
      username: currentUser.username,
      nickname: currentUser.nickname,
      roomNumber: currentUser.roomNumber,
    });
    setProfileOpen(true);
  };
  const closeProfileEditor = () => {
    if (!profileSaving) {
      setProfileOpen(false);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setProfileSaving(true);
    try {
      await updateProfile(profileDraft);
      setProfileOpen(false);
      setMessage("资料已更新。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "更新资料失败");
    } finally {
      setProfileSaving(false);
    }
  };

  const toggleSettings = () => {
    setSettingsOpen((isOpen) => !isOpen);
  };
  const closeSettings = () => {
    setSettingsOpen(false);
  };

  useEffect(() => {
    if (!settingsOpen && !profileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [profileOpen, settingsOpen]);

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

      {message ? (
        <Alert status="success">
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <section className="mobile-me md:!hidden">
        <section className="mobile-me-profile-card">
          <div className="mobile-me-profile-glitch" />
          <div className="mobile-me-avatar-ring">
            <div className="mobile-me-avatar">
              {Array.from(currentUser.nickname)[0] ?? "我"}
            </div>
          </div>
          <div className="mobile-me-profile-copy">
            <div className="mobile-me-name-row">
              <h1 className="mobile-me-name">{currentUser.nickname}</h1>
              <span className="mobile-me-level">LV.6 探索者</span>
            </div>
            <div className="mobile-me-room">
              {communityName} · {currentUser.roomNumber || "未绑定房号"}
              <CopyIcon />
            </div>
            <span className="mobile-me-status">SYS:ONLINE</span>
            <p>探索 · 连接 · 共建未来社区</p>
          </div>
          <button type="button" className="mobile-me-edit" onClick={openProfileEditor}>
            <EditIcon /> 编辑资料
          </button>
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
              <span className="mobile-me-menu-arrow"><ChevronRightIcon /></span>
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
              {settingsOpen ? <ChevronUpIcon /> : <ChevronRightIcon />}
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

        {profileOpen ? (
          <div
            className="mobile-me-settings-modal"
            onClick={closeProfileEditor}
            role="presentation"
          >
            <section
              className="mobile-me-settings-panel mobile-me-profile-editor"
              aria-label="编辑资料"
              aria-modal="true"
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mobile-me-settings-toolbar">
                <div className="mobile-me-settings-head">
                  <span className="mobile-me-settings-icon">
                    <EditIcon />
                  </span>
                  <div>
                    <h2>编辑资料</h2>
                    <p>更新昵称、用户名与房号信息</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mobile-me-settings-close"
                  aria-label="关闭编辑资料"
                  onClick={closeProfileEditor}
                  disabled={profileSaving}
                >
                  <CloseIcon />
                </button>
              </div>
              <form className="mobile-me-profile-form" onSubmit={handleProfileSubmit}>
                <label className="mobile-register-field">
                  <span>昵称</span>
                  <span className="mobile-register-input-wrap">
                    <EditIcon />
                    <input
                      type="text"
                      value={profileDraft.nickname}
                      onChange={(event) =>
                        setProfileDraft((draft) => ({ ...draft, nickname: event.target.value }))
                      }
                      placeholder="请输入昵称"
                      autoCapitalize="none"
                      autoCorrect="off"
                      disabled={profileSaving}
                    />
                  </span>
                </label>
                <label className="mobile-register-field">
                  <span>用户名</span>
                  <span className="mobile-register-input-wrap">
                    <EditIcon />
                    <input
                      type="text"
                      value={profileDraft.username}
                      onChange={(event) =>
                        setProfileDraft((draft) => ({ ...draft, username: event.target.value }))
                      }
                      placeholder="请输入用户名"
                      autoCapitalize="none"
                      autoCorrect="off"
                      disabled={profileSaving}
                    />
                  </span>
                </label>
                <label className="mobile-register-field">
                  <span>房号</span>
                  <span className="mobile-register-input-wrap">
                    <CopyIcon />
                    <input
                      type="text"
                      value={profileDraft.roomNumber}
                      onChange={(event) =>
                        setProfileDraft((draft) => ({ ...draft, roomNumber: event.target.value }))
                      }
                      placeholder="如：1-905"
                      autoCapitalize="none"
                      disabled={profileSaving}
                    />
                  </span>
                  <small>格式：楼栋-房号，例如 1-905</small>
                </label>
                <button
                  type="submit"
                  className="mobile-register-submit"
                  disabled={profileSaving}
                >
                  {profileSaving ? "保存中..." : "保存资料"}
                </button>
              </form>
            </section>
          </div>
        ) : null}

      <section className="hidden md:grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <CyberPanel title="个人中心" kicker="Profile">
          <div className="flex items-start gap-4">
            <ResidentAvatar name={currentUser.nickname} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[1.3rem] font-semibold text-slate-950">
                  {currentUser.nickname}
                </div>
                <span className="app-chip">
                  {currentUser.role === "admin" ? "管理员" : "已认证业主"}
                </span>
              </div>
              <div className="mt-2 text-sm text-[var(--muted)]">
                {currentUser.roomNumber}
              </div>
            </div>
            <Button size="sm" variant="secondary" onPress={openProfileEditor}>
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
                  <span className="app-shell-link-icon">{item.icon}</span>
                  <span className="app-shell-link-copy">
                    <span className="app-shell-link-title">{item.label}</span>
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
                  <span className="app-shell-link-icon">{item.icon}</span>
                  <span className="app-shell-link-copy">
                    <span className="app-shell-link-title">{item.label}</span>
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

      <section className="hidden md:grid gap-4 xl:grid-cols-3">
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
