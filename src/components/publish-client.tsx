"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PostEditor } from "./post-editor";
import { useCommunityPosts } from "./community-provider";
import { EmptyState, ResidentPageHeader, ResidentPanel } from "./resident-shared";
import { CategoryGlyph } from "./category-glyph";
import { PostCategoryTabs } from "./post-category-tabs";
import { ButtonLink } from "./ui";
import { categoryMeta, isPostCategory, postCategoryTabs, type PostCategory } from "@/lib/types";

export function PublishClient({ initialKind }: { initialKind?: string }) {
  const router = useRouter();
  const { addPost, currentUser } = useCommunityPosts();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedType, setSelectedType] = useState<PostCategory>(isPostCategory(initialKind) ? initialKind : "discussion");

  const loginHref = `/login?next=${encodeURIComponent(`/publish?kind=${selectedType}`)}`;

  return (
    <main className="page-shell">
      <div className="grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-4">
        {/* 左侧选择面板（仅在桌面端显示，移动端隐藏） */}
        <div className="hidden md:block">
          <div className="app-card p-4 md:p-5">
            <div className="section-kicker">Publish Hub</div>
            <h2 className="mt-2 text-[1.1rem] font-semibold text-slate-950">发布中心</h2>
            <div className="mt-4 grid gap-3">
              {postCategoryTabs.map((type) => (
                <button
                  key={type.category}
                  type="button"
                  className={`app-shell-link !p-3 ${selectedType === type.category ? "is-active" : ""}`}
                  onClick={() => setSelectedType(type.category)}
                >
                  <span className="app-shell-link-icon"><CategoryGlyph category={type.category} /></span>
                  <span className="app-shell-link-copy">
                    <span className="app-shell-link-title">{type.title}</span>
                    <span className="app-shell-link-meta">{type.description}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <ButtonLink href="/" size="sm" variant="secondary">
                返回首页
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* 主体部分：包含移动端的类别选择器 + 核心的 PostEditor */}
        <div className="space-y-4">
          {/* 移动端特有的 PageHeader 和类别选择器，仅在移动端显示 */}
          <div className="md:hidden space-y-4">
            <ResidentPageHeader
              backHref="/"
              meta={<span>草稿箱</span>}
              title="发布内容"
            />

            <ResidentPanel
              description="选择合适的类型，让更多邻里看到。"
              kicker="发布类型"
              title={categoryMeta[selectedType].label}
            >
              <PostCategoryTabs
                ariaLabel="选择发布类型"
                onChange={(category) => {
                  if (category) {
                    setSelectedType(category);
                  }
                }}
                value={selectedType}
              />
            </ResidentPanel>
          </div>

          {errorMessage && (
            <div className="mobile-login-error">{errorMessage}</div>
          )}
          {successMessage && (
            <div className="mobile-login-success">{successMessage}</div>
          )}

          {!currentUser ? (
            <EmptyState title="登录后发布内容" actionHref={loginHref} actionLabel="去登录" />
          ) : (
            <PostEditor
              key={`editor-${selectedType}`}
              categoryLocked
              editorTitle={categoryMeta[selectedType].label}
              initialCategory={selectedType}
              onSubmit={async (draft) => {
                setErrorMessage("");
                try {
                  const id = await addPost(draft);
                  setSuccessMessage("内容已发布，正在跳转...");
                  setTimeout(() => router.push(`/posts/${id}`), 500);
                } catch (e) {
                  setErrorMessage(e instanceof Error ? e.message : "发布失败");
                }
              }}
              visibleCategories={[selectedType]}
            />
          )}
        </div>
      </div>
    </main>
  );
}
