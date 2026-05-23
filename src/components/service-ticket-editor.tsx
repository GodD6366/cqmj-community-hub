"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Input, TextArea } from "@heroui/react";
import type { ServiceTicketCategory, ServiceTicketDraft } from "@/lib/types";
import { serviceTicketCategoryMeta } from "@/lib/types";
import { SectionCard } from "./ui";

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
    <SectionCard className="overflow-hidden">
      <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <p className="section-kicker">服务工单</p>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{editorTitle}</h1>
          {editorDescription ? <p className="mt-2 text-sm leading-6 text-slate-600">{editorDescription}</p> : null}
        </div>
      </Card.Header>

      <Card.Content className="space-y-4 p-4">
        <div className="grid gap-2">
          {categories.map(([value, meta]) => (
            <button
              key={value}
              type="button"
              className={`rounded-[1rem] border px-4 py-3 text-left ${
                category === value ? "border-[rgba(79,99,255,0.24)] bg-[rgba(79,99,255,0.08)]" : "border-[var(--separator)] bg-white"
              }`}
              onClick={() => setCategory(value)}
            >
              <div className="text-sm font-semibold text-slate-900">{meta.label}</div>
              <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{meta.description}</div>
            </button>
          ))}
        </div>

        <Input
          aria-label="工单标题"
          fullWidth
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：2 单元门禁失灵"
        />

        <TextArea
          aria-label="工单说明"
          fullWidth
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          placeholder="位置、问题、时间"
        />

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
      </Card.Content>
    </SectionCard>
  );
}
