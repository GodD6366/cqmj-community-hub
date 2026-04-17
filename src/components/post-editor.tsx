"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Chip, Input, TextArea } from "@heroui/react";
import type { PostCategory, PostDraft, VisibilityScope } from "../lib/types";
import { categoryMeta, isPostCategory, visibilityMeta } from "../lib/types";
import { splitTags } from "../lib/utils";
import { SectionCard } from "./ui";

interface PostEditorProps {
  onSubmit: (draft: PostDraft) => void | Promise<void>;
}

const categoryOptions = Object.entries(categoryMeta) as [PostCategory, (typeof categoryMeta)[PostCategory]][];
const visibilityOptions = Object.entries(visibilityMeta) as [VisibilityScope, (typeof visibilityMeta)[VisibilityScope]][];
const STORAGE_KEY = "community-hub-post-draft";
const TITLE_MAX = 60;
const CONTENT_MAX = 1200;

export function PostEditor({ onSubmit }: PostEditorProps) {
  const [category, setCategory] = useState<PostCategory>("request");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("求助, 邻里互助");
  const [visibility, setVisibility] = useState<VisibilityScope>("community");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydratedDraft, setHydratedDraft] = useState(false);

  const parsedTags = useMemo(() => splitTags(tags), [tags]);
  const titleLength = title.trim().length;
  const contentLength = content.trim().length;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydratedDraft(true);
        return;
      }
      const draft = JSON.parse(raw) as Partial<PostDraft> & { title?: string; content?: string; tags?: string[] };
      if (isPostCategory(draft.category)) setCategory(draft.category);
      if (draft.visibility === "community" || draft.visibility === "building" || draft.visibility === "private") setVisibility(draft.visibility);
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.content === "string") setContent(draft.content);
      if (Array.isArray(draft.tags)) setTags(draft.tags.join(", "));
      if (typeof draft.anonymous === "boolean") setAnonymous(draft.anonymous);
    } catch {
      // ignore broken local draft
    } finally {
      setHydratedDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hydratedDraft) return;
    const payload = { category, title, content, tags: parsedTags, visibility, anonymous };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [anonymous, category, content, hydratedDraft, parsedTags, title, visibility]);

  const clearDraft = () => {
    setCategory("request");
    setTitle("");
    setContent("");
    setTags("求助, 邻里互助");
    setVisibility("community");
    setAnonymous(false);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <form
      className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextTitle = title.trim();
        const nextContent = content.trim();
        if (!nextTitle) {
          setError("标题不能为空");
          return;
        }
        if (nextTitle.length > TITLE_MAX) {
          setError(`标题请控制在 ${TITLE_MAX} 字以内`);
          return;
        }
        if (!nextContent) {
          setError("内容不能为空");
          return;
        }
        if (nextContent.length > CONTENT_MAX) {
          setError(`正文请控制在 ${CONTENT_MAX} 字以内`);
          return;
        }
        if (parsedTags.length === 0) {
          setError("请至少填写一个标签");
          return;
        }
        setError("");
        setSubmitting(true);
        try {
          await onSubmit({
            title: nextTitle,
            content: nextContent,
            category,
            tags: parsedTags,
            visibility,
            anonymous,
          });
          clearDraft();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "发布失败");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <SectionCard className="space-y-5 p-4 sm:p-6">
        <Card.Header className="p-0">
          <div>
            <p className="section-kicker">发布内容</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">发一条对邻里有帮助的帖子</h1>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              先选择类型，再填写标题和内容。草稿会自动保存在当前设备，适合手机上随时补充。
            </p>
          </div>
        </Card.Header>

        <Card.Content className="grid gap-3 p-0">
          {categoryOptions.map(([value, meta]) => (
            <Button
              key={value}
              className="h-auto justify-start px-4 py-4 text-left sm:px-5"
              onPress={() => setCategory(value)}
              variant={category === value ? "primary" : "secondary"}
            >
              <span className="flex flex-col items-start">
              <span className="text-base font-semibold">{meta.label}</span>
                <span className={`mt-1 text-sm leading-6 ${category === value ? "text-slate-200" : "text-slate-500"}`}>{meta.description}</span>
              </span>
            </Button>
          ))}
        </Card.Content>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-800">
            <span className="flex items-center justify-between gap-3">
              <span>标题</span>
              <span className={`text-xs ${titleLength > TITLE_MAX ? "text-[var(--danger)]" : "text-slate-400"}`}>{titleLength}/{TITLE_MAX}</span>
            </span>
            <Input
              aria-label="帖子标题"
              fullWidth
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：求助：周末有没有靠谱的空调清洗师傅？"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-800">
            <span>可见范围</span>
            <div className="grid gap-2">
              {visibilityOptions.map(([value, meta]) => (
                <Button
                  key={value}
                  className="justify-start"
                  onPress={() => setVisibility(value as VisibilityScope)}
                  variant={visibility === value ? "primary" : "secondary"}
                >
                  {meta.label}
                </Button>
              ))}
            </div>
            <p className="text-xs leading-5 text-slate-500">{visibilityMeta[visibility].description}</p>
          </label>
        </div>

        <label className="space-y-2 text-sm font-semibold text-slate-800">
          <span className="flex items-center justify-between gap-3">
            <span>内容</span>
            <span className={`text-xs ${contentLength > CONTENT_MAX ? "text-[var(--danger)]" : "text-slate-400"}`}>{contentLength}/{CONTENT_MAX}</span>
          </span>
          <TextArea
            aria-label="帖子内容"
            fullWidth
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            placeholder="补充说明、价格范围、时间要求、交易方式等"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="space-y-2 text-sm font-semibold text-slate-800">
            <span>标签</span>
            <Input
              aria-label="帖子标签"
              fullWidth
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="使用逗号分隔，例如：家政, 周末, 推荐"
            />
          </label>

          <div className="space-y-2">
            <span className="block text-sm font-semibold text-slate-800">身份展示</span>
            <Button className="w-full justify-start" onPress={() => setAnonymous((value) => !value)} variant={anonymous ? "primary" : "secondary"}>
              {anonymous ? "匿名发布已开启" : "使用实名发布"}
            </Button>
          </div>
        </div>

        <div className="info-strip rounded-[1.15rem] p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-900">发帖建议</div>
          <ul className="bullet-list mt-3 leading-6">
            <li>标题先写清楚核心需求，方便邻居一眼判断能否帮忙。</li>
            <li>交易或求助帖尽量写明时间、地点、预算和联系方式偏好。</li>
            <li>敏感内容优先选择更小的可见范围。</li>
          </ul>
        </div>

        {error ? (
          <Alert status="danger">
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap gap-2">
            {parsedTags.map((tag) => (
              <Chip key={tag} size="sm" variant="secondary">
                #{tag}
              </Chip>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button onPress={clearDraft} type="button" variant="secondary">
              清空草稿
            </Button>
            <Button isPending={submitting} type="submit">
              {submitting ? "发布中..." : "立即发布"}
            </Button>
          </div>
        </div>
      </SectionCard>

      <aside className="order-first space-y-4 xl:order-last xl:sticky xl:top-24">
        <SectionCard className="p-5 sm:p-6">
          <Card.Header className="p-0">
            <div>
              <p className="section-kicker">实时预览</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">提交前先看一遍视觉层级和信息是否完整。</p>
            </div>
          </Card.Header>
          <Card.Content className="p-0 pt-4">
            <div className="rounded-[1.15rem] bg-[var(--surface-muted)] p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <Chip color="accent" variant="primary">{categoryMeta[category].badge}</Chip>
                <Chip variant="soft">{visibilityMeta[visibility].label}</Chip>
                {anonymous ? <Chip variant="soft">匿名</Chip> : null}
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{title.trim() || "你的标题会显示在这里"}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {content.trim() || "你的正文预览会显示在这里，便于在手机上发帖时检查排版。"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {parsedTags.length > 0 ? (
                  parsedTags.map((tag) => (
                    <Chip key={tag} size="sm" variant="secondary">
                      #{tag}
                    </Chip>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">尚未填写标签</span>
                )}
              </div>
            </div>
          </Card.Content>
        </SectionCard>
      </aside>
    </form>
  );
}
