"use client";

import Link from "next/link";
import { Alert, Input } from "@heroui/react";
import { useDeferredValue, useMemo, useState } from "react";
import { useCommunityPosts } from "./community-provider";
import { EmptyState, PollCard, SectionHeader } from "./resident-shared";
import { PostCard } from "./post-card";
import { filterPublicPosts } from "@/lib/community-store";
import type { PostCategory } from "@/lib/types";
import { categoryMeta } from "@/lib/types";
import { filterPosts, sortPosts, uniquePosts } from "@/lib/utils";

const topActions = [
  { label: "邻里互助", description: "就近回应需求", icon: "♥", href: "/publish?kind=request", gradient: "linear-gradient(135deg,#df8f4c,#f2bc76)" },
  { label: "活动日历", description: "周末活动集合", icon: "✓", href: "/publish?kind=play", gradient: "linear-gradient(135deg,#2d8e94,#65bfc2)" },
  { label: "志愿服务", description: "加入社区共建", icon: "人", href: "/publish?kind=discussion", gradient: "linear-gradient(135deg,#315d8f,#5f8fd7)" },
] as const;

export function NeighborsClient({
  initialCategory = "all",
  initialQuery = "",
}: {
  initialCategory?: PostCategory | "all";
  initialQuery?: string;
}) {
  const { posts, polls, hydrated, votePoll } = useCommunityPosts();
  const [category, setCategory] = useState<PostCategory | "all">(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingPollId, setPendingPollId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const publicPosts = useMemo(() => uniquePosts(filterPublicPosts(posts)), [posts]);
  const categoryEntries = useMemo(
    () => Object.entries(categoryMeta) as Array<[PostCategory, (typeof categoryMeta)[PostCategory]]>,
    [],
  );

  const filteredPosts = useMemo(() => {
    return sortPosts(filterPosts(publicPosts, { category, query: deferredQuery }), "latest");
  }, [category, deferredQuery, publicPosts]);

  const activePolls = polls.slice(0, 3);
  const featuredPoll = activePolls[0] ?? null;
  const activeCategoryMeta = category === "all" ? null : categoryMeta[category];
  const heroStats = [
    { label: "公开动态", value: String(publicPosts.length).padStart(2, "0") },
    { label: "热议投票", value: String(activePolls.length).padStart(2, "0") },
    { label: "当前频道", value: activeCategoryMeta?.badge ?? "全部" },
  ] as const;
  const resultSummary = deferredQuery ? `搜索结果 ${filteredPosts.length} 条` : `共 ${publicPosts.length} 条公开动态`;

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <div className="mobile-resident-only mobile-resident-stack">
        <section
          className="mobile-resident-hero mobile-resident-enter text-white"
          style={{
            animationDelay: "40ms",
            background:
              "radial-gradient(circle at 14% 18%, rgba(241,174,93,0.32), transparent 24%), radial-gradient(circle at 84% 14%, rgba(96,191,197,0.26), transparent 22%), linear-gradient(160deg, #102134 0%, #12314a 48%, #1d465f 100%)",
          }}
        >
          <div className="mobile-resident-kicker text-white/70">Neighborhood Desk</div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="mobile-resident-title max-w-[8.2ch]">邻里情报站</h1>
              <p className="mobile-resident-copy mt-3 max-w-[28ch] text-white/76">
                把求助、闲置、约玩和热议压缩成适合手机快速扫读的一张社区行动板。
              </p>
            </div>

            <Link
              href="/publish"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white/14 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/14 backdrop-blur"
            >
              发布
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {heroStats.map((item) => (
              <div key={item.label} className="mobile-resident-metric bg-white/10 ring-1 ring-white/10 backdrop-blur-sm">
                <div className="mobile-resident-metric-label text-white/58">{item.label}</div>
                <div className="mobile-resident-metric-value text-white">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[1.2rem] bg-white/8 px-3.5 py-3 ring-1 ring-white/10 backdrop-blur-sm">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/56">现在适合</div>
            <div className="mt-1 text-sm font-semibold text-white">先搜索缩小范围，再从互助、活动或志愿入口直接发起内容。</div>
          </div>
        </section>

        {message ? (
          <Alert status="success">
            <Alert.Content>
              <Alert.Description>{message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
        {error ? (
          <Alert status="danger">
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "120ms" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mobile-resident-kicker text-[var(--primary)]">Discovery Lane</div>
              <h2 className="mobile-resident-panel-title">搜索与频道</h2>
              <p className="mobile-resident-panel-copy">先筛选主题，再决定是查看帖子还是直接发起一个动作。</p>
            </div>
            <div className="shrink-0 rounded-full bg-[rgba(24,40,71,0.06)] px-3 py-1 text-[0.7rem] font-semibold text-[var(--muted)]">
              {resultSummary}
            </div>
          </div>

          <div className="mt-4">
            <Input
              aria-label="搜索邻里动态"
              fullWidth
              placeholder="搜索需求、帖子、标签、作者"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === "all"
                  ? "bg-[#10253a] text-white shadow-[0_12px_24px_rgba(16,37,58,0.18)]"
                  : "bg-white text-[var(--muted)] ring-1 ring-[rgba(95,116,176,0.08)]"
              }`}
              onClick={() => setCategory("all")}
            >
              全部
            </button>
            {categoryEntries.map(([value, meta]) => (
              <button
                key={value}
                type="button"
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  category === value
                    ? "bg-[#10253a] text-white shadow-[0_12px_24px_rgba(16,37,58,0.18)]"
                    : "bg-white text-[var(--muted)] ring-1 ring-[rgba(95,116,176,0.08)]"
                }`}
                onClick={() => setCategory(value)}
              >
                {meta.badge}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-[1.12rem] bg-[rgba(16,37,58,0.045)] px-3.5 py-3 text-xs leading-5 text-[var(--muted)]">
            {activeCategoryMeta
              ? `${activeCategoryMeta.badge}频道：${activeCategoryMeta.description}`
              : "从需求、闲置、帖子和约玩几个方向切入，手机里先收窄范围会更高效。"}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {topActions.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className={`relative overflow-hidden rounded-[1.3rem] border border-[rgba(95,116,176,0.08)] bg-white/78 p-3 shadow-[0_14px_28px_rgba(58,75,124,0.06)] ${index === 0 ? "col-span-2" : ""}`}
              >
                <div className={`flex h-full ${index === 0 ? "items-center gap-3" : "flex-col gap-3"}`}>
                  <span className="app-icon-bubble h-11 w-11 shrink-0 rounded-[1rem]" style={{ background: item.gradient }}>
                    <span className="text-sm font-bold">{item.icon}</span>
                  </span>

                  <div className="min-w-0">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      {index === 0 ? "优先动作" : "快速入口"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{item.label}</div>
                    <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "200ms" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mobile-resident-kicker text-[#2d8e94]">Consensus Radar</div>
              <h2 className="mobile-resident-panel-title">今天在讨论什么</h2>
              <p className="mobile-resident-panel-copy">把邻里的共识和投票集中放在前面，方便你先看大家正在关心的事。</p>
            </div>
            <Link
              href="/publish?kind=poll"
              className="shrink-0 rounded-full bg-[rgba(45,142,148,0.09)] px-3 py-1 text-[0.72rem] font-semibold text-[#1d6f73]"
            >
              发起
            </Link>
          </div>

          <div className="mt-4">
            {featuredPoll ? (
              <PollCard
                poll={featuredPoll}
                pending={pendingPollId === featuredPoll.id}
                onVote={async (optionId) => {
                  setPendingPollId(featuredPoll.id);
                  setError("");
                  setMessage("");
                  try {
                    await votePoll(featuredPoll.id, optionId);
                    setMessage(`已参与投票：${featuredPoll.title}`);
                  } catch (submitError) {
                    setError(submitError instanceof Error ? submitError.message : "参与投票失败");
                  } finally {
                    setPendingPollId(null);
                  }
                }}
              />
            ) : (
              <EmptyState
                title="还没有投票"
                description="先去发布一个面向邻里的投票，收集大家的意见。"
                actionHref="/publish?kind=poll"
                actionLabel="发起投票"
              />
            )}
          </div>
        </section>

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "280ms" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mobile-resident-kicker text-[#315d8f]">Live Feed</div>
              <h2 className="mobile-resident-panel-title">最新帖子流</h2>
              <p className="mobile-resident-panel-copy">{deferredQuery ? "按搜索结果展示" : "按发布时间更新，方便快速扫读。"}</p>
            </div>
            <div className="shrink-0 rounded-full bg-[rgba(49,93,143,0.08)] px-3 py-1 text-[0.72rem] font-semibold text-[#315d8f]">
              {filteredPosts.length} 条
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {!hydrated ? (
              <div className="app-card h-48 animate-pulse" />
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => <PostCard key={post.id} post={post} compact />)
            ) : (
              <EmptyState
                title="没有匹配的邻里动态"
                description="换个关键词或切回全部频道看看，也可以直接发布一条新的社区内容。"
                actionHref="/publish"
                actionLabel="去发布"
              />
            )}
          </div>
        </section>
      </div>

      <div className="hidden md:block">
        <section className="px-1 md:px-0">
          <div className="app-card relative overflow-hidden px-4 py-5 md:px-6 md:py-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(126,109,248,0.18),transparent_62%),radial-gradient(circle_at_top_right,rgba(99,187,255,0.18),transparent_50%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="section-kicker">邻里</div>
                <h1 className="mt-3 text-[1.8rem] font-semibold tracking-[-0.06em] text-slate-950 md:text-[2.35rem]">热议、互助与社区动态</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)] md:text-[0.98rem]">
                  把社区里的讨论、求助、闲置与约玩整理成更清晰的主次结构，让移动端首屏就能快速找到入口。
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 lg:w-[22rem]">
                {heroStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.25rem] border border-white/70 bg-white/78 px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                  >
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{item.label}</div>
                    <div className="mt-2 text-[1.08rem] font-semibold tracking-[-0.04em] text-slate-950 md:text-[1.16rem]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="rounded-[1.25rem] border border-white/70 bg-white/74 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">邻里动线</div>
                <div className="mt-1 text-sm leading-6 text-slate-700">
                  先搜索，再切频道；需要求助、发活动或征集意见时，可以从下方快捷入口直接发起。
                </div>
              </div>

              <Link
                href="/publish"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[1.15rem] bg-[linear-gradient(135deg,var(--primary),var(--accent))] px-5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(79,99,255,0.22)] transition hover:-translate-y-[1px] md:h-12"
              >
                <span className="text-base">＋</span>
                <span>发布动态</span>
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <Alert status="success">
            <Alert.Content>
              <Alert.Description>{message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
        {error ? (
          <Alert status="danger">
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)] xl:items-start">
          <section className="app-card px-4 py-4 md:px-5 md:py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <SectionHeader title="浏览社区" caption="搜索与频道" />
              <div className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{resultSummary}</div>
            </div>

            <div className="mt-4">
              <Input
                aria-label="搜索邻里动态"
                fullWidth
                placeholder="搜索需求、帖子、标签、作者"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
              <button
                type="button"
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  category === "all"
                    ? "bg-[var(--primary)] text-white shadow-[0_12px_24px_rgba(79,99,255,0.2)]"
                    : "bg-white text-[var(--muted)]"
                }`}
                onClick={() => setCategory("all")}
              >
                全部
              </button>
              {categoryEntries.map(([value, meta]) => (
                <button
                  key={value}
                  type="button"
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    category === value
                      ? "bg-[var(--primary)] text-white shadow-[0_12px_24px_rgba(79,99,255,0.2)]"
                      : "bg-white text-[var(--muted)]"
                  }`}
                  onClick={() => setCategory(value)}
                >
                  {meta.badge}
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-[1.1rem] bg-[var(--surface-muted)] px-3.5 py-3 text-xs leading-5 text-[var(--muted)]">
              {activeCategoryMeta
                ? `${activeCategoryMeta.badge}频道：${activeCategoryMeta.description}`
                : "从需求、闲置、帖子和约玩几个频道快速切换，先缩小范围再看最新帖子会更高效。"}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {topActions.map((item, index) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`group relative overflow-hidden rounded-[1.3rem] border border-[rgba(96,118,182,0.1)] bg-[linear-gradient(180deg,rgba(245,248,255,0.92),rgba(255,255,255,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition hover:-translate-y-[1px] ${index === 0 ? "col-span-2 sm:col-span-1" : ""}`}
                >
                  <div className={`flex h-full ${index === 0 ? "items-center gap-3 sm:flex-col sm:items-start" : "flex-col gap-3"}`}>
                    <span className="app-icon-bubble h-11 w-11 shrink-0 rounded-[1rem]" style={{ background: item.gradient }}>
                      <span className="text-sm font-bold">{item.icon}</span>
                    </span>

                    <div className="min-w-0">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        {index === 0 ? "快速响应" : "直达入口"}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{item.label}</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-28">
            <section className="app-card px-4 py-4 md:px-5 md:py-5">
              <SectionHeader title="正在热议" caption="投票与共识" href="/neighbors" actionLabel="更多" />
              <div className="mt-4 space-y-3">
                {activePolls.length > 0 ? (
                  activePolls.map((poll) => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      pending={pendingPollId === poll.id}
                      onVote={async (optionId) => {
                        setPendingPollId(poll.id);
                        setError("");
                        setMessage("");
                        try {
                          await votePoll(poll.id, optionId);
                          setMessage(`已参与投票：${poll.title}`);
                        } catch (submitError) {
                          setError(submitError instanceof Error ? submitError.message : "参与投票失败");
                        } finally {
                          setPendingPollId(null);
                        }
                      }}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="还没有投票"
                    description="先去发布一个面向邻里的投票，收集大家的意见。"
                    actionHref="/publish?kind=poll"
                    actionLabel="发起投票"
                  />
                )}
              </div>
            </section>

            <section className="app-card px-4 py-4 md:px-5 md:py-5">
              <SectionHeader title="社区提示" caption="发帖建议" />
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.15rem] bg-[var(--surface-muted)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                  标题尽量写清地点、诉求和时间，桌面端会按主次栏展示，更容易被邻居快速扫读。
                </div>
                <div className="rounded-[1.15rem] bg-[var(--surface-muted)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                  如果是发起活动或征求意见，优先使用投票或带标签的帖子，便于后续集中跟进。
                </div>
              </div>
            </section>
          </aside>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1 md:px-0">
              <SectionHeader title="最新帖子流" caption="按时间排序" />
              <div className="text-xs font-semibold text-[var(--muted)]">{deferredQuery ? "按搜索结果展示" : "按发布时间更新"}</div>
            </div>
            {!hydrated ? (
              <div className="app-card h-48 animate-pulse" />
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-3">
                {filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} compact />
                ))}
              </div>
            ) : (
              <EmptyState
                title="没有匹配的邻里动态"
                description="换个关键词或切回全部频道看看，也可以直接发布一条新的社区内容。"
                actionHref="/publish"
                actionLabel="去发布"
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
