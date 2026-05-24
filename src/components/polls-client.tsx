"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { Alert, Button, Input } from "@heroui/react";
import { PollEditor } from "./poll-editor";
import { useCommunityPosts } from "./community-provider";
import { CyberPanel, CyberStatGrid, DataList, EmptyState, PollCard } from "./resident-shared";

const filters = [
  { key: "all", label: "全部投票" },
  { key: "active", label: "进行中" },
  { key: "voted", label: "已参与" },
  { key: "closed", label: "已结束" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

export function PollsClient() {
  const router = useRouter();
  const { polls, currentUser, hydrated, addPoll, votePoll } = useCommunityPosts();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [pendingPollId, setPendingPollId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const filteredPolls = useMemo(() => {
    let items = [...polls].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter === "active") items = items.filter((item) => item.status === "active");
    else if (filter === "voted") items = items.filter((item) => item.hasVoted);
    else if (filter === "closed") items = items.filter((item) => item.status === "closed");

    const q = deferredQuery.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) =>
      [item.title, item.description, item.authorName, ...item.options.map((option) => option.label)].join(" ").toLowerCase().includes(q),
    );
  }, [deferredQuery, filter, polls]);

  const stats = useMemo(
    () => ({
      total: polls.length,
      active: polls.filter((item) => item.status === "active").length,
      voted: polls.filter((item) => item.hasVoted).length,
      closed: polls.filter((item) => item.status === "closed").length,
    }),
    [polls],
  );

  const loginHref = "/login?next=/neighbors";

  return (
    <main className="page-shell space-y-4 md:space-y-5">
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

      <section className="terminal-mobile-root md:!hidden">
        <div className="terminal-hero-card">
          <div className="terminal-page-head">
            <div>
              <div className="terminal-kicker">社区投票</div>
              <h1 className="terminal-page-title">投票广场</h1>
              <p className="terminal-page-subtitle">查看社区议题、参与表决，也可以直接发起新的投票。</p>
            </div>
            {currentUser ? (
              <button type="button" className="terminal-icon-button" aria-label="发起投票" onClick={() => setShowComposer((value) => !value)}>
                {showComposer ? "×" : "＋"}
              </button>
            ) : (
              <Link href={loginHref} className="terminal-icon-button" aria-label="登录后发起投票">
                →
              </Link>
            )}
          </div>
          <div className="terminal-search-shell mt-4">
            <Input aria-label="搜索投票" className="flex-1" placeholder="搜索标题 / 说明 / 选项" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="terminal-filter-row mt-4">
            {filters.map((item) => (
              <button key={item.key} type="button" className={`terminal-filter-pill ${filter === item.key ? "is-active" : ""}`} onClick={() => setFilter(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {showComposer ? (
          currentUser ? (
            <PollEditor
              editorTitle="发起社区投票"
              editorDescription="补充投票背景、截止时间与备选项，让居民快速理解并参与。"
              onCancel={() => setShowComposer(false)}
              onSubmit={async (draft) => {
                setError("");
                setMessage("");
                await addPoll(draft);
                setMessage("投票已发布，快邀请大家参与吧。");
                setShowComposer(false);
              }}
            />
          ) : (
            <EmptyState title="登录后发起投票" description="先登录，再创建新的社区议题与表决。" actionHref={loginHref} actionLabel="去登录" />
          )
        ) : null}

        <div className="space-y-3">
          {!hydrated ? (
            <div className="terminal-panel text-sm text-[var(--muted)]">加载中...</div>
          ) : filteredPolls.length > 0 ? (
            filteredPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                pending={pendingPollId === poll.id}
                allowVote={Boolean(currentUser)}
                onVote={async (optionId) => {
                  if (!currentUser) {
                    setError("请先登录后参与投票");
                    return;
                  }
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
            <EmptyState title="暂无匹配投票" description={query ? "换个关键词试试。" : "现在还没有相关投票，先发起一个吧。"} actionHref={currentUser ? undefined : loginHref} actionLabel={currentUser ? undefined : "去登录"} />
          )}
        </div>
      </section>

      <section className="hidden md:grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <CyberPanel
          title="投票广场"
          kicker="Community Voting"
          action={
            currentUser ? (
              <Button size="sm" onPress={() => setShowComposer((value) => !value)}>
                {showComposer ? "收起发起器" : "发起投票"}
              </Button>
            ) : (
              <Button onPress={() => router.push(loginHref)} size="sm" variant="secondary">
                登录后发起
              </Button>
            )
          }
        >
          <div className="space-y-4">
            <Input aria-label="搜索投票" placeholder="搜索标题 / 说明 / 发起人 / 选项" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="flex gap-2 overflow-x-auto pb-2">
              {filters.map((item) => (
                <button key={item.key} type="button" className={`rounded-full px-3 py-1.5 text-[0.82rem] font-semibold ${filter === item.key ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border border-[var(--border)] text-[var(--muted)]"}`} onClick={() => setFilter(item.key)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              {!hydrated ? (
                <div className="app-card-muted p-4 text-sm text-[var(--muted)]">加载中...</div>
              ) : filteredPolls.length > 0 ? (
                filteredPolls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    pending={pendingPollId === poll.id}
                    allowVote={Boolean(currentUser)}
                    onVote={async (optionId) => {
                      if (!currentUser) {
                        setError("请先登录后参与投票");
                        return;
                      }
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
                <EmptyState title="暂无匹配投票" description={query ? "换个关键词试试。" : "现在还没有相关投票，先发起一个吧。"} />
              )}
            </div>
          </div>
        </CyberPanel>

        <div className="grid gap-4">
          <CyberPanel title="投票统计" kicker="Summary">
            <CyberStatGrid
              columns={2}
              items={[
                { label: "总投票数", value: hydrated ? String(stats.total) : "--" },
                { label: "进行中", value: hydrated ? String(stats.active) : "--" },
                { label: "我已参与", value: hydrated ? String(stats.voted) : "--" },
                { label: "已结束", value: hydrated ? String(stats.closed) : "--" },
              ]}
            />
          </CyberPanel>
          <CyberPanel title="当前筛选" kicker="Filter State">
            <DataList items={filters.map((item) => ({ label: item.label, hint: item.key === filter ? "当前查看的投票范围" : "切换到这个投票分组", value: item.key === filter ? "当前" : undefined }))} />
          </CyberPanel>
          <CyberPanel title="参与说明" kicker="How it works">
            <DataList
              items={[
                { label: "浏览投票", hint: "未登录也可以查看投票内容与当前结果。" },
                { label: "参与表决", hint: currentUser ? "点击任一选项即可提交投票。" : "登录后才能参与表决。", value: currentUser ? "已解锁" : <Link href={loginHref}>去登录</Link> },
                { label: "发起议题", hint: currentUser ? "你可以直接创建新的社区投票。" : "登录后可以发起新的社区议题。", value: currentUser ? "可发起" : <Link href={loginHref}>去登录</Link> },
              ]}
            />
          </CyberPanel>
        </div>
      </section>

      {showComposer ? (
        currentUser ? (
          <PollEditor
            editorTitle="发起社区投票"
            editorDescription="设置清晰的投票标题、背景说明与选项，方便居民快速参与。"
            onCancel={() => setShowComposer(false)}
            onSubmit={async (draft) => {
              setError("");
              setMessage("");
              await addPoll(draft);
              setMessage("投票已发布，快邀请大家参与吧。");
              setShowComposer(false);
            }}
          />
        ) : null
      ) : null}
    </main>
  );
}
