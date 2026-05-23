"use client";

import Link from "next/link";
import { Alert, Button, Input } from "@heroui/react";
import { useDeferredValue, useMemo, useState } from "react";
import { useCommunityPosts } from "./community-provider";
import { EmptyState, PollCard, ResidentMetricGrid, ResidentMobileHero, ResidentMobilePanel, SectionHeader } from "./resident-shared";
import { PostCard } from "./post-card";
import { PollEditor } from "./poll-editor";
import { filterPublicPosts } from "@/lib/community-store";
import type { PostCategory } from "@/lib/types";
import { categoryMeta } from "@/lib/types";
import { filterPosts, sortPosts, uniquePosts } from "@/lib/utils";

const topActions = [
  { label: "发需求", icon: "需", href: "/publish?kind=request", gradient: "linear-gradient(135deg,#df8f4c,#f2bc76)" },
  { label: "发约玩", icon: "约", href: "/publish?kind=play", gradient: "linear-gradient(135deg,#2d8e94,#65bfc2)" },
  { label: "发帖子", icon: "帖", href: "/publish?kind=discussion", gradient: "linear-gradient(135deg,#315d8f,#5f8fd7)" },
] as const;

export function NeighborsClient({
  initialCategory = "all",
  initialQuery = "",
  initialMode = "all",
}: {
  initialCategory?: PostCategory | "all";
  initialQuery?: string;
  initialMode?: "all" | "mine" | "favorites";
}) {
  const { currentUser, posts, polls, hydrated, votePoll, updatePoll, deletePoll } = useCommunityPosts();
  const [category, setCategory] = useState<PostCategory | "all">(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingPollId, setPendingPollId] = useState<string | null>(null);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [actingPollId, setActingPollId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const visiblePosts = useMemo(() => {
    if (initialMode === "mine" && currentUser) {
      return uniquePosts(posts.filter((post) => post.isMine));
    }
    if (initialMode === "favorites") {
      return uniquePosts(filterPublicPosts(posts).filter((post) => post.favorited));
    }
    return uniquePosts(filterPublicPosts(posts));
  }, [currentUser, initialMode, posts]);
  const categoryEntries = useMemo(
    () => Object.entries(categoryMeta) as Array<[PostCategory, (typeof categoryMeta)[PostCategory]]>,
    [],
  );

  const filteredPosts = useMemo(() => {
    return sortPosts(filterPosts(visiblePosts, { category, query: deferredQuery }), "latest");
  }, [category, deferredQuery, visiblePosts]);

  const activePolls = polls.slice(0, 3);
  const featuredPoll = activePolls[0] ?? null;
  const myPolls = useMemo(() => polls.filter((poll) => poll.isMine), [polls]);
  const editingPoll = useMemo(
    () => myPolls.find((poll) => poll.id === editingPollId) ?? null,
    [editingPollId, myPolls],
  );
  const activeCategoryMeta = category === "all" ? null : categoryMeta[category];
  const heroStats = [
    { label: initialMode === "mine" ? "我的内容" : initialMode === "favorites" ? "我的收藏" : "公开动态", value: String(visiblePosts.length).padStart(2, "0") },
    { label: "热议投票", value: String(activePolls.length).padStart(2, "0") },
    { label: "当前频道", value: activeCategoryMeta?.badge ?? "全部" },
  ] as const;
  const resultSummary =
    deferredQuery
      ? `结果 ${filteredPosts.length} 条`
      : initialMode === "mine"
        ? `我的 ${visiblePosts.length} 条`
        : initialMode === "favorites"
          ? `收藏 ${visiblePosts.length} 条`
          : `公开 ${visiblePosts.length} 条`;

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <div className="mobile-resident-only mobile-resident-stack">
        <ResidentMobileHero
          background="radial-gradient(circle at 14% 18%, rgba(241,174,93,0.32), transparent 24%), radial-gradient(circle at 84% 14%, rgba(96,191,197,0.26), transparent 22%), linear-gradient(160deg, #102134 0%, #12314a 48%, #1d465f 100%)"
        >
          <div className="mobile-resident-kicker text-white/70">邻里动态</div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="mobile-resident-title max-w-[8.2ch]">邻里动态</h1>
            </div>

            <Link
              href="/publish"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white/14 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/14 backdrop-blur"
            >
              发布
            </Link>
          </div>

          <ResidentMetricGrid className="mt-5" columns={3} items={heroStats} tone="inverse" />

          <div className="mt-4 rounded-[1.2rem] bg-white/8 px-3.5 py-3 text-sm font-semibold text-white ring-1 ring-white/10 backdrop-blur-sm">
            {activeCategoryMeta?.badge ?? "全部"}
          </div>
        </ResidentMobileHero>

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

        <ResidentMobilePanel delay="120ms">
          <div className="min-w-0">
            <div className="mobile-resident-kicker text-[var(--primary)]">搜索</div>
            <h2 className="mobile-resident-panel-title">筛选</h2>
            <div className="mt-2 inline-flex max-w-full rounded-full bg-[rgba(24,40,71,0.06)] px-3 py-1 text-[0.7rem] font-semibold leading-5 text-[var(--muted)]">
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
              className={`shrink-0 rounded-full px-3 py-1.5 text-[0.82rem] font-semibold transition ${
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
                className={`shrink-0 rounded-full px-3 py-1.5 text-[0.82rem] font-semibold transition ${
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

          <div className="mt-4 grid grid-cols-3 gap-2">
            {topActions.map((item) => (
              <Link key={item.label} href={item.href} className="app-icon-tile rounded-[1rem] px-0.5 py-1">
                <span className="app-icon-bubble" style={{ background: item.gradient }}>
                  <span className="text-sm font-bold">{item.icon}</span>
                </span>
                <span className="text-[0.66rem] font-semibold leading-4 text-slate-800">{item.label}</span>
              </Link>
            ))}
          </div>
        </ResidentMobilePanel>

        <ResidentMobilePanel delay="200ms">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mobile-resident-kicker text-[#2d8e94]">投票</div>
              <h2 className="mobile-resident-panel-title">投票</h2>
            </div>
            <Link
              href="/publish?kind=poll"
              className="shrink-0 rounded-full bg-[rgba(45,142,148,0.09)] px-3 py-1 text-[0.72rem] font-semibold text-[#1d6f73]"
            >
              发起
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {myPolls.length > 0 && !editingPoll ? (
              <div className="rounded-[1.1rem] bg-[rgba(45,142,148,0.08)] px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[#1d6f73]">我的投票 {myPolls.length}</div>
                  {myPolls[0] ? (
                    <Button size="sm" variant="secondary" onPress={() => setEditingPollId(myPolls[0].id)}>
                      编辑最新一条
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {editingPoll ? (
              <div className="space-y-2">
                <div className="rounded-[1.1rem] bg-[rgba(45,142,148,0.08)] px-3.5 py-3 text-sm text-[#1d6f73]">
                  正在编辑：{editingPoll.title}
                </div>
                <PollEditor
                  editorTitle="编辑投票"
                  initialDescription={editingPoll.description}
                  initialEndsAt={editingPoll.endsAt ? editingPoll.endsAt.slice(0, 16) : ""}
                  initialOptions={editingPoll.options.map((option) => option.label)}
                  initialTitle={editingPoll.title}
                  onCancel={() => setEditingPollId(null)}
                  onSubmit={async (draft) => {
                    setError("");
                    setMessage("");
                    await updatePoll(editingPoll.id, draft);
                    setEditingPollId(null);
                    setMessage("投票已更新。");
                  }}
                  submitLabel="保存修改"
                  submittingLabel="保存中..."
                />
              </div>
            ) : featuredPoll ? (
              <div className="space-y-3">
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

                {featuredPoll.isMine ? (
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="secondary" onPress={() => setEditingPollId(featuredPoll.id)}>
                      编辑
                    </Button>
                    <Button
                      isPending={actingPollId === featuredPoll.id}
                      size="sm"
                      variant="secondary"
                      onPress={async () => {
                        setActingPollId(featuredPoll.id);
                        setError("");
                        setMessage("");
                        try {
                          await updatePoll(featuredPoll.id, {
                            title: featuredPoll.title,
                            description: featuredPoll.description,
                            options: featuredPoll.options.map((option) => option.label),
                            endsAt: featuredPoll.endsAt,
                            status: "closed",
                          });
                          setMessage("投票已结束。");
                        } catch (submitError) {
                          setError(submitError instanceof Error ? submitError.message : "结束投票失败");
                        } finally {
                          setActingPollId(null);
                        }
                      }}
                    >
                      结束
                    </Button>
                    <Button
                      isPending={actingPollId === `delete-${featuredPoll.id}`}
                      size="sm"
                      variant="danger"
                      onPress={async () => {
                        if (!window.confirm("确定删除这个投票？")) return;
                        setActingPollId(`delete-${featuredPoll.id}`);
                        setError("");
                        setMessage("");
                        try {
                          await deletePoll(featuredPoll.id);
                          setMessage("投票已删除。");
                        } catch (submitError) {
                          setError(submitError instanceof Error ? submitError.message : "删除投票失败");
                        } finally {
                          setActingPollId(null);
                        }
                      }}
                    >
                      删除
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="还没有投票"
                actionHref="/publish?kind=poll"
                actionLabel="发起投票"
              />
            )}
          </div>
        </ResidentMobilePanel>

        <ResidentMobilePanel delay="280ms">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mobile-resident-kicker text-[#315d8f]">动态</div>
              <h2 className="mobile-resident-panel-title">动态</h2>
            </div>
            <div className="shrink-0 rounded-full bg-[rgba(49,93,143,0.08)] px-3 py-1 text-[0.72rem] font-semibold text-[#315d8f]">
              {filteredPosts.length} 条
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {!hydrated ? (
              <EmptyState
                title="动态加载中"
                actionHref="/publish"
                actionLabel="去发布"
              />
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => <PostCard key={post.id} post={post} compact />)
            ) : (
              <EmptyState
                title="没有匹配的邻里动态"
                actionHref="/publish"
                actionLabel="去发布"
              />
            )}
          </div>
        </ResidentMobilePanel>
      </div>

      <div className="hidden md:block">
        <section className="px-1 md:px-0">
          <div className="app-card relative overflow-hidden px-4 py-4 md:px-5 md:py-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(126,109,248,0.18),transparent_62%),radial-gradient(circle_at_top_right,rgba(99,187,255,0.18),transparent_50%)]" />
            <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="section-kicker">邻里</div>
                <h1 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.06em] text-slate-950 md:text-[2rem]">邻里动态</h1>
              </div>

              <div className="grid grid-cols-3 gap-2 lg:w-[18rem]">
                {heroStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1rem] border border-white/70 bg-white/78 px-2.5 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                  >
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{item.label}</div>
                    <div className="mt-1 text-[0.98rem] font-semibold tracking-[-0.04em] text-slate-950 md:text-[1.05rem]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-3 flex justify-end">
              <Link
                href="/publish"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[1rem] bg-[linear-gradient(135deg,var(--primary),var(--accent))] px-4 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(79,99,255,0.18)] transition hover:-translate-y-[1px] md:h-10"
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

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.82fr)] xl:items-start">
          <section className="app-card px-4 py-3 md:px-4 md:py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <SectionHeader title="筛选" />
              <div className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{resultSummary}</div>
            </div>

            <div className="mt-3">
              <Input
                aria-label="搜索邻里动态"
                fullWidth
                placeholder="搜索需求、帖子、标签、作者"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
              <button
                type="button"
                className={`shrink-0 rounded-full px-3 py-1.5 text-[0.82rem] font-semibold transition ${
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
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[0.82rem] font-semibold transition ${
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

            <div className="mt-3 grid grid-cols-3 gap-2">
              {topActions.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group relative overflow-hidden rounded-[1rem] border border-[rgba(96,118,182,0.1)] bg-[linear-gradient(180deg,rgba(245,248,255,0.92),rgba(255,255,255,0.98))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition hover:-translate-y-[1px]"
                >
                  <div className="flex h-full items-center gap-2.5">
                    <span className="app-icon-bubble h-9 w-9 shrink-0 rounded-[0.85rem]" style={{ background: item.gradient }}>
                      <span className="text-sm font-bold">{item.icon}</span>
                    </span>

                    <div className="min-w-0">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        入口
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-slate-900">{item.label}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-28">
            <section className="app-card px-4 py-3 md:px-4 md:py-4">
              <SectionHeader title="投票" href="/neighbors" actionLabel="更多" />
              <div className="mt-3 space-y-2.5">
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
                    actionHref="/publish?kind=poll"
                    actionLabel="发起投票"
                  />
                )}
              </div>
            </section>

          </aside>

          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 px-1 md:px-0">
              <SectionHeader title="动态" />
              <div className="text-xs font-semibold text-[var(--muted)]">{deferredQuery ? "按搜索结果展示" : "按发布时间更新"}</div>
            </div>
            {!hydrated ? (
              <EmptyState
                title="动态加载中"
                actionHref="/publish"
                actionLabel="去发布"
              />
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-3">
                {filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} compact />
                ))}
              </div>
            ) : (
              <EmptyState
                title="没有匹配的邻里动态"
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
