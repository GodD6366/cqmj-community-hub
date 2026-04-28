"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCommunityPosts } from "./community-provider";
import { serviceTicketCategoryMeta } from "@/lib/types";
import { EmptyState, QuickActionTile, SectionHeader, ServiceTicketCard } from "./resident-shared";

const serviceCatalog = [
  { label: "物业报修", description: "快速响应", icon: "修", href: "/publish?kind=ticket&category=repair", gradient: "linear-gradient(135deg,#53d2c3,#3cb5a1)" },
  { label: "投诉建议", description: "直达物业", icon: "议", href: "/publish?kind=ticket&category=complaint", gradient: "linear-gradient(135deg,#6f86ff,#5070ff)" },
  { label: "访客通行", description: "登记提醒", icon: "访", href: "/publish?kind=discussion", gradient: "linear-gradient(135deg,#8a7dff,#5ca4ff)" },
  { label: "停车管理", description: "车位反馈", icon: "停", href: "/publish?kind=ticket&category=facility", gradient: "linear-gradient(135deg,#ffb36d,#ff8d5a)" },
] as const;

export function ServicesClient() {
  const { serviceTickets, currentUser } = useCommunityPosts();
  const myTickets = useMemo(() => serviceTickets.filter((ticket) => ticket.isMine), [serviceTickets]);

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <section className="app-gradient-card px-4 py-5 text-white md:px-5 md:py-6">
        <div className="max-w-3xl">
          <div className="section-kicker text-white/68">服务台</div>
          <h1 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.05em] md:text-[2.3rem]">报修报事与社区服务入口</h1>
          <p className="mt-3 text-sm leading-6 text-white/78 md:text-[0.95rem] md:leading-7">
            常用入口集中到一个服务台里，提交后会自动进入工单流并同步到你的消息中心。
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/publish?kind=ticket" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--primary)]">
            提交工单
          </Link>
          <Link href="/me" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white">
            查看我的
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-start">
        <section className="app-card px-4 py-4 md:px-5 md:py-5">
          <SectionHeader title="常用服务" caption="快捷入口" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {serviceCatalog.map((item) => (
              <QuickActionTile key={item.label} {...item} />
            ))}
          </div>
        </section>

        <section className="app-card px-4 py-4 md:px-5 md:py-5">
          <SectionHeader title="我的服务进度" caption="工单概览" />
          {currentUser ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="app-card-muted px-3 py-4 text-center">
                <div className="text-xl font-semibold text-slate-950">{myTickets.length}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">我的工单</div>
              </div>
              <div className="app-card-muted px-3 py-4 text-center">
                <div className="text-xl font-semibold text-slate-950">
                  {myTickets.filter((ticket) => ticket.status !== "resolved").length}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">处理中</div>
              </div>
              <div className="app-card-muted px-3 py-4 text-center">
                <div className="text-xl font-semibold text-slate-950">
                  {myTickets.filter((ticket) => ticket.status === "resolved").length}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">已完成</div>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm leading-6 text-[var(--muted)]">
              登录后即可查看自己的工单进度，并在消息页收到状态更新。
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)] xl:items-start">
        <section className="app-card px-4 py-4 md:px-5 md:py-5">
          <SectionHeader title="最近工单" caption="真实列表" />
          {serviceTickets.length > 0 ? (
            <div className="mt-4 space-y-3">
              {serviceTickets.map((ticket) => (
                <ServiceTicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="还没有工单"
                description="从报修报事入口提交第一条工单，后续处理状态会实时出现在这里。"
                actionHref="/publish?kind=ticket"
                actionLabel="提交工单"
              />
            </div>
          )}
        </section>

        <section className="app-card px-4 py-4 md:px-5 md:py-5 xl:sticky xl:top-28">
          <SectionHeader title="服务说明" caption="分类提示" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {Object.entries(serviceTicketCategoryMeta).map(([key, meta]) => (
              <div key={key} className="rounded-[1.1rem] bg-[var(--surface-muted)] px-3 py-3">
                <div className="text-sm font-semibold text-slate-900">{meta.label}</div>
                <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{meta.description}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
