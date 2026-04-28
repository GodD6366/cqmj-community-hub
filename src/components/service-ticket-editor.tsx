"use client";

import { useState } from "react";
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
}: {
  onSubmit: (draft: ServiceTicketDraft) => void | Promise<void>;
  initialCategory?: ServiceTicketCategory;
}) {
  const [category, setCategory] = useState<ServiceTicketCategory>(initialCategory);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <SectionCard className="overflow-hidden">
      <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-4">
        <div>
          <p className="section-kicker">报修报事</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">提交一条服务工单</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">工单提交后会进入服务流，并在消息页同步进度更新。</p>
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
          placeholder="例如：6 栋二单元门禁识别异常"
        />

        <TextArea
          aria-label="工单说明"
          fullWidth
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          placeholder="写清楚位置、故障表现、发生时间，方便物业更快处理。"
        />

        {error ? (
          <Alert status="danger">
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button
            isPending={submitting}
            onPress={async () => {
              setError("");
              setSubmitting(true);
              try {
                await onSubmit({ title, description, category });
                setTitle("");
                setDescription("");
                setCategory(initialCategory);
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : "提交工单失败");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "提交中..." : "提交工单"}
          </Button>
        </div>
      </Card.Content>
    </SectionCard>
  );
}
