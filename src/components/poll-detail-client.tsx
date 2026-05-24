"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Button } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { EmptyState, ResidentAvatar } from "./resident-shared";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { pollStatusMeta } from "@/lib/types";

export function PollDetailClient({ pollId }: { pollId: string }) {
  const { polls, currentUser, votePoll } = useCommunityPosts();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const poll = useMemo(() => polls.find((item) => item.id === pollId) ?? null, [pollId, polls]);

  if (!poll) {
    return <main className="page-shell"><EmptyState title="投票不存在" actionHref="/" actionLabel="返回首页" /></main>;
  }

  return (
    <main className="page-shell space-y-4">
      {message ? <Alert status="success"><Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content></Alert> : null}
      {error ? <Alert status="danger"><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}

      <section className="terminal-mobile-root md:!hidden">
        <div className="terminal-hero-card">
          <div className="terminal-page-head">
            <Link href="/" className="terminal-back-link">←</Link>
            <div>
              <div className="terminal-kicker">投票详情</div>
              <h1 className="terminal-page-title">{poll.title}</h1>
              <p className="terminal-page-subtitle">{pollStatusMeta[poll.status].label} · {poll.totalVotes} 人参与</p>
            </div>
          </div>
        </div>

        <div className="terminal-panel">
          <div className="flex items-start gap-3">
            <ResidentAvatar name={poll.authorName} size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-950">{poll.authorName}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">发布于 {timeAgo(poll.createdAt)}</div>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{poll.description || "暂无补充说明"}</p>
          <div className="mt-4 grid gap-2 text-xs text-[var(--muted)]">
            <div>发起时间：{formatDateTime(poll.createdAt)}</div>
            <div>截止时间：{poll.endsAt ? formatDateTime(poll.endsAt) : "长期开放"}</div>
          </div>
        </div>

        <div className="terminal-panel">
          <div className="terminal-panel-head">
            <h2>方案结果</h2>
            <span>{poll.selectedOptionId ? "已投票" : "未投票"}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {poll.options.map((option) => {
              const percentage = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 1000) / 10 : 0;
              const isSelected = option.id === poll.selectedOptionId;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`terminal-progress-card ${isSelected ? "is-selected" : ""}`}
                  disabled={!currentUser || poll.hasVoted || poll.status !== "active" || pendingOptionId === option.id}
                  onClick={async () => {
                    if (!currentUser) {
                      setError("请先登录后参与投票");
                      return;
                    }
                    setPendingOptionId(option.id);
                    setError("");
                    setMessage("");
                    try {
                      await votePoll(poll.id, option.id);
                      setMessage(`已参与投票：${option.label}`);
                    } catch (submitError) {
                      setError(submitError instanceof Error ? submitError.message : "参与投票失败");
                    } finally {
                      setPendingOptionId(null);
                    }
                  }}
                >
                  <span className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-950">{option.label}</span>
                    <span className="text-[var(--muted)]">{option.voteCount} 票 · {percentage}%</span>
                  </span>
                  <span className="terminal-progress-track"><span className="terminal-progress-fill" style={{ width: `${Math.max(percentage, isSelected ? 12 : 0)}%` }} /></span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
