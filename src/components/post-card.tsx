import Link from "next/link";
import { Chip } from "@heroui/react";
import { formatDateTime, getPostBadge, timeAgo } from "../lib/utils";
import type { CommunityPost } from "../lib/types";
import { ResidentAvatar } from "./resident-shared";

interface PostCardProps {
  post: CommunityPost;
  compact?: boolean;
}

export function PostCard({ post, compact = false }: PostCardProps) {
  const mobileVisibleImages = post.images.slice(0, compact ? 0 : 3);
  const mobilePreviewImage = compact ? post.images[0] ?? null : null;
  const mobileVisibleTags = post.tags.slice(0, compact ? 2 : 4);
  const desktopPreviewImage = post.images[0] ?? null;
  const desktopImageCount = Math.max(post.images.length - 1, 0);
  const desktopVisibleTags = post.tags.slice(0, compact ? 2 : 3);

  if (compact) {
    return (
      <Link href={`/posts/${post.id}`} className="app-card block p-4 transition hover:-translate-y-[1px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ResidentAvatar name={post.authorName} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{post.authorName}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.72rem] text-[var(--muted)]">
                <span>{timeAgo(post.createdAt)}</span>
                <span>{formatDateTime(post.createdAt)}</span>
              </div>
            </div>
          </div>

          <Chip color="accent" size="sm" variant="soft">
            {getPostBadge(post.category)}
          </Chip>
        </div>

        <div className={mobilePreviewImage ? "mt-3 flex items-start gap-3" : "mt-3"}>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold tracking-tight text-slate-950">{post.title}</div>
            <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {post.content}
            </p>
          </div>
          {mobilePreviewImage ? (
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[1rem] bg-[var(--surface-muted)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured URLs are loaded from the existing object storage service. */}
              <img alt={post.title} className="h-full w-full object-cover" src={mobilePreviewImage.url} />
            </div>
          ) : null}
        </div>

        {mobileVisibleTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {mobileVisibleTags.map((tag) => (
              <span key={tag} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[0.72rem] font-semibold text-[var(--primary)]">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 text-[0.8rem] text-[var(--muted)]">
          <div className="flex items-center gap-3">
            <span>评论 {post.commentCount}</span>
            <span>收藏 {post.favoriteCount}</span>
          </div>
          <span>{post.visibility === "community" ? "全小区可见" : post.visibility === "building" ? "楼栋可见" : "私密可见"}</span>
        </div>
      </Link>
    );
  }

  return (
    <>
      <Link href={`/posts/${post.id}`} className="app-card block p-4 transition hover:-translate-y-[1px] md:!hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ResidentAvatar name={post.authorName} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{post.authorName}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.72rem] text-[var(--muted)]">
                <span>{timeAgo(post.createdAt)}</span>
                <span>{formatDateTime(post.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-1.5">
            <Chip color="accent" size="sm" variant="soft">
              {getPostBadge(post.category)}
            </Chip>
            {post.pinned ? (
              <Chip color="danger" size="sm" variant="soft">
                置顶
              </Chip>
            ) : null}
            {post.featured ? (
              <Chip color="warning" size="sm" variant="soft">
                精选
              </Chip>
            ) : null}
          </div>
        </div>

        <div className={compact && mobilePreviewImage ? "mt-3 flex items-start gap-3" : "mt-3"}>
          <div className="min-w-0 flex-1">
            <div className={`font-semibold tracking-tight text-slate-950 ${compact ? "text-base" : "text-[1.12rem]"}`}>{post.title}</div>
            <p className={`mt-2 whitespace-pre-wrap text-slate-600 ${compact ? "line-clamp-2 text-sm leading-6" : "line-clamp-3 text-[0.95rem] leading-7"}`}>
              {post.content}
            </p>
          </div>
          {mobilePreviewImage ? (
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[1rem] bg-[var(--surface-muted)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured URLs are loaded from the existing object storage service. */}
              <img alt={post.title} className="h-full w-full object-cover" src={mobilePreviewImage.url} />
            </div>
          ) : null}
        </div>

        {mobileVisibleImages.length > 0 ? (
          <div className={`mt-3 grid gap-2 ${mobileVisibleImages.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
            {mobileVisibleImages.map((image) => (
              <div
                key={image.id}
                className={`overflow-hidden rounded-[1.15rem] bg-[var(--surface-muted)] ${mobileVisibleImages.length === 1 ? "aspect-[16/10]" : "aspect-square"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured URLs are loaded from the existing object storage service. */}
                <img alt={post.title} className="h-full w-full object-cover" src={image.url} />
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {mobileVisibleTags.map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[0.72rem] font-semibold text-[var(--primary)]">
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[0.8rem] text-[var(--muted)]">
          <div className="flex items-center gap-3">
            <span>评论 {post.commentCount}</span>
            <span>收藏 {post.favoriteCount}</span>
          </div>
          <span>{post.visibility === "community" ? "全小区可见" : post.visibility === "building" ? "楼栋可见" : "私密可见"}</span>
        </div>
      </Link>

      <Link href={`/posts/${post.id}`} className="app-card !hidden transition hover:-translate-y-[1px] md:!block md:px-4 md:py-3">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ResidentAvatar name={post.authorName} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{post.authorName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.72rem] text-[var(--muted)]">
                    <span>{timeAgo(post.createdAt)}</span>
                    <span>{formatDateTime(post.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex max-w-[38%] flex-wrap justify-end gap-1.5">
                <Chip color="accent" size="sm" variant="soft">
                  {getPostBadge(post.category)}
                </Chip>
                {post.pinned ? (
                  <Chip color="danger" size="sm" variant="soft">
                    置顶
                  </Chip>
                ) : null}
                {post.featured ? (
                  <Chip color="warning" size="sm" variant="soft">
                    精选
                  </Chip>
                ) : null}
              </div>
            </div>

            <div className="mt-3">
              <div className={`font-semibold tracking-tight text-slate-950 ${compact ? "text-[1rem]" : "text-[1rem]"}`}>{post.title}</div>
              <p className={`mt-1.5 whitespace-pre-wrap text-[0.9rem] leading-6 text-slate-600 ${compact ? "line-clamp-2" : "line-clamp-2"}`}>
                {post.content}
              </p>
            </div>

            {desktopVisibleTags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {desktopVisibleTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--primary)]">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between gap-3 text-[0.8rem] text-[var(--muted)]">
              <div className="flex items-center gap-4">
                <span>评论 {post.commentCount}</span>
                <span>收藏 {post.favoriteCount}</span>
              </div>
              <span className="truncate text-right">
                {post.visibility === "community" ? "全小区可见" : post.visibility === "building" ? "楼栋可见" : "私密可见"}
              </span>
            </div>
          </div>

          {desktopPreviewImage ? (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1rem] bg-[var(--surface-muted)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- runtime-configured URLs are loaded from the existing object storage service. */}
              <img alt={post.title} className="h-full w-full object-cover" src={desktopPreviewImage.url} />
              {desktopImageCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-slate-950/70 px-1.5 py-0.5 text-[0.64rem] font-semibold text-white">
                  +{desktopImageCount}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>
    </>
  );
}
