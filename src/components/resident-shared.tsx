"use client";

import Link from "next/link";
import { useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { Input } from "@heroui/react";
import type { PollSummary, ServiceTicketSummary } from "@/lib/types";
import { pollStatusMeta, serviceTicketCategoryMeta, serviceTicketStatusMeta } from "@/lib/types";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { ArrowLeftIcon, SearchIcon } from "./app-icons";
import { notificationIconMap } from "./app-icons";

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
  const sizeClass = size === "sm" ? "h-10 w-10 text-sm" : size === "lg" ? "h-14 w-14 text-lg" : "h-12 w-12 text-base";
  const toneClass =
    tone === "inverse"
      ? "bg-white/70 text-[var(--foreground)] ring-1 ring-white/70 shadow-[0_8px_20px_rgba(73,98,128,0.08)]"
      : "bg-[linear-gradient(135deg,rgba(115,193,255,0.2),rgba(109,221,175,0.22))] text-[var(--primary-strong)] ring-1 ring-[rgba(123,166,214,0.18)] shadow-[0_10px_24px_rgba(73,98,128,0.08)]";

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[1rem] font-semibold ${sizeClass} ${toneClass}`}>
      <span className="absolute inset-[1px] rounded-[calc(1rem-1px)] bg-[rgba(255,255,255,0.86)]" />
      <span className="relative">{getResidentAvatarInitial(name)}</span>
    </div>
  );
}

export function ResidentMobileHero({ children, background, className, delay = "40ms" }: { children: ReactNode; background: string; className?: string; delay?: string; }) {
  return <section className={cn("mobile-resident-hero mobile-resident-enter text-white", className)} style={{ animationDelay: delay, background }}>{children}</section>;
}

export function ResidentMobilePanel({ children, className, delay = "120ms" }: { children: ReactNode; className?: string; delay?: string; }) {
  return <section className={cn("mobile-resident-panel mobile-resident-enter", className)} style={{ animationDelay: delay }}>{children}</section>;
}

export function ResidentPageHeader({
  title,
  subtitle,
  kicker,
  backHref,
  action,
  meta,
  className,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  backHref?: string;
  action?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("resident-page-header", className)}>
      <div className="resident-page-header-bar">
        {backHref ? (
          <Link className="resident-page-header-back" href={backHref} aria-label="返回">
            <ArrowLeftIcon />
          </Link>
        ) : (
          <span />
        )}
        {meta ? <div className="resident-page-header-meta">{meta}</div> : <span />}
      </div>
      <div className="resident-page-header-main">
        <div className="resident-page-header-copy">
          {kicker ? <div className="section-kicker resident-page-header-kicker">{kicker}</div> : null}
          <h1 className="resident-page-header-title">{title}</h1>
          {subtitle ? <p className="resident-page-header-subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div className="resident-page-header-action">{action}</div> : null}
      </div>
    </section>
  );
}

export function ResidentPanel({
  title,
  kicker,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  kicker?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("resident-panel", className)}>
      {title || kicker || description || action ? (
        <div className="resident-panel-head">
          <div className="resident-panel-head-copy">
            {kicker ? <div className="section-kicker">{kicker}</div> : null}
            {title ? <h2 className="resident-panel-title">{title}</h2> : null}
            {description ? <p className="resident-panel-description">{description}</p> : null}
          </div>
          {action ? <div className="resident-panel-action">{action}</div> : null}
        </div>
      ) : null}
      <div className="resident-panel-body">{children}</div>
    </section>
  );
}

export function ResidentFilterTabs<T extends string>({
  items,
  activeKey,
  onChange,
  className,
}: {
  items: ReadonlyArray<{ key: T; label: string }>;
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("resident-filter-tabs", className)} role="group" aria-label="筛选选项">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={activeKey === item.key}
          className={cn("resident-filter-tab", activeKey === item.key && "is-active")}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ResidentSearchBar({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("resident-search-bar", className)}>
      <span className="resident-search-icon-wrap">
        <SearchIcon className="resident-search-icon" />
      </span>
      <Input
        aria-label={ariaLabel}
        className="resident-search-input"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function ResidentListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  footer,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("resident-list-row", className)}>
      <div className="resident-list-row-main">
        {leading ? <div className="resident-list-row-leading">{leading}</div> : null}
        <div className="resident-list-row-copy">
          <div className="resident-list-row-head">
            <div className="resident-list-row-title">{title}</div>
            {meta ? <div className="resident-list-row-meta">{meta}</div> : null}
          </div>
          {subtitle ? <div className="resident-list-row-subtitle">{subtitle}</div> : null}
          {footer ? <div className="resident-list-row-footer">{footer}</div> : null}
        </div>
        {trailing ? <div className="resident-list-row-trailing">{trailing}</div> : null}
      </div>
    </article>
  );
}

export function SectionHeader({ title, caption, href, actionLabel }: { title: string; caption?: string; href?: string; actionLabel?: string; }) {
  return (
    <div className="app-section-title">
      <div>
        {caption ? <div className="section-kicker">{caption}</div> : null}
        <h2 className={caption ? "mt-2" : ""}>{title}</h2>
      </div>
      {href && actionLabel ? <Link className="app-section-link" href={href}>{actionLabel}</Link> : null}
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
  description?: string;
  icon: ReactNode;
  href: string;
  gradient: string;
}) {
  return (
    <Link href={href} className="app-card-muted h-full p-3 md:p-4">
      <div className="flex items-center gap-3">
        <span className="app-icon-bubble shrink-0" style={{ background: gradient }}>
          <span className="app-icon-bubble-inner">{icon}</span>
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{label}</div>
          {description ? <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</div> : null}
        </div>
      </div>
    </Link>
  );
}

export function ResidentMetricGrid({ items, columns = 2, tone = "inverse", className }: { items: ReadonlyArray<{ label: string; value: ReactNode }>; columns?: 2 | 3 | 4; tone?: "default" | "inverse"; className?: string; }) {
  const columnClass = columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : "grid-cols-2";
  const cardClass = tone === "inverse" ? "bg-white/72 ring-1 ring-white/80 backdrop-blur-sm shadow-[0_10px_24px_rgba(73,98,128,0.08)]" : "bg-[rgba(255,255,255,0.88)] ring-1 ring-[rgba(123,166,214,0.16)]";
  const labelClass = tone === "inverse" ? "text-[var(--muted)]" : "text-[var(--muted)]";
  const valueClass = tone === "inverse" ? "text-slate-950" : "text-slate-950";

  return (
    <div className={cn(`grid gap-2.5 ${columnClass}`, className)}>
      {items.map((item) => (
        <div key={item.label} className={cn("mobile-resident-metric", cardClass)}>
          <div className={cn("mobile-resident-metric-label", labelClass)}>{item.label}</div>
          <div className={cn("mobile-resident-metric-value", valueClass)}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function CyberPanel({ title, kicker, action, children, className }: { title: string; kicker?: string; action?: ReactNode; children: ReactNode; className?: string; }) {
  return (
    <ResidentPanel action={action} className={className} kicker={kicker} title={title}>
      {children}
    </ResidentPanel>
  );
}

export function CyberStatGrid({ items, columns = 4 }: { items: Array<{ label: string; value: ReactNode; delta?: ReactNode }>; columns?: 2 | 3 | 4; }) {
  const gridClass = columns === 4 ? "md:grid-cols-4" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return (
    <div className={`grid gap-3 ${gridClass}`}>
      {items.map((item) => (
        <div key={item.label} className="app-card-muted p-4">
          <div className="text-[0.76rem] font-medium text-[var(--muted)]">{item.label}</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="cyber-number text-[1.75rem] font-bold tracking-[-0.05em] text-slate-950">{item.value}</div>
            {item.delta ? <div className="text-xs font-semibold text-[var(--primary)]">{item.delta}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DataList({ items }: { items: Array<{ label: string; value?: ReactNode; hint?: ReactNode }> }) {
  return (
    <div className="grid gap-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface-secondary)] px-3.5 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-950">{item.label}</div>
            {item.hint ? <div className="mt-1 text-xs text-[var(--muted)]">{item.hint}</div> : null}
          </div>
          {item.value ? <div className="shrink-0 text-sm font-semibold text-[var(--primary)]">{item.value}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function PollCard({ poll, onVote, pending, allowVote = true }: { poll: PollSummary; onVote?: (optionId: string) => void | Promise<void>; pending?: boolean; allowVote?: boolean; }) {
  return (
    <article className="app-card-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`app-chip ${poll.status === "active" ? "" : "app-chip-muted"}`}>{pollStatusMeta[poll.status].label}</div>
          <h3 className="mt-3 text-base font-semibold text-slate-950">{poll.title}</h3>
          <p className="mt-1.5 text-[0.82rem] leading-5 text-[var(--muted)] line-clamp-2">{poll.description}</p>
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <div>{poll.totalVotes} 人参与</div>
          <div className="mt-1">{poll.endsAt ? `截止 ${formatDateTime(poll.endsAt)}` : "长期开放"}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {poll.options.map((option) => {
          const isSelected = poll.selectedOptionId === option.id;
          const percentage = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
          return (
            <button key={option.id} type="button" className={`relative overflow-hidden rounded-[0.95rem] border px-3 py-2.5 text-left ${isSelected ? "border-[rgba(93,190,146,0.3)] bg-[rgba(109,221,175,0.14)]" : "border-[var(--border)] bg-[rgba(255,255,255,0.88)]"}`} disabled={!allowVote || pending || poll.hasVoted || poll.status !== "active"} onClick={() => onVote?.(option.id)}>
              <span className="absolute inset-y-0 left-0 bg-[rgba(57,245,143,0.08)]" style={{ width: `${Math.max(percentage, isSelected ? 20 : 0)}%` }} />
              <span className="relative flex items-center justify-between gap-3">
                <span className="text-[0.82rem] font-semibold text-slate-900">{option.label}</span>
                <span className="text-xs text-[var(--muted)]">{option.voteCount} · {percentage}%</span>
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function ServiceTicketCard({ ticket }: { ticket: ServiceTicketSummary }) {
  return (
    <article className="app-card-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-chip">{serviceTicketCategoryMeta[ticket.category].label}</span>
            <span className="app-chip app-chip-muted">{serviceTicketStatusMeta[ticket.status].label}</span>
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-950">{ticket.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{ticket.description}</p>
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <div>{ticket.isMine ? "我的工单" : ticket.authorName}</div>
          <div className="mt-1">{timeAgo(ticket.updatedAt)}</div>
        </div>
      </div>
      {ticket.assigneeNote ? <div className="mt-3 rounded-[1rem] bg-[rgba(109,221,175,0.12)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">处理备注：{ticket.assigneeNote}</div> : null}
    </article>
  );
}

export function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description?: string; actionHref?: string; actionLabel?: string; }) {
  return (
    <div className="paper-panel rounded-[1.4rem] px-4 py-5 text-center md:px-5 md:py-6">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
      {actionHref && actionLabel ? <Link className="mt-4 inline-flex rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)]" href={actionHref}>{actionLabel}</Link> : null}
    </div>
  );
}

export function NotificationTypeIcon({
  type,
  className,
}: {
  type: keyof typeof notificationIconMap;
  className?: string;
}) {
  const Icon = notificationIconMap[type];
  return <Icon aria-hidden="true" className={className} />;
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export interface ToastState {
  visible: boolean;
  text: string;
  status: "success" | "error";
}

export function useToast(durationMs = 2500) {
  const [toast, setToast] = useState<ToastState>({ visible: false, text: "", status: "success" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string, status: "success" | "error" = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, text, status });
    timerRef.current = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), durationMs);
  }, [durationMs]);

  return { toast, show };
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast.visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-12 z-50 flex items-center justify-center pointer-events-none animate-in slide-in-from-bottom-6 fade-in duration-300">
      <div className={`px-4 py-2.5 rounded-full shadow-[0_12px_28px_rgba(73,98,128,0.14)] backdrop-blur-md border text-sm font-semibold tracking-wide ${toast.status === "error" ? "bg-[rgba(255,243,244,0.94)] border-red-300 text-red-600" : "bg-[rgba(255,255,255,0.94)] border-[rgba(109,221,175,0.42)] text-[var(--primary-strong)]"}`}>
        {toast.text}
      </div>
    </div>
  );
}
