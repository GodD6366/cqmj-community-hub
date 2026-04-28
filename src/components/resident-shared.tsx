"use client";

import Link from "next/link";
import type { PollSummary, ServiceTicketSummary } from "@/lib/types";
import { pollStatusMeta, serviceTicketCategoryMeta, serviceTicketStatusMeta } from "@/lib/types";
import { formatDateTime, timeAgo } from "@/lib/utils";

export function getResidentAvatarInitial(name: string) {
  const firstCharacter = Array.from(name.trim())[0] ?? "?";
  return /^[a-z]$/i.test(firstCharacter) ? firstCharacter.toUpperCase() : firstCharacter;
}

export function ResidentAvatar({
  name,
  size = "md",
  tone = "default",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "inverse";
}) {
  const sizeClass = size === "sm" ? "h-11 w-11 text-sm" : size === "lg" ? "h-14 w-14 text-lg" : "h-12 w-12 text-base";
  const toneClass =
    tone === "inverse"
      ? "bg-white/14 text-white ring-1 ring-white/12"
      : "bg-[linear-gradient(135deg,rgba(79,99,255,0.16),rgba(126,109,248,0.14))] text-[var(--primary)] ring-1 ring-white/80";
  const innerClass = tone === "inverse" ? "bg-white/8" : "bg-white/72";

  return (
    <div
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] font-semibold shadow-[0_16px_30px_rgba(79,99,255,0.12)] ${sizeClass} ${toneClass}`}
    >
      <span className={`absolute inset-[1px] rounded-[calc(1.25rem-1px)] ${innerClass}`} />
      {tone === "inverse" ? null : <span className="absolute inset-auto left-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-white/70" />}
      <span className="relative">{getResidentAvatarInitial(name)}</span>
    </div>
  );
}

export function SectionHeader({
  title,
  caption,
  href,
  actionLabel,
}: {
  title: string;
  caption?: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="app-section-title">
      <div>
        {caption ? <div className="section-kicker">{caption}</div> : null}
        <h2 className={caption ? "mt-2" : ""}>{title}</h2>
      </div>
      {href && actionLabel ? (
        <Link className="app-section-link" href={href}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function QuickActionTile({
  label,
  description,
  icon,
  href,
  gradient,
}: {
  label: string;
  description: string;
  icon: string;
  href: string;
  gradient: string;
}) {
  return (
    <Link href={href} className="app-card-muted h-full p-3 md:p-4">
      <div className="flex items-center gap-3">
        <span className="app-icon-bubble shrink-0" style={{ background: gradient }}>
          <span className="text-lg">{icon}</span>
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{label}</div>
          <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</div>
        </div>
      </div>
    </Link>
  );
}

export function PollCard({
  poll,
  onVote,
  pending,
  allowVote = true,
}: {
  poll: PollSummary;
  onVote?: (optionId: string) => void | Promise<void>;
  pending?: boolean;
  allowVote?: boolean;
}) {
  return (
    <article className="app-card p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`app-chip ${poll.status === "active" ? "app-chip-muted" : ""}`}>
            {pollStatusMeta[poll.status].label}
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-950">{poll.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{poll.description}</p>
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <div>{poll.totalVotes} 人参与</div>
          <div className="mt-1">{poll.endsAt ? `截止 ${formatDateTime(poll.endsAt)}` : "长期开放"}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {poll.options.map((option) => {
          const isSelected = poll.selectedOptionId === option.id;
          const percentage = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;

          return (
            <button
              key={option.id}
              type="button"
              className={`relative overflow-hidden rounded-[1rem] border px-3 py-3 text-left transition ${
                isSelected
                  ? "border-[rgba(79,99,255,0.24)] bg-[rgba(79,99,255,0.1)]"
                  : "border-[rgba(88,109,175,0.12)] bg-white"
              }`}
              disabled={!allowVote || pending || poll.hasVoted || poll.status !== "active"}
              onClick={() => onVote?.(option.id)}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-r-full bg-[rgba(126,109,248,0.12)]"
                style={{ width: `${Math.max(percentage, isSelected ? 20 : 0)}%` }}
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">{option.label}</span>
                <span className="text-xs text-[var(--muted)]">
                  {option.voteCount} 票 · {percentage}%
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {poll.hasVoted ? (
        <div className="mt-3 text-xs font-semibold text-[var(--primary)]">你已参与该投票</div>
      ) : null}
    </article>
  );
}

export function ServiceTicketCard({ ticket }: { ticket: ServiceTicketSummary }) {
  return (
    <article className="app-card p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-chip app-chip-muted">{serviceTicketCategoryMeta[ticket.category].label}</span>
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[0.72rem] font-semibold text-[var(--primary)]">
              {serviceTicketStatusMeta[ticket.status].label}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-950">{ticket.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{ticket.description}</p>
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <div>{ticket.isMine ? "我的工单" : ticket.authorName}</div>
          <div className="mt-1">{timeAgo(ticket.updatedAt)}</div>
        </div>
      </div>

      {ticket.assigneeNote ? (
        <div className="mt-3 rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
          处理备注：{ticket.assigneeNote}
        </div>
      ) : null}
    </article>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="paper-panel rounded-[1.4rem] px-4 py-5 text-center md:px-5 md:py-6">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      {actionHref && actionLabel ? (
        <Link className="mt-4 inline-flex rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
