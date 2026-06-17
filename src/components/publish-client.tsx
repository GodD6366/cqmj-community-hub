"use client";

import { useRouter } from "next/navigation";
import { useCommunityPosts } from "@/lib/community-store";
import { PostEditor } from "./post/post-editor";
import { isPostCategory, type PostCategory, type PostDraft } from "@/lib/types";
import { PageShell } from "./ui/page-shell";
import { ArrowLeftIcon, ImagePlusIcon, ShieldIcon, PublishIcon } from "./app-icons";

interface PublishClientProps {
  initialKind?: string | null;
}

export function PublishClient({ initialKind }: PublishClientProps) {
  const router = useRouter();
  const { addPost } = useCommunityPosts();

  async function handleSubmit(draft: PostDraft) {
    const id = await addPost(draft);
    router.push(`/posts/${id}`);
  }

  const resolvedCategory: PostCategory = initialKind && isPostCategory(initialKind)
    ? initialKind
    : "request";

  return (
    <PageShell className="px-1.5 pb-28 pt-2.5 md:px-6 md:pb-6 md:pt-6 lg:px-8 lg:pb-8">
      <div className="mx-auto grid max-w-6xl gap-2.5 md:gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* 移动端顶部导航（桌面端由 AppFrame header 提供） */}
        <div className="flex items-center gap-2 px-1 md:hidden">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="返回"
          >
            <ArrowLeftIcon />
          </button>
          <div className="min-w-0 flex-1">
            <div className="map-coordinate">发布站</div>
            <h1 className="app-display mt-1 text-2xl leading-tight">发布内容</h1>
          </div>
          <div className="shrink-0 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] font-bold text-primary-strong">
            自动保存
          </div>
        </div>

        <section className="app-panel-strong overflow-hidden rounded-[1.15rem] md:rounded-[var(--radius-panel)]">
          <div className="hidden border-b border-border/70 bg-white/70 px-3.5 py-3.5 md:block md:px-6 md:py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="map-coordinate">一步发布到社区</div>
                <h2 className="app-display mt-2 text-[1.35rem] leading-tight md:mt-3 md:text-3xl">把需求、闲置或活动说清楚</h2>
              </div>
              <div className="self-start rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary-strong sm:self-auto">
                草稿自动保存
              </div>
            </div>
          </div>
          <div className="px-1.5 pb-5 pt-1.5 md:p-6">
            <PostEditor
              onSubmit={handleSubmit}
              initialCategory={resolvedCategory}
              visibleCategories={["request", "secondhand", "discussion", "play"]}
              compactMobile
            />
          </div>
        </section>

        <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="app-panel p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PublishIcon />
              </div>
              <div>
                <h3 className="font-bold">发布质量</h3>
                <p className="text-xs text-muted-foreground">清晰内容更容易被邻居响应</p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-muted-foreground">标题写具体对象、地点和时间，避免只写“求助”。</p>
              </div>
              <div className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                <p className="text-muted-foreground">正文补充预算、联系方式偏好和可接受时间。</p>
              </div>
              <div className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-warning" />
                <p className="text-muted-foreground">闲置/报修类建议上传图片，减少来回确认。</p>
              </div>
            </div>
          </div>
          <div className="app-panel grid grid-cols-2 gap-3 p-4">
            <div className="rounded-2xl bg-primary/8 p-3">
              <ShieldIcon className="text-primary" />
              <div className="mt-2 text-sm font-bold">可见范围</div>
              <div className="mt-1 text-xs text-muted-foreground">支持全小区、楼栋和私密</div>
            </div>
            <div className="rounded-2xl bg-accent/10 p-3">
              <ImagePlusIcon className="text-accent" />
              <div className="mt-2 text-sm font-bold">多媒体</div>
              <div className="mt-1 text-xs text-muted-foreground">图片与附件自动压缩上传</div>
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
