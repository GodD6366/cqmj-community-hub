"use client";

import { useState } from "react";
import { Alert, Button, Card, Input, TextArea } from "@heroui/react";
import type { PollDraft } from "@/lib/types";
import { SectionCard } from "./ui";

const MAX_OPTIONS = 4;

export function PollEditor({
  onSubmit,
}: {
  onSubmit: (draft: PollDraft) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <SectionCard className="overflow-hidden">
      <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-4">
        <div>
          <p className="section-kicker">发起投票</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">向邻里征集意见</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">适合收集公共决策偏好、活动时间、服务反馈等轻量意见。</p>
        </div>
      </Card.Header>

      <Card.Content className="space-y-4 p-4">
        <Input
          aria-label="投票标题"
          fullWidth
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：小区绿化优先改造哪一块？"
        />
        <TextArea
          aria-label="投票说明"
          fullWidth
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          placeholder="补充背景、时间安排、需要大家一起决策的原因"
        />
        <Input
          aria-label="截止时间"
          fullWidth
          type="datetime-local"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">投票选项</div>
            {options.length < MAX_OPTIONS ? (
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onPress={() => setOptions((current) => [...current, ""])}
              >
                增加选项
              </Button>
            ) : null}
          </div>

          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={`投票选项 ${index + 1}`}
                fullWidth
                value={option}
                onChange={(event) =>
                  setOptions((current) => current.map((item, currentIndex) => (currentIndex === index ? event.target.value : item)))
                }
                placeholder={`选项 ${index + 1}`}
              />
              {options.length > 2 ? (
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onPress={() => setOptions((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                >
                  删除
                </Button>
              ) : null}
            </div>
          ))}
        </div>

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
                await onSubmit({
                  title,
                  description,
                  options,
                  endsAt: endsAt ? new Date(endsAt).toISOString() : null,
                });
                setTitle("");
                setDescription("");
                setEndsAt("");
                setOptions(["", ""]);
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : "创建投票失败");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "提交中..." : "发布投票"}
          </Button>
        </div>
      </Card.Content>
    </SectionCard>
  );
}
