"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { PostEditor } from "./post-editor";
import { useCommunityPosts } from "./community-provider";
import { EmptyState } from "./resident-shared";
import { CategoryGlyph } from "./category-glyph";
import { PostCategoryTabs } from "./post-category-tabs";
import { categoryMeta, isPostCategory, postCategoryTabs, type PostCategory, type PostDraft, type VisibilityScope } from "@/lib/types";

const defaultTagsByType: Record<PostCategory, string[]> = {
  request: ["求助", "邻里互助"],
  secondhand: ["闲置", "转让"],
  discussion: ["社区讨论", "邻里交流"],
  play: ["约玩", "邻里活动"],
};

export function PublishClient({ initialKind }: { initialKind?: string }) {
  const router = useRouter();
  const { addPost, currentUser } = useCommunityPosts();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState<PostCategory>(isPostCategory(initialKind) ? initialKind : "discussion");
  const [visibility, setVisibility] = useState<VisibilityScope>("community");
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loginHref = `/login?next=${encodeURIComponent(`/publish?kind=${selectedType}`)}`;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).slice(0, 9 - images.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setErrorMessage("请先登录");
      return;
    }
    if (!title.trim()) {
      setErrorMessage("请填写标题");
      return;
    }
    if (!content.trim()) {
      setErrorMessage("请填写内容");
      return;
    }

    if (images.length > 0) {
      setErrorMessage("当前移动端入口暂不支持带图发布，请先移除图片后再提交");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const draft: PostDraft = {
        title: title.trim(),
        content: content.trim(),
        category: selectedType,
        tags: defaultTagsByType[selectedType],
        visibility,
        anonymous: false,
        images: [],
      };

      const id = await addPost(draft);
      setSuccessMessage("内容已发布，正在跳转...");
      setTimeout(() => router.push(`/posts/${id}`), 500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发布失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      {/* 移动端发布页 */}
      <section className="terminal-mobile-root md:hidden">
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
          <div className="terminal-panel">
            <div className="publish-form">
              {/* 标题输入 */}
              <div className="publish-field">
                <div className="publish-field-header">
                  <span className="publish-field-label">标题</span>
                  <span className="publish-field-count">{title.length}/30</span>
                </div>
                <input
                  type="text"
                  className="publish-input"
                  placeholder="填写一个吸引人的标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                  maxLength={30}
                />
              </div>

              {/* 内容输入 */}
              <div className="publish-field">
                <div className="publish-field-header">
                  <span className="publish-field-label">内容</span>
                  <span className="publish-field-count">{content.length}/1000</span>
                </div>
                <textarea
                  className="publish-textarea"
                  placeholder="详细描述你的内容..."
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  rows={6}
                />
                <button
                  type="button"
                  className="publish-expand-btn"
                  aria-label="展开内容"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </button>
              </div>

              {/* 图片/视频上传 */}
              <div className="publish-field">
                <div className="publish-field-header">
                  <span className="publish-field-label">图片/视频</span>
                  <span className="publish-field-hint">最多可上传 9 张图片或 1 个视频</span>
                </div>
                <div className="publish-images-grid">
                  <button
                    type="button"
                    className="publish-image-add"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="publish-image-add-icon">+</span>
                    <span className="publish-image-add-text">上传</span>
                  </button>
                  {images.map((image, index) => (
                    <div key={index} className="publish-image-item">
                      <img src={image} alt={`图片 ${index + 1}`} />
                      <button
                        type="button"
                        className="publish-image-remove"
                        onClick={() => removeImage(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 5 - images.length) }).map((_, index) => (
                    <div key={`empty-${index}`} className="publish-image-empty" />
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* 可见范围 */}
              <div className="publish-field">
                <div className="publish-field-header">
                  <span className="publish-field-label">可见范围</span>
                  <span className="publish-field-hint">设置谁可以看到这条内容</span>
                </div>
                <div className="publish-visibility-grid">
                  <button
                    type="button"
                    className={`publish-visibility-option ${visibility === "community" ? "is-active" : ""}`}
                    onClick={() => setVisibility("community")}
                  >
                    <span className="publish-visibility-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    </span>
                    <div className="publish-visibility-text">
                      <span className="publish-visibility-title">全小区可见</span>
                      <span className="publish-visibility-desc">小区所有邻里可见</span>
                    </div>
                    <span className="publish-visibility-indicator" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`publish-visibility-option ${visibility === "building" ? "is-active" : ""}`}
                    onClick={() => setVisibility("building")}
                  >
                    <span className="publish-visibility-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </span>
                    <div className="publish-visibility-text">
                      <span className="publish-visibility-title">同楼栋可见</span>
                      <span className="publish-visibility-desc">仅同楼栋邻里可见</span>
                    </div>
                    <span className="publish-visibility-indicator" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`publish-visibility-option ${visibility === "private" ? "is-active" : ""}`}
                    onClick={() => setVisibility("private")}
                  >
                    <span className="publish-visibility-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <div className="publish-visibility-text">
                      <span className="publish-visibility-title">仅自己可见</span>
                      <span className="publish-visibility-desc">仅自己可见</span>
                    </div>
                    <span className="publish-visibility-indicator" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  </button>
                </div>
              </div>

              {/* 发布按钮 */}
              <button
                type="button"
                className={`publish-submit-btn ${isSubmitting ? "is-loading" : ""}`}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "发布中..." : "发布"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 桌面端布局 */}
      <section className="hidden gap-4 xl:grid-cols-[320px_minmax(0,1fr)] md:grid">
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="m5 12 4.2 4.2L19 7.8" />
    </svg>
  );
}
