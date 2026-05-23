"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Input, TextArea } from "@heroui/react";
import type { PollDraft } from "@/lib/types";
import { SectionCard } from "./ui";

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
  const [options, setOptions] = useState(initialOptions.length >= 2 ? initialOptions : ["", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    setOptions(initialOptions.length >= 2 ? initialOptions : ["", ""]);
  }, [initialOptions]);

  return (
    <SectionCard className="overflow-hidden">
      <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <p className="section-kicker">投票</p>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{editorTitle}</h1>
          {editorDescription ? <p className="mt-2 text-sm leading-6 text-slate-600">{editorDescription}</p> : null}
        </div>
      </Card.Header>

      <Card.Content className="space-y-4 p-4">
        <Input
          aria-label="投票标题"
          fullWidth
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：周末要不要办旧物交换？"
        />
        <TextArea
          aria-label="投票说明"
          fullWidth
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          placeholder="补充背景"
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
            <div>
              <div className="text-sm font-semibold text-slate-900">投票选项</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">至少 2 项，最多 4 项。</div>
            </div>
            {options.length < MAX_OPTIONS ? (
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onPress={() => setOptions((current) => [...current, ""])}
              >
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
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onPress={() => setOptions((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                >
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

        <div className="flex justify-end">
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
      </Card.Content>
    </SectionCard>
  );
}
