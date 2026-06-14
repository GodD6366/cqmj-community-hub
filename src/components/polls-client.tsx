"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { Alert, Button } from "@heroui/react";
import { PollEditor } from "./poll-editor";
import { useCommunityPosts } from "./community-provider";
import { ButtonLink } from "./ui";
import {
  CyberPanel,
  CyberStatGrid,
  DataList,
  EmptyState,
  PollCard,
  ResidentFilterTabs,
  ResidentPageHeader,
  ResidentPanel,
  ResidentSearchBar,
} from "./resident-shared";

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
  const filterTabs = useMemo(() => filters.map((item) => ({ key: item.key, label: item.label })), []);

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

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_360px] gap-4">
        {/* 左侧主要内容 */}
        <div className="space-y-4">
          {/* 移动端专属 PageHeader：在 md:hidden 下显示 */}
          <div className="md:hidden">
            <ResidentPageHeader
              action={
                currentUser ? (
                  <Button size="sm" onPress={() => setShowComposer((value) => !value)}>
                    {showComposer ? "收起" : "发起"}
                  </Button>
                ) : (
                  <ButtonLink href={loginHref} size="sm" variant="secondary">
                    登录后发起
                  </ButtonLink>
                )
              }
              kicker="社区投票"
              subtitle="查看社区议题、参与表决，也可以直接发起新的投票。"
              title="投票广场"
            />
          </div>

          {/* 桌面端特有的面板头：只在 PC 端显示，包含发起投票按钮 */}
          <div className="hidden md:flex justify-between items-center bg-white p-5 rounded-2xl border border-[var(--border)]">
            <div>
              <div className="text-xs text-indigo-600 font-semibold">Community Voting · 社区治理</div>
              <h1 className="text-xl font-bold mt-1 text-slate-900">投票广场</h1>
            </div>
            {currentUser ? (
              <Button size="sm" onPress={() => setShowComposer((value) => !value)}>
                {showComposer ? "收起发起器" : "发起投票"}
              </Button>
            ) : (
              <Button onPress={() => router.push(loginHref)} size="sm" variant="secondary">
                登录后发起
              </Button>
            )}
          </div>

          {/* 投票搜索与过滤栏（共享） */}
          <div className="bg-white p-4 rounded-2xl border border-[var(--border)] space-y-4">
            <ResidentSearchBar ariaLabel="搜索投票" placeholder="搜索标题 / 说明 / 发起人 / 选项" value={query} onChange={setQuery} />
            <ResidentFilterTabs activeKey={filter} items={filterTabs} onChange={setFilter} />
          </div>

          {/* 发起投票编辑器（共享，只写一次） */}
          {showComposer && (
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
            ) : (
              <EmptyState title="登录后发起投票" description="先登录，再创建新的社区议题与表决。" actionHref={loginHref} actionLabel="去登录" />
            )
          )}

          {/* 投票列表（共享） */}
          <div className="grid gap-3">
            {!hydrated ? (
              <div className="app-card p-6 text-sm text-[var(--muted)] text-center">加载中...</div>
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
        </div>

        {/* 右侧边栏：仅在桌面端显示 */}
        <div className="hidden md:grid gap-4 auto-rows-max">
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
      </div>
    </main>
  );
}
