"use client";

import { useMemo, useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { useCommunityPosts } from "@/lib/community-store";
import { EmptyState } from "./ui/empty-state";
import { Toast, useToast } from "./ui/toast";
import { timeAgo } from "@/lib/utils";
import type { ServiceTicketCategory, ServiceTicketDraft, ServiceTicketStatus } from "@/lib/types";

const categoryLabels: Record<ServiceTicketCategory, string> = {
  repair: "报修",
  complaint: "投诉",
  cleaning: "保洁",
  facility: "设施",
  other: "其他",
};

const statusLabels: Record<ServiceTicketStatus, string> = {
  open: "待处理",
  processing: "处理中",
  resolved: "已完成",
};

export function ServicesClient() {
  const { serviceTickets, addServiceTicket, updateServiceTicket, deleteServiceTicket, currentUser } = useCommunityPosts();
  const { toast, show } = useToast();
  const [filterCategory, setFilterCategory] = useState<ServiceTicketCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<ServiceTicketCategory>("repair");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (filterCategory === "all") return serviceTickets;
    return serviceTickets.filter((t) => t.category === filterCategory);
  }, [serviceTickets, filterCategory]);

  async function handleSave() {
    if (!formTitle.trim()) { show("请输入工单标题", "error"); return; }
    setBusy(true);
    try {
      const draft: ServiceTicketDraft = { category: formCategory, title: formTitle.trim(), description: formDesc.trim() };
      if (editingTicketId) await updateServiceTicket(editingTicketId, draft);
      else await addServiceTicket(draft);
      resetForm();
      show("工单已提交。", "success");
    } catch (e) { show(e instanceof Error ? e.message : "提交失败", "error"); }
    finally { setBusy(false); }
  }

  function resetForm() {
    setShowForm(false); setEditingTicketId(null);
    setFormCategory("repair"); setFormTitle(""); setFormDesc("");
  }

  async function handleDelete(ticketId: string) {
    if (!window.confirm("确定删除这个工单？")) return;
    setBusy(true);
    try { await deleteServiceTicket(ticketId); show("工单已删除。", "success"); }
    catch (e) { show(e instanceof Error ? e.message : "删除失败", "error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 px-4 pb-28 pt-5 md:space-y-5 md:p-6">
      <Toast toast={toast} />
      <div className="app-panel-strong flex flex-col gap-4 p-4 md:p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="map-coordinate">物业事务站</div>
          <h1 className="app-display mt-2 text-[1.85rem] leading-tight md:mt-3 md:text-4xl">服务工单台</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:leading-7">登记、跟进和关闭社区服务请求，让每件事都有处理轨迹。</p>
        </div>
        {currentUser && (
          <Button className="min-h-11 bg-primary px-5 font-bold text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary-strong" size="sm" onPress={() => setShowForm(!showForm)}>
            {showForm ? "取消" : "创建工单"}
          </Button>
        )}
      </div>

      {/* 创建/编辑表单 */}
      {showForm && (
        <Card className="app-panel space-y-3 p-3.5 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">{editingTicketId ? "编辑工单" : "创建工单"}</h2>
              <p className="text-xs text-muted-foreground">写清地点、现象和期望处理时间。</p>
            </div>
            <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-bold text-primary">物业</span>
          </div>
          <select className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" value={formCategory} onChange={(e) => setFormCategory(e.target.value as ServiceTicketCategory)}>
            {(Object.entries(categoryLabels) as [ServiceTicketCategory, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="工单标题" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
          <textarea className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" rows={3} placeholder="工单描述" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
          <Button className="min-h-11 w-full font-bold" variant="primary" size="sm" isPending={busy} onPress={() => { void handleSave(); }}>
            {editingTicketId ? "更新工单" : "提交工单"}
          </Button>
        </Card>
      )}

      {/* 分类筛选 */}
      <div className="app-panel mobile-scroll-rail flex gap-2 overflow-x-auto p-3 [-webkit-overflow-scrolling:touch] md:flex-wrap">
        <button
          type="button"
          className={`app-chip app-chip-compact shrink-0 ${filterCategory === "all" ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/15" : "border-default-200 text-muted-foreground"}`}
          onClick={() => setFilterCategory("all")}
        >
          全部
        </button>
        {(Object.entries(categoryLabels) as [ServiceTicketCategory, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`app-chip app-chip-compact shrink-0 ${filterCategory === key ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/15" : "border-default-200 text-muted-foreground"}`}
            onClick={() => setFilterCategory(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 工单列表 */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <Card key={ticket.id} className="app-panel p-4">
              <div className="flex items-center justify-between">
                <Chip size="sm" variant="soft" color={ticket.status === "open" ? "warning" : ticket.status === "processing" ? "accent" : "success"}>
                  {statusLabels[ticket.status]}
                </Chip>
                <div className="flex items-center gap-2">
                  <Chip size="sm" variant="soft">{categoryLabels[ticket.category]}</Chip>
                  {ticket.isMine && (
                    <div className="flex gap-1">
                      <Button className="min-h-11" size="sm" variant="ghost" onPress={() => {
                        setFormCategory(ticket.category); setFormTitle(ticket.title);
                        setFormDesc(ticket.description); setEditingTicketId(ticket.id); setShowForm(true);
                      }}>编辑</Button>
                      <Button className="min-h-11" size="sm" variant="ghost" onPress={() => { void handleDelete(ticket.id); }}>删除</Button>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="mt-2 font-semibold">{ticket.title}</h3>
              {ticket.description && <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>}
              {ticket.assigneeNote && <p className="mt-2 rounded-lg bg-warning/10 px-3 py-1.5 text-xs text-warning">{ticket.assigneeNote}</p>}
              <div className="mt-2 text-xs text-muted-foreground">
                {ticket.authorName} · {ticket.roomNumber} · {timeAgo(ticket.createdAt)}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无工单" description={filterCategory !== "all" ? `没有${categoryLabels[filterCategory]}类型的工单` : "还没有提交任何工单"} />
      )}
    </div>
  );
}
