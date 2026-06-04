"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PostEditor } from "./post-editor";
import { useCommunityPosts } from "./community-provider";
import { EmptyState } from "./resident-shared";
import { CategoryGlyph } from "./category-glyph";
import { PostCategoryTabs } from "./post-category-tabs";
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
      {/* 移动端发布页 */}
      <section className="terminal-mobile-root md:!hidden">
        {/* 顶部标题 */}
        <div className="terminal-hero-card">
          <div className="terminal-page-head">
            <Link href="/" className="terminal-back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="terminal-page-title">发布内容</h1>
            </div>
            <span className="text-sm font-semibold text-[var(--muted)]">草稿箱</span>
          </div>

          {errorMessage && (
            <div className="mobile-login-error">{errorMessage}</div>
          )}
          {successMessage && (
            <div className="mobile-login-success">{successMessage}</div>
          )}

          {/* 发布类型选择 */}
          <div className="publish-type-section">
            <div className="publish-type-header">
              <span className="publish-type-label">选择发布类型</span>
              <span className="publish-type-hint">选择合适的类型，让更多邻里看到</span>
            </div>
            <PostCategoryTabs
              ariaLabel="选择发布类型"
              onChange={(category) => {
                if (category) {
                  setSelectedType(category);
                }
              }}
              value={selectedType}
            />
          </div>
        </div>

        {!currentUser ? (
          <EmptyState title="登录后发布内容" actionHref={loginHref} actionLabel="去登录" />
        ) : (
          <PostEditor
            key={`mobile-${selectedType}`}
            categoryLocked
            editorTitle={categoryMeta[selectedType].label}
            initialCategory={selectedType}
            onSubmit={async (draft) => {
              setErrorMessage("");
              const id = await addPost(draft);
              setSuccessMessage("内容已发布，正在跳转...");
              setTimeout(() => router.push(`/posts/${id}`), 500);
            }}
            visibleCategories={[selectedType]}
          />
        )}
      </section>

      {/* 桌面端布局 */}
      <section className="hidden md:grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid gap-4">
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
          </div>
        </div>
        <div>
          {currentUser ? (
            <PostEditor
              key={`desktop-${selectedType}`}
              categoryLocked
              editorTitle={categoryMeta[selectedType].label}
              initialCategory={selectedType}
              onSubmit={async (draft) => {
                const id = await addPost(draft);
                setSuccessMessage("内容已发布，正在跳转...");
                setTimeout(() => router.push(`/posts/${id}`), 500);
              }}
              visibleCategories={[selectedType]}
            />
          ) : (
            <EmptyState title="登录后发布内容" actionHref={loginHref} actionLabel="去登录" />
          )}
        </div>
      </section>
    </main>
  );
}
