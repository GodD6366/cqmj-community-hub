"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Chip, Input, TextArea } from "@heroui/react";
import type { ServiceTicketCategory, ServiceTicketDraft } from "@/lib/types";
import { serviceTicketCategoryMeta } from "@/lib/types";
import { CyberPanel, CyberStatGrid } from "./resident-shared";

const categories = Object.entries(serviceTicketCategoryMeta) as Array<
  [ServiceTicketCategory, (typeof serviceTicketCategoryMeta)[ServiceTicketCategory]]
>;

export function ServiceTicketEditor({
  onSubmit,
  initialCategory = "repair",
  initialTitle = "",
  initialDescription = "",
  editorTitle = "提交工单",
  editorDescription,
  submitLabel = "提交工单",
  submittingLabel = "提交中...",
  onCancel,
}: {
  onSubmit: (draft: ServiceTicketDraft) => void | Promise<void>;
  initialCategory?: ServiceTicketCategory;
  initialTitle?: string;
  initialDescription?: string;
  editorTitle?: string;
  editorDescription?: string;
  submitLabel?: string;
  submittingLabel?: string;
  onCancel?: () => void;
}) {
  const [category, setCategory] = useState<ServiceTicketCategory>(initialCategory);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setDescription(initialDescription);
  }, [initialDescription]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
      <CyberPanel title={editorTitle} kicker="Ticket Editor">
        {editorDescription ? <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{editorDescription}</p> : null}

        <div className="grid gap-4">
          <div className="grid gap-2">
            {categories.map(([value, meta]) => (
              <button
                key={value}
                type="button"
                className={`rounded-[1rem] border px-4 py-3 text-left ${
                  category === value
                    ? "border-[rgba(109,221,175,0.34)] bg-[rgba(109,221,175,0.16)]"
                    : "border-[var(--border)] bg-[var(--surface-secondary)]"
                }`}
                onClick={() => setCategory(value)}
              >
                <div className="text-sm font-semibold text-slate-900">{meta.label}</div>
                <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{meta.description}</div>
              </button>
            ))}
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-900">
            <span>工单标题</span>
            <Input
              aria-label="工单标题"
              fullWidth
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：2 单元门禁失灵"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-900">
            <span>工单说明</span>
            <TextArea
              aria-label="工单说明"
              fullWidth
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={7}
              placeholder="位置、问题、时间、影响范围"
            />
          </label>

          {error ? (
            <Alert status="danger">
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              className="w-full sm:w-auto"
              isPending={submitting}
              onPress={async () => {
                setError("");
                setSubmitting(true);
                try {
                  await onSubmit({ title, description, category });
                  if (!onCancel) {
                    setTitle("");
                    setDescription("");
                    setCategory(initialCategory);
                  }
                } catch (submitError) {
                  setError(submitError instanceof Error ? submitError.message : "提交工单失败");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? submittingLabel : submitLabel}
            </Button>
            {onCancel ? (
              <Button className="w-full sm:w-auto" onPress={onCancel} type="button" variant="secondary">
                取消编辑
              </Button>
            ) : null}
          </div>
        </div>
      </CyberPanel>

      <CyberPanel title="工单摘要" kicker="Preview">
        <CyberStatGrid columns={2} items={[
          { label: "当前分类", value: serviceTicketCategoryMeta[category].label },
          { label: "标题长度", value: title.trim().length },
        ]} />
        <div className="app-card-muted mt-4 rounded-[1rem] p-4">
          <div className="text-sm font-semibold text-slate-900">{title || "工单标题预览"}</div>
          <div className="mt-2 text-xs leading-6 text-[var(--muted)]">{description || "这里显示问题位置、故障现象与诉求说明。"}</div>
          <Chip className="mt-3" size="sm" variant="soft">
            {serviceTicketCategoryMeta[category].label}
          </Chip>
        </div>
      </CyberPanel>
    </div>
  );
}
