"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Button } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { ServiceTicketEditor } from "./service-ticket-editor";
import { serviceTicketCategoryMeta, type ServiceTicketSummary } from "@/lib/types";
import { CyberPanel, CyberStatGrid, DataList, EmptyState, QuickActionTile } from "./resident-shared";

const serviceCatalog = [
  { label: "物业报修", icon: "修", href: "/publish?kind=ticket&category=repair", gradient: "linear-gradient(135deg,#39f58f,#7affc6)", description: "设备 / 水电 / 门禁" },
  { label: "投诉建议", icon: "议", href: "/publish?kind=ticket&category=complaint", gradient: "linear-gradient(135deg,#48c9ff,#7ddeff)", description: "物业服务 / 秩序" },
  { label: "设施问题", icon: "设", href: "/publish?kind=ticket&category=facility", gradient: "linear-gradient(135deg,#ffb74d,#ffd37a)", description: "电梯 / 停车 / 照明" },
  { label: "发帖子", icon: "帖", href: "/publish?kind=discussion", gradient: "linear-gradient(135deg,#a98bff,#d0c3ff)", description: "同步社区讨论" },
] as const;

export function ServicesClient() {
  const { serviceTickets, currentUser, updateServiceTicket, deleteServiceTicket } = useCommunityPosts();
  const myTickets = useMemo(() => serviceTickets.filter((ticket) => ticket.isMine), [serviceTickets]);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editingTicket = useMemo(() => myTickets.find((ticket) => ticket.id === editingTicketId) ?? null, [editingTicketId, myTickets]);

  return (
    <main className="page-shell space-y-4 md:space-y-5">
      {message ? <Alert status="success"><Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content></Alert> : null}
      {error ? <Alert status="danger"><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <CyberPanel title="工单服务" kicker="Work-order Management" action={<Link href="/publish?kind=ticket" className="app-section-link">提交工单</Link>}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {serviceCatalog.map((item) => <QuickActionTile key={item.label} {...item} />)}
          </div>

          <div className="mt-4">
            {editingTicket ? (
              <ServiceTicketEditor
                editorTitle="编辑工单"
                initialCategory={editingTicket.category}
                initialDescription={editingTicket.description}
                initialTitle={editingTicket.title}
                onCancel={() => setEditingTicketId(null)}
                onSubmit={async (draft) => { setError(""); setMessage(""); await updateServiceTicket(editingTicket.id, draft); setEditingTicketId(null); setMessage("工单已更新。"); }}
                submitLabel="保存修改"
                submittingLabel="保存中..."
              />
            ) : serviceTickets.length > 0 ? (
              <div className="grid gap-3">
                {serviceTickets.map((ticket) => <ServiceTicketItem key={ticket.id} busy={busyTicketId === ticket.id} onDelete={ticket.isMine ? async () => { if (!window.confirm("确定删除这个工单？")) return; setBusyTicketId(ticket.id); setError(""); setMessage(""); try { await deleteServiceTicket(ticket.id); setMessage("工单已删除。"); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "删除工单失败"); } finally { setBusyTicketId(null); } } : undefined} onEdit={ticket.isMine ? () => setEditingTicketId(ticket.id) : undefined} ticket={ticket} />)}
              </div>
            ) : <EmptyState title="还没有工单" actionHref="/publish?kind=ticket" actionLabel="提交工单" />}
          </div>
        </CyberPanel>

        <div className="grid gap-4">
          <CyberPanel title="工单概况" kicker="Service Summary">
            <CyberStatGrid columns={3} items={[
              { label: '我的工单', value: myTickets.length },
              { label: '处理中', value: myTickets.filter((ticket) => ticket.status !== 'resolved').length },
              { label: '全部', value: serviceTickets.length },
            ]} />
          </CyberPanel>
          <CyberPanel title="工单分类" kicker="Categories">
            <DataList items={Object.entries(serviceTicketCategoryMeta).map(([key, meta]) => ({ label: meta.label, hint: meta.description, value: serviceTickets.filter((item) => item.category === key).length }))} />
          </CyberPanel>
          <CyberPanel title="账户信息" kicker="User State">
            <DataList items={[
              { label: currentUser ? currentUser.nickname : '访客', hint: currentUser ? currentUser.roomNumber : '登录后可创建工单', value: currentUser ? '在线' : 'Guest' },
              { label: '最近工单', hint: serviceTickets[0]?.title ?? '暂无记录', value: serviceTickets[0] ? statusLabel(serviceTickets[0].status) : '--' },
            ]} />
          </CyberPanel>
        </div>
      </section>
    </main>
  );
}

function ServiceTicketItem({ ticket, onEdit, onDelete, busy }: { ticket: ServiceTicketSummary; onEdit?: () => void; onDelete?: () => void; busy?: boolean; }) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--border)] bg-[rgba(8,16,16,0.92)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--primary)]">#{ticket.id}</div>
          <div className="mt-1 text-base font-semibold text-slate-950">{ticket.title}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">{ticket.roomNumber} · {ticket.authorName}</div>
        </div>
        <div className="app-chip">{statusLabel(ticket.status)}</div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{ticket.description}</p>
      {ticket.assigneeNote ? <div className="mt-3 rounded-[1rem] bg-[rgba(57,245,143,0.06)] px-3 py-2 text-xs text-[var(--muted)]">处理备注：{ticket.assigneeNote}</div> : null}
      {(onEdit || onDelete) ? <div className="mt-4 flex gap-2">{onEdit ? <Button size="sm" variant="secondary" onPress={onEdit}>编辑</Button> : null}{onDelete ? <Button size="sm" variant="secondary" isPending={busy} onPress={onDelete}>删除</Button> : null}</div> : null}
    </div>
  );
}

function statusLabel(status: string) {
  if (status === 'open') return '待处理';
  if (status === 'processing') return '处理中';
  return '已完成';
}
