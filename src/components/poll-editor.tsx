"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Input, TextArea } from "@heroui/react";
import type { PollDraft } from "@/lib/types";
import { CyberPanel, CyberStatGrid } from "./resident-shared";

const MAX_OPTIONS = 4;

export function PollEditor({
  onSubmit,
  initialTitle = "",
  initialDescription = "",
  initialEndsAt = "",
  initialOptions = ["", ""],
  editorTitle = "发起投票",
  editorDescription,
  submitLabel = "发布投票",
  submittingLabel = "提交中...",
  onCancel,
}: {
  onSubmit: (draft: PollDraft) => void | Promise<void>;
  initialTitle?: string;
  initialDescription?: string;
  initialEndsAt?: string;
  initialOptions?: string[];
  editorTitle?: string;
  editorDescription?: string;
  submitLabel?: string;
  submittingLabel?: string;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [endsAt, setEndsAt] = useState(initialEndsAt);
  const normalizedInitialOptions = useMemo(() => initialOptions.length >= 2 ? initialOptions : ["", ""], [initialOptions]);
  const [options, setOptions] = useState(normalizedInitialOptions);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const prevInitialOptionsRef = useRef(initialOptions);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setDescription(initialDescription);
  }, [initialDescription]);

  useEffect(() => {
    setEndsAt(initialEndsAt);
  }, [initialEndsAt]);

  useEffect(() => {
    const prev = prevInitialOptionsRef.current;
    const hasChanged = prev.length !== initialOptions.length || prev.some((item, index) => item !== initialOptions[index]);
    if (hasChanged) {
      prevInitialOptionsRef.current = initialOptions;
      setOptions(normalizedInitialOptions);
    }
  }, [initialOptions, normalizedInitialOptions]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
      <CyberPanel title={editorTitle} kicker="Vote Editor">
        {editorDescription ? <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{editorDescription}</p> : null}

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-900">
            <span>投票标题</span>
            <Input
              aria-label="投票标题"
              fullWidth
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：周末要不要办旧物交换？"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-900">
            <span>投票说明</span>
            <TextArea
              aria-label="投票说明"
              fullWidth
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="补充背景、规则、时间安排"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-900">
            <span>截止时间</span>
            <Input
              aria-label="截止时间"
              fullWidth
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>

          <div className="space-y-3 rounded-[1rem] border border-[var(--border)] bg-[rgba(8,16,16,0.82)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">投票选项</div>
                <div className="mt-1 text-xs leading-5 text-[var(--muted)]">至少 2 项，最多 4 项。</div>
              </div>
              {options.length < MAX_OPTIONS ? (
                <Button size="sm" type="button" variant="secondary" onPress={() => setOptions((current) => [...current, ""])}>
                  加选项
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
                  <Button size="sm" type="button" variant="secondary" onPress={() => setOptions((current) => current.filter((_, currentIndex) => currentIndex !== index))}>
                    移除
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

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              className="w-full sm:w-auto"
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
                  if (!onCancel) {
                    setTitle("");
                    setDescription("");
                    setEndsAt("");
                    setOptions(["", ""]);
                  }
                } catch (submitError) {
                  setError(submitError instanceof Error ? submitError.message : "创建投票失败");
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

      <CyberPanel title="投票摘要" kicker="Preview">
        <CyberStatGrid columns={2} items={[
          { label: "选项数量", value: options.filter((item) => item.trim()).length },
          { label: "是否定时", value: endsAt ? "是" : "否" },
        ]} />
        <div className="mt-4 rounded-[1rem] border border-[var(--border)] bg-[rgba(8,16,16,0.82)] p-4">
          <div className="text-sm font-semibold text-slate-900">{title || "投票标题预览"}</div>
          <div className="mt-2 text-xs leading-6 text-[var(--muted)]">{description || "这里显示投票背景与说明。"}</div>
          <div className="mt-3 grid gap-2">
            {options.map((option, index) => (
              <div key={`${option}-${index}`} className="rounded-[0.9rem] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]">
                {option || `选项 ${index + 1}`}
              </div>
            ))}
          </div>
        </div>
      </CyberPanel>
    </div>
  );
}
