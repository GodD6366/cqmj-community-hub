"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Button } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { ServiceTicketEditor } from "./service-ticket-editor";
import { serviceTicketCategoryMeta, serviceTicketStatusMeta, type ServiceTicketSummary } from "@/lib/types";
import { EmptyState, QuickActionTile, ResidentMetricGrid, ResidentMobileHero, ResidentMobilePanel, SectionHeader, ServiceTicketCard } from "./resident-shared";
import { timeAgo } from "@/lib/utils";

const serviceCatalog = [
  { label: "物业报修", icon: "修", href: "/publish?kind=ticket&category=repair", gradient: "linear-gradient(135deg,#53d2c3,#3cb5a1)" },
  { label: "投诉建议", icon: "议", href: "/publish?kind=ticket&category=complaint", gradient: "linear-gradient(135deg,#6f86ff,#5070ff)" },
  { label: "发帖子", icon: "帖", href: "/publish?kind=discussion", gradient: "linear-gradient(135deg,#8a7dff,#5ca4ff)" },
  { label: "设施问题", icon: "停", href: "/publish?kind=ticket&category=facility", gradient: "linear-gradient(135deg,#ffb36d,#ff8d5a)" },
] as const;

export function ServicesClient() {
  const { serviceTickets, currentUser, updateServiceTicket, deleteServiceTicket } = useCommunityPosts();
  const myTickets = useMemo(() => serviceTickets.filter((ticket) => ticket.isMine), [serviceTickets]);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editingTicket = useMemo(
    () => myTickets.find((ticket) => ticket.id === editingTicketId) ?? null,
    [editingTicketId, myTickets],
  );

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
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

      <div className="mobile-resident-only mobile-resident-stack">
        <ResidentMobileHero
          background="radial-gradient(circle at 14% 20%, rgba(231,162,84,0.3), transparent 25%), radial-gradient(circle at 85% 12%, rgba(97,194,197,0.22), transparent 22%), linear-gradient(160deg, #18211f 0%, #204444 46%, #2f6770 100%)"
        >
          <div className="mobile-resident-kicker text-white/72">服务台</div>
          <h1 className="mobile-resident-title mt-5 max-w-[8ch]">服务工单</h1>

          <ResidentMetricGrid
            className="mt-5"
            columns={3}
            items={[
              { label: "我的工单", value: String(myTickets.length).padStart(2, "0") },
              { label: "处理中", value: String(myTickets.filter((ticket) => ticket.status !== "resolved").length).padStart(2, "0") },
              { label: "全部", value: String(serviceTickets.length).padStart(2, "0") },
            ]}
            tone="inverse"
          />

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/publish?kind=ticket"
              className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-[0_12px_24px_rgba(16,39,39,0.14)] [text-shadow:none]"
              style={{ color: "#225055" }}
            >
              提交工单
            </Link>
            <Link href="/me" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white">
              我的主页
            </Link>
          </div>
        </ResidentMobileHero>

        <ResidentMobilePanel delay="120ms">
          <div className="mobile-resident-kicker text-[#2d8e94]">服务</div>
          <h2 className="mobile-resident-panel-title">服务入口</h2>

          <div className="mt-4 grid gap-2.5">
            {serviceCatalog.map((item) => (
              <QuickActionTile key={item.label} {...item} />
            ))}
          </div>
        </ResidentMobilePanel>

        <ResidentMobilePanel delay="200ms">
          <div className="mobile-resident-kicker text-[#315d8f]">工单</div>
          <h2 className="mobile-resident-panel-title">工单</h2>

          {editingTicket ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.1rem] bg-[rgba(47,103,112,0.06)] px-3.5 py-3 text-sm text-[#225055]">
                正在编辑：{editingTicket.title}
              </div>
              <ServiceTicketEditor
                editorTitle="编辑工单"
                initialCategory={editingTicket.category}
                initialDescription={editingTicket.description}
                initialTitle={editingTicket.title}
                onCancel={() => setEditingTicketId(null)}
                onSubmit={async (draft) => {
                  setError("");
                  setMessage("");
                  await updateServiceTicket(editingTicket.id, draft);
                  setEditingTicketId(null);
                  setMessage("工单已更新。");
                }}
                submitLabel="保存修改"
                submittingLabel="保存中..."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {serviceTickets.length > 0 ? (
                serviceTickets.map((ticket) => (
                  <ServiceTicketItem
                    key={ticket.id}
                    busy={busyTicketId === ticket.id}
                    onDelete={
                      ticket.isMine
                        ? async () => {
                            if (!window.confirm("确定删除这个工单？")) return;
                            setBusyTicketId(ticket.id);
                            setError("");
                            setMessage("");
                            try {
                              await deleteServiceTicket(ticket.id);
                              setMessage("工单已删除。");
                            } catch (submitError) {
                              setError(submitError instanceof Error ? submitError.message : "删除工单失败");
                            } finally {
                              setBusyTicketId(null);
                            }
                          }
                        : undefined
                    }
                    onEdit={ticket.isMine ? () => setEditingTicketId(ticket.id) : undefined}
                    ticket={ticket}
                  />
                ))
              ) : (
                <EmptyState
                  title="还没有工单"
                  actionHref="/publish?kind=ticket"
                  actionLabel="提交工单"
                />
              )}
            </div>
          )}
        </ResidentMobilePanel>

        <ResidentMobilePanel delay="280ms">
          <div className="mobile-resident-kicker text-[#c97c45]">分类</div>
          <h2 className="mobile-resident-panel-title">分类</h2>

          <div className="mt-4 grid gap-2.5">
              {Object.entries(serviceTicketCategoryMeta).map(([key, meta]) => (
                <div key={key} className="rounded-[1.2rem] bg-white/82 px-4 py-3 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                  <div className="text-sm font-semibold text-slate-900">{meta.label}</div>
                  <div className="mt-1 text-xs leading-5 text-[var(--muted)] line-clamp-2">{meta.description}</div>
                </div>
              ))}
            </div>
          </ResidentMobilePanel>
      </div>

      <div className="hidden md:block">
        <section className="app-gradient-card px-4 py-5 text-white md:px-5 md:py-6">
          <div className="max-w-3xl">
            <div className="section-kicker text-white/68">服务台</div>
            <h1 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.05em] md:text-[2.3rem]">工单与服务入口</h1>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/publish?kind=ticket" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--primary)]">
              提交工单
            </Link>
            <Link href="/me" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white">
              我的主页
            </Link>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-start">
          <section className="app-card px-4 py-4 md:px-5 md:py-5">
            <SectionHeader title="服务入口" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {serviceCatalog.map((item) => (
                <QuickActionTile key={item.label} {...item} />
              ))}
            </div>
          </section>

          <section className="app-card px-4 py-4 md:px-5 md:py-5">
            <SectionHeader title="我的工单" />
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
              <div className="mt-4">
                <Link href="/login?next=/services" className="text-sm font-semibold text-[var(--primary)]">
                  去登录
                </Link>
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)] xl:items-start">
          <section className="app-card px-4 py-4 md:px-5 md:py-5">
            <SectionHeader title="工单" />
            {serviceTickets.length > 0 ? (
              <div className="mt-4 space-y-3">
                {serviceTickets.map((ticket) => (
                  <ServiceTicketItem
                    key={ticket.id}
                    busy={busyTicketId === ticket.id}
                    onDelete={
                      ticket.isMine
                        ? async () => {
                            if (!window.confirm("确定删除这个工单？")) return;
                            setBusyTicketId(ticket.id);
                            setError("");
                            setMessage("");
                            try {
                              await deleteServiceTicket(ticket.id);
                              setMessage("工单已删除。");
                            } catch (submitError) {
                              setError(submitError instanceof Error ? submitError.message : "删除工单失败");
                            } finally {
                              setBusyTicketId(null);
                            }
                          }
                        : undefined
                    }
                    onEdit={ticket.isMine ? () => setEditingTicketId(ticket.id) : undefined}
                    ticket={ticket}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="还没有工单"
                  actionHref="/publish?kind=ticket"
                  actionLabel="提交工单"
                />
              </div>
            )}
          </section>

          <section className="app-card px-4 py-4 md:px-5 md:py-5 xl:sticky xl:top-28">
            <SectionHeader title="分类" />
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
      </div>
    </main>
  );
}

function ServiceTicketItem({
  ticket,
  onEdit,
  onDelete,
  busy = false,
}: {
  ticket: ServiceTicketSummary;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  busy?: boolean;
}) {
  if (!onEdit && !onDelete) {
    return <ServiceTicketCard ticket={ticket} />;
  }

  return (
    <article className="app-card p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-chip app-chip-muted">{serviceTicketCategoryMeta[ticket.category].label}</span>
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[0.72rem] font-semibold text-[var(--primary)]">
              {serviceTicketStatusMeta[ticket.status].label}
            </span>
            {ticket.isMine ? (
              <span className="rounded-full bg-[rgba(47,103,112,0.08)] px-3 py-1 text-[0.72rem] font-semibold text-[#225055]">
                我的工单
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-950">{ticket.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{ticket.description}</p>
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <div>{ticket.isMine ? "我发起的" : ticket.authorName}</div>
          <div className="mt-1">{timeAgo(ticket.updatedAt)}</div>
        </div>
      </div>

      {ticket.assigneeNote ? (
        <div className="mt-3 rounded-[1rem] bg-[var(--surface-muted)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
          处理备注：{ticket.assigneeNote}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {onEdit ? (
          <Button isDisabled={busy} onPress={onEdit} size="sm" variant="secondary">
            编辑
          </Button>
        ) : null}
        {onDelete ? (
          <Button isPending={busy} onPress={onDelete} size="sm" variant="ghost">
            删除
          </Button>
        ) : null}
      </div>
    </article>
  );
}
