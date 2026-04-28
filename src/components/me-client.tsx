"use client";

import Link from "next/link";
import { useMemo } from "react";
import { EmptyState, ResidentAvatar, SectionHeader } from "./resident-shared";
import { SystemLogo } from "./system-logo";
import { useCommunityPosts } from "./community-provider";

const menuItems = [
  { label: "我的服务", href: "/services", description: "工单与物业服务", mark: "务" },
  { label: "我的帖子", href: "/neighbors", description: "回看你的社区发布", mark: "帖" },
  { label: "我的收藏", href: "/neighbors", description: "收藏过的内容归档", mark: "藏" },
  { label: "帮助与反馈", href: "/about", description: "产品说明与使用反馈", mark: "问" },
  { label: "社区规则", href: "/rules", description: "查看发帖与互动规范", mark: "规" },
] as const;

export function MeClient() {
  const { currentUser, posts, polls, serviceTickets, notifications } = useCommunityPosts();

  const stats = useMemo(() => {
    const myPosts = currentUser ? posts.filter((post) => post.authorName === currentUser.username) : [];
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
      { title: "帖子归档", description: "按发布、收藏与互动把你的内容收在一起。" },
      { title: "工单进度", description: "无需翻找聊天记录，服务状态会在这里持续更新。" },
      { title: "提醒同步", description: "评论、投票与系统消息集中进一个提醒箱。" },
    ] as const;

    return (
      <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
        <div className="mobile-resident-only mobile-resident-stack">
          <section
            className="mobile-resident-hero mobile-resident-enter text-white"
            style={{
              animationDelay: "40ms",
              background:
                "radial-gradient(circle at 16% 18%, rgba(237,170,92,0.34), transparent 25%), radial-gradient(circle at 84% 14%, rgba(97,172,167,0.24), transparent 22%), linear-gradient(160deg, #241b16 0%, #473223 46%, #6b4a32 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <SystemLogo className="gap-0" markClassName="h-11 w-11" showLabel={false} />
              <div className="mobile-resident-kicker text-white/72">Resident File</div>
            </div>

            <h1 className="mobile-resident-title mt-5 max-w-[9ch]">把社区记录收进你的档案夹</h1>
            <p className="mobile-resident-copy mt-3 max-w-[28ch] text-white/76">
              登录后集中查看你的发布、收藏、工单和消息提醒，移动端会像随身居民卡一样一目了然。
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {[
                { label: "帖子归档", value: "04" },
                { label: "工单进度", value: "02" },
                { label: "消息提醒", value: "08" },
                { label: "社区参与", value: "03" },
              ].map((item) => (
                <div key={item.label} className="mobile-resident-metric bg-white/10 ring-1 ring-white/10 backdrop-blur-sm">
                  <div className="mobile-resident-metric-label text-white/58">{item.label}</div>
                  <div className="mobile-resident-metric-value text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <Link
              href="/login?next=/me"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold shadow-[0_16px_28px_rgba(26,18,13,0.18)]"
              style={{ color: "#4f3526" }}
            >
              <span>登录后继续</span>
              <span aria-hidden="true">→</span>
            </Link>
          </section>

          <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "120ms" }}>
            <div className="mobile-resident-kicker text-[#8a5d39]">Unlock Preview</div>
            <h2 className="mobile-resident-panel-title">登录后你会看到</h2>
            <p className="mobile-resident-panel-copy">这不是一张空白页，而是一个把个人社区行为整理成日常入口的移动端工作台。</p>

            <div className="mt-4 grid gap-2.5">
              {lockedFeatures.map((item) => (
                <div key={item.title} className="rounded-[1.2rem] bg-white/78 px-4 py-3 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="hidden md:block pt-4 md:pt-6">
          <EmptyState
            title="登录后进入个人中心"
            description="查看你的帖子、工单、投票参与记录和消息提醒。"
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
      hint: "跟进进度",
      icon: "工",
      accent: "linear-gradient(135deg,#c97c45,#e4ab6a)",
    },
    {
      label: "我的消息",
      href: "/messages",
      value: stats.notifications,
      hint: "提醒同步",
      icon: "信",
      accent: "linear-gradient(135deg,#2f7d8a,#59afb5)",
    },
    {
      label: "我的帖子",
      href: "/neighbors",
      value: stats.myPosts,
      hint: "查看发布",
      icon: "帖",
      accent: "linear-gradient(135deg,#3a5d86,#638dc1)",
    },
    {
      label: "我的收藏",
      href: "/neighbors",
      value: stats.favoritePosts,
      hint: "回看内容",
      icon: "藏",
      accent: "linear-gradient(135deg,#7b6151,#b08469)",
    },
  ] as const;

  const activityItems = [
    {
      label: "投票参与",
      value: stats.votedPolls,
      description: stats.votedPolls > 0 ? "你已经参与过社区投票，继续保持互动。" : "还没有参与投票，可以先去看看邻里热议。",
    },
    {
      label: "提醒箱",
      value: stats.notifications,
      description: stats.notifications > 0 ? "有新的消息等待处理，适合先看提醒箱。" : "目前提醒箱很安静，没有新的互动。",
    },
    {
      label: "房号状态",
      value: currentUser.roomNumber || "未绑定",
      description: "房号信息会影响服务工单与身份展示。",
    },
  ] as const;

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <div className="mobile-resident-only mobile-resident-stack">
        <section
          className="mobile-resident-hero mobile-resident-enter text-white"
          style={{
            animationDelay: "40ms",
            background:
              "radial-gradient(circle at 14% 20%, rgba(231,162,84,0.34), transparent 26%), radial-gradient(circle at 85% 14%, rgba(95,178,150,0.26), transparent 22%), linear-gradient(160deg, #221812 0%, #38271f 46%, #5f4638 100%)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <ResidentAvatar name={currentUser.username} size="lg" tone="inverse" />
              <div className="min-w-0">
                <div className="mobile-resident-kicker text-white/72">Resident File</div>
                <h1 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.05em] text-white">{currentUser.username}</h1>
                <p className="mt-1 text-sm text-white/72">{currentUser.roomNumber || "未绑定房号"}</p>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[0.72rem] font-semibold text-white/80 ring-1 ring-white/10">
              今日档案
            </span>
          </div>

          <p className="mobile-resident-copy mt-4 max-w-[29ch] text-white/76">
            你的发帖、收藏、投票参与和服务工单，都被重新整理成适合单手查看的个人社区工作台。
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {[
              { label: "发布", value: stats.myPosts },
              { label: "参与", value: stats.votedPolls },
              { label: "收藏", value: stats.favoritePosts },
              { label: "工单", value: stats.myTickets },
            ].map((item) => (
              <div key={item.label} className="mobile-resident-metric bg-white/10 ring-1 ring-white/10 backdrop-blur-sm">
                <div className="mobile-resident-metric-label text-white/58">{item.label}</div>
                <div className="mobile-resident-metric-value text-white">{String(item.value).padStart(2, "0")}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "120ms" }}>
          <div className="mobile-resident-kicker text-[#8a5d39]">Quick Dock</div>
          <h2 className="mobile-resident-panel-title">常用直达</h2>
          <p className="mobile-resident-panel-copy">把高频动作放在第一屏，减少在底部导航和详情页之间来回跳转。</p>

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
                    <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.hint}</div>
                  </div>
                </div>
                <div className="mt-4 text-[1.65rem] font-semibold tracking-[-0.05em] text-[#17263f]">{String(item.value).padStart(2, "0")}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "200ms" }}>
          <div className="mobile-resident-kicker text-[#2f7d8a]">Weekly Snapshot</div>
          <h2 className="mobile-resident-panel-title">本周状态</h2>
          <p className="mobile-resident-panel-copy">这页不只是静态资料页，也会告诉你现在最值得先处理哪一类内容。</p>

          <div className="mt-4 grid gap-2.5">
            {activityItems.map((item) => (
              <div key={item.label} className="rounded-[1.2rem] bg-white/78 px-4 py-3 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <div className="text-sm font-semibold text-[#2b435e]">{item.value}</div>
                </div>
                <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "280ms" }}>
          <div className="mobile-resident-kicker text-[#315d8f]">Account Lane</div>
          <h2 className="mobile-resident-panel-title">账户与设置</h2>
          <p className="mobile-resident-panel-copy">次级入口收成一列，阅读顺序更稳定，也更适合手指逐项点击。</p>

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
                  <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</div>
                </div>
                <span className="text-sm text-[var(--muted)]">›</span>
              </Link>
            ))}
          </div>
        </section>
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
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/76 md:text-[0.95rem] md:leading-7">
                在这里集中查看自己的发布、参与、收藏和工单进度，常用入口也已经针对桌面端重新整理成更均衡的网格。
              </p>
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
            <SectionHeader title="常用直达" caption="个人入口" />
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
            <SectionHeader title="账户与设置" caption="入口列表" />
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
          </section>
        </div>
      </div>
    </main>
  );
}
