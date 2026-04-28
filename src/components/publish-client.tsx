"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@heroui/react";
import { PollEditor } from "./poll-editor";
import { PostEditor } from "./post-editor";
import { ServiceTicketEditor } from "./service-ticket-editor";
import { useCommunityPosts } from "./community-provider";
import type { PostCategory, ServiceTicketCategory } from "@/lib/types";
import { categoryMeta } from "@/lib/types";

const publishEntries = [
  {
    kind: "request",
    title: "发需求",
    description: "发布生活需求，邻里互助",
    gradient: "linear-gradient(135deg,#6db4ff,#4f63ff)",
    icon: "需",
  },
  {
    kind: "secondhand",
    title: "发闲置",
    description: "闲置物品转让，低碳环保",
    gradient: "linear-gradient(135deg,#57dfc3,#31b9a1)",
    icon: "闲",
  },
  {
    kind: "discussion",
    title: "发帖子",
    description: "分享生活、交流经验",
    gradient: "linear-gradient(135deg,#8f81ff,#7a6df8)",
    icon: "帖",
  },
  {
    kind: "ticket",
    title: "报修报事",
    description: "报修投诉，快速响应",
    gradient: "linear-gradient(135deg,#ffbb72,#ff8d5a)",
    icon: "修",
  },
  {
    kind: "poll",
    title: "发投票",
    description: "收集意见，发起投票",
    gradient: "linear-gradient(135deg,#73b5ff,#63d3ff)",
    icon: "票",
  },
] as const;

type PublishKind = (typeof publishEntries)[number]["kind"];

function isPublishKind(value: string | undefined): value is PublishKind {
  return publishEntries.some((entry) => entry.kind === value);
}

function isServiceTicketCategory(value: string | undefined): value is ServiceTicketCategory {
  return value === "repair" || value === "complaint" || value === "cleaning" || value === "facility" || value === "other";
}

export function PublishClient({
  initialKind,
  initialTicketCategory,
}: {
  initialKind?: string;
  initialTicketCategory?: string;
}) {
  const router = useRouter();
  const { addPoll, addPost, addServiceTicket, currentUser } = useCommunityPosts();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const activeKind = isPublishKind(initialKind) ? initialKind : null;
  const ticketCategory = isServiceTicketCategory(initialTicketCategory) ? initialTicketCategory : "repair";

  const handleSuccess = (message: string, href: string) => {
    setErrorMessage("");
    setSuccessMessage(message);
    window.setTimeout(() => router.push(href), 500);
  };

  const renderForm = () => {
    if (!activeKind) return null;

    if (activeKind === "ticket") {
      return (
        <ServiceTicketEditor
          initialCategory={ticketCategory}
          onSubmit={async (draft) => {
            const id = await addServiceTicket(draft);
            handleSuccess("工单已提交，正在跳转到服务页查看进度...", `/services?ticket=${id}`);
          }}
        />
      );
    }

    if (activeKind === "poll") {
      return (
        <PollEditor
          onSubmit={async (draft) => {
            await addPoll(draft);
            handleSuccess("投票已发布，正在跳转到邻里页...", "/neighbors");
          }}
        />
      );
    }

    if (activeKind === "discussion") {
      return (
        <PostEditor
          categoryLocked={false}
          editorDescription="帖子发布支持交流与约玩两种类型切换，也可以继续上传多张图片。"
          editorTitle="发帖子或发起约玩"
          initialCategory="discussion"
          onSubmit={async (draft) => {
            const id = await addPost(draft);
            handleSuccess("内容发布成功，正在跳转到帖子详情页...", `/posts/${id}`);
          }}
          visibleCategories={["discussion", "play"]}
        />
      );
    }

    const postCategory = activeKind as PostCategory;

    return (
      <PostEditor
        categoryLocked
        editorDescription={`当前将以「${categoryMeta[postCategory].label}」类型发布，支持图片和标签。`}
        editorTitle={categoryMeta[postCategory].label}
        initialCategory={postCategory}
        onSubmit={async (draft) => {
          const id = await addPost(draft);
          handleSuccess("内容发布成功，正在跳转到帖子详情页...", `/posts/${id}`);
        }}
        visibleCategories={[postCategory]}
      />
    );
  };

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <section className="px-1 md:px-0">
        <div className="text-sm font-semibold text-[var(--muted)]">发布中心</div>
        <h1 className="mt-1 text-[1.65rem] font-semibold tracking-[-0.05em] text-slate-950 md:text-[2.2rem]">
          {activeKind ? "选择好的内容，就让它开始流动" : "你要发布什么？"}
        </h1>
      </section>

      {!currentUser ? (
        <Alert status="warning">
          <Alert.Content>
            <Alert.Description>
              你还没有登录。要先{" "}
              <Link href="/login?next=/publish" className="font-semibold text-[var(--primary)] underline underline-offset-4">
                登录或注册
              </Link>
              ，才能发帖、发起投票或提交工单。
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert status="success">
          <Alert.Content>
            <Alert.Description>{successMessage}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{errorMessage}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {!activeKind ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {publishEntries.map((entry) => (
            <Link key={entry.kind} href={`/publish?kind=${entry.kind}`} className="app-card flex items-center gap-3 px-4 py-4">
              <span className="app-icon-bubble shrink-0" style={{ background: entry.gradient }}>
                <span className="text-sm font-bold">{entry.icon}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-slate-950">{entry.title}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">{entry.description}</div>
              </div>
              <span className="text-lg text-[var(--muted)]">›</span>
            </Link>
          ))}
        </section>
      ) : currentUser ? (
        <section className="space-y-3 xl:max-w-5xl">
          <Link href="/publish" className="inline-flex px-1 text-sm font-semibold text-[var(--primary)]">
            ← 返回发布类型
          </Link>
          {renderForm()}
        </section>
      ) : (
        <div className="paper-panel rounded-[1.35rem] border border-dashed p-8 text-center text-sm leading-7 text-slate-600">
          登录后即可发布需求、闲置、帖子、投票和服务工单。
        </div>
      )}
    </main>
  );
}
