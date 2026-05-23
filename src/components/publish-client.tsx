"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@heroui/react";
import { PollEditor } from "./poll-editor";
import { PostEditor } from "./post-editor";
import { ServiceTicketEditor } from "./service-ticket-editor";
import { useCommunityPosts } from "./community-provider";
import { ResidentMetricGrid, ResidentMobileHero, ResidentMobilePanel } from "./resident-shared";
import type { PostCategory, ServiceTicketCategory } from "@/lib/types";
import { categoryMeta } from "@/lib/types";

const publishEntries = [
  {
    kind: "request",
    title: "发需求",
    gradient: "linear-gradient(135deg,#6db4ff,#4f63ff)",
    icon: "需",
  },
  {
    kind: "secondhand",
    title: "发闲置",
    gradient: "linear-gradient(135deg,#57dfc3,#31b9a1)",
    icon: "闲",
  },
  {
    kind: "discussion",
    title: "发帖子",
    gradient: "linear-gradient(135deg,#8f81ff,#7a6df8)",
    icon: "帖",
  },
  {
    kind: "play",
    title: "发约玩",
    gradient: "linear-gradient(135deg,#ffbb72,#ff9158)",
    icon: "约",
  },
  {
    kind: "ticket",
    title: "报修报事",
    gradient: "linear-gradient(135deg,#ffbb72,#ff8d5a)",
    icon: "修",
  },
  {
    kind: "poll",
    title: "发投票",
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
  const activeEntry = activeKind ? publishEntries.find((entry) => entry.kind === activeKind) ?? null : null;
  const ticketCategory = isServiceTicketCategory(initialTicketCategory) ? initialTicketCategory : "repair";
  const publishTarget = activeKind
    ? activeKind === "ticket"
      ? `/publish?kind=ticket&category=${ticketCategory}`
      : `/publish?kind=${activeKind}`
    : "/publish";
  const loginHref = `/login?next=${encodeURIComponent(publishTarget)}`;

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
            handleSuccess("工单已提交，正在跳转。", `/services?ticket=${id}`);
          }}
        />
      );
    }

    if (activeKind === "poll") {
      return (
        <PollEditor
          onSubmit={async (draft) => {
            await addPoll(draft);
            handleSuccess("投票已发布，正在跳转。", "/neighbors");
          }}
        />
      );
    }

    if (activeKind === "discussion" || activeKind === "play") {
      return (
        <PostEditor
          categoryLocked={activeKind === "play"}
          editorTitle={activeKind === "play" ? "发起约玩" : "发帖子"}
          initialCategory={activeKind === "play" ? "play" : "discussion"}
          onSubmit={async (draft) => {
            const id = await addPost(draft);
            handleSuccess("内容已发布，正在跳转。", `/posts/${id}`);
          }}
          visibleCategories={activeKind === "play" ? ["play"] : ["discussion", "play"]}
        />
      );
    }

    const postCategory = activeKind as PostCategory;

    return (
      <PostEditor
        categoryLocked
        editorTitle={categoryMeta[postCategory].label}
        initialCategory={postCategory}
        onSubmit={async (draft) => {
          const id = await addPost(draft);
          handleSuccess("内容已发布，正在跳转。", `/posts/${id}`);
        }}
        visibleCategories={[postCategory]}
      />
    );
  };

  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      {!currentUser ? (
        <div className="hidden md:block">
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>
                <Link href={loginHref} className="font-semibold text-[var(--primary)] underline underline-offset-4">
                  登录后发布
                </Link>
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
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

      <div className="mobile-resident-only mobile-resident-stack">
        <ResidentMobileHero
          background="radial-gradient(circle at 16% 18%, rgba(237,170,92,0.28), transparent 24%), radial-gradient(circle at 84% 12%, rgba(122,214,255,0.22), transparent 22%), linear-gradient(160deg, #141c33 0%, #273556 46%, #41548a 100%)"
        >
          <div className="mobile-resident-kicker text-white/72">发布中心</div>
          <h1 className="mobile-resident-title mt-5 max-w-[8ch]">
            {activeEntry ? activeEntry.title : "发布内容"}
          </h1>

          {activeEntry ? (
            <div className="mt-5 rounded-[1.2rem] bg-white/8 px-3.5 py-3 text-sm font-semibold text-white ring-1 ring-white/10 backdrop-blur-sm">
              {activeEntry.title}
            </div>
          ) : (
            <ResidentMetricGrid
              className="mt-5"
              columns={3}
              items={[
                { label: "类型", value: String(publishEntries.length).padStart(2, "0") },
                { label: "状态", value: "待选" },
                { label: "登录", value: currentUser ? "已登录" : "未登录" },
              ]}
              tone="inverse"
            />
          )}
        </ResidentMobileHero>

        {!activeKind ? (
          <ResidentMobilePanel delay="120ms">
            {!currentUser ? (
              <div className="mb-4">
                <Link href={loginHref} className="text-sm font-semibold text-[var(--primary)]">
                  去登录
                </Link>
              </div>
            ) : null}
            <div className="mobile-resident-kicker text-[#315d8f]">类型</div>
            <h2 className="mobile-resident-panel-title">选择类型</h2>

            <div className="mt-4 grid gap-2.5">
              {publishEntries.map((entry) => (
                <Link
                  key={entry.kind}
                  href={`/publish?kind=${entry.kind}`}
                  className="flex items-center gap-3 rounded-[1.28rem] border border-[rgba(95,116,176,0.08)] bg-white/82 px-4 py-3 shadow-[0_14px_28px_rgba(58,75,124,0.06)]"
                >
                  <span className="app-icon-bubble shrink-0" style={{ background: entry.gradient }}>
                    <span className="text-sm font-bold">{entry.icon}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold text-slate-950">{entry.title}</div>
                  </div>
                  <span className="text-lg text-[var(--muted)]">›</span>
                </Link>
              ))}
            </div>
          </ResidentMobilePanel>
        ) : currentUser ? (
          <>
            <ResidentMobilePanel className="px-4 py-3" delay="120ms">
              <Link href="/publish" className="inline-flex text-sm font-semibold text-[var(--primary)]">
                ← 返回发布类型
              </Link>
            </ResidentMobilePanel>
            <div className="mobile-resident-enter" style={{ animationDelay: "200ms" }}>
              {renderForm()}
            </div>
          </>
        ) : (
          <ResidentMobilePanel delay="120ms">
            <div className="paper-panel rounded-[1.35rem] border border-dashed px-6 py-8 text-center text-sm leading-7 text-slate-600">
              <Link href={loginHref} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white">
                去登录
              </Link>
            </div>
          </ResidentMobilePanel>
        )}
      </div>

      <div className="hidden md:block">
        <section className="px-1 md:px-0">
          <div className="text-sm font-semibold text-[var(--muted)]">发布中心</div>
          <h1 className="mt-1 text-[1.65rem] font-semibold tracking-[-0.05em] text-slate-950 md:text-[2.2rem]">
            {activeKind ? "发布内容" : "你要发布什么？"}
          </h1>
        </section>

        {!activeKind ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {publishEntries.map((entry) => (
              <Link key={entry.kind} href={`/publish?kind=${entry.kind}`} className="app-card flex items-center gap-3 px-4 py-4">
                <span className="app-icon-bubble shrink-0" style={{ background: entry.gradient }}>
                  <span className="text-sm font-bold">{entry.icon}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-slate-950">{entry.title}</div>
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
          <div className="paper-panel rounded-[1.35rem] border border-dashed px-8 py-8 text-center text-sm leading-7 text-slate-600">
            <Link
              href={loginHref}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white"
            >
              去登录
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
