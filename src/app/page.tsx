import Link from "next/link";
import { Card, Chip } from "@heroui/react";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { listPostsForViewer } from "@/lib/community-server";
import { communityRules } from "../lib/mock-data";
import type { CommunityPost } from "../lib/types";
import { formatDateTime, getPostBadge, getVisibilityLabel, timeAgo } from "../lib/utils";
import { ButtonLink, PageShell, SectionCard } from "../components/ui";

function PortalRow({ post, compact = false }: { post: CommunityPost; compact?: boolean }) {
  return (
    <Link href={`/posts/${post.id}`} className="forum-row">
      <div className="flex flex-wrap items-center gap-2">
        <Chip color="accent" size="sm" variant="primary">
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
      <div className="min-w-0">
        <div className={compact ? "line-clamp-2 text-[0.95rem] font-semibold text-slate-900" : "line-clamp-2 text-lg font-semibold text-slate-950"}>
          {post.title}
        </div>
        {!compact ? (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">
            {post.content}
          </p>
        ) : null}
      </div>
      <div className="forum-meta">
        <span>{post.authorName}</span>
        <span>{timeAgo(post.createdAt)}</span>
        <span>{getVisibilityLabel(post.visibility)}</span>
        <span>{post.commentCount} 评论</span>
      </div>
    </Link>
  );
}

function ChannelPanel({ title, href, posts }: { title: string; href: string; posts: CommunityPost[] }) {
  return (
    <SectionCard className="overflow-hidden">
      <Card.Header className="flex items-center justify-between border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <Link href={href} className="text-xs font-semibold text-[var(--accent)] underline underline-offset-4">
          查看更多
        </Link>
      </Card.Header>
      <Card.Content className="forum-list p-0">
        {posts.length > 0 ? (
          posts.map((post) => <PortalRow key={post.id} compact post={post} />)
        ) : (
          <div className="px-4 py-5 text-sm text-slate-500">当前频道还没有帖子。</div>
        )}
      </Card.Content>
    </SectionCard>
  );
}

export default async function Home() {
  const currentUser = await getCurrentUserFromCookie();
  const posts = await listPostsForViewer(currentUser?.id ?? null);

  const featuredPosts = posts.filter((post) => post.pinned || post.featured).slice(0, 5);
  const latestPosts = posts.slice(0, 8);
  const requests = posts.filter((post) => post.category === "request").slice(0, 4);
  const secondhand = posts.filter((post) => post.category === "secondhand").slice(0, 4);
  const plays = posts.filter((post) => post.category === "play").slice(0, 4);
  const discussions = posts.filter((post) => post.category === "discussion").slice(0, 4);

  return (
    <PageShell className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="space-y-4">
          <SectionCard className="overflow-hidden">
            <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="section-kicker">社区总览</p>
                  <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    {currentUser ? `欢迎回来，${currentUser.username}` : "邻里圈社区门户"}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    这里优先展示当前社区里真正需要被看到的信息：置顶公告、分类帖子和最新动态。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href="/posts" size="sm" variant="secondary">
                    进入广场
                  </ButtonLink>
                  <ButtonLink href="/publish" size="sm">
                    发布内容
                  </ButtonLink>
                </div>
              </div>
            </Card.Header>
            <Card.Content className="grid gap-3 p-4 sm:grid-cols-3">
              <div className="forum-panel rounded-[1rem] px-4 py-3">
                <div className="text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">公开帖子</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{posts.length}</div>
                <div className="mt-1 text-sm text-slate-600">社区里正在被浏览的全部内容</div>
              </div>
              <div className="forum-panel rounded-[1rem] px-4 py-3">
                <div className="text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">置顶精选</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{featuredPosts.length}</div>
                <div className="mt-1 text-sm text-slate-600">公告、重点通知和精选帖子</div>
              </div>
              <div className="forum-panel rounded-[1rem] px-4 py-3">
                <div className="text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">最新动态</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{latestPosts.length}</div>
                <div className="mt-1 text-sm text-slate-600">按时间排序的最新发帖与更新</div>
              </div>
            </Card.Content>
          </SectionCard>

          <SectionCard className="overflow-hidden">
            <Card.Header className="flex items-center justify-between border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3">
              <div>
                <p className="section-kicker">置顶精选</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">社区当前最重要的信息</h2>
              </div>
              <ButtonLink href="/posts?sort=featured" size="sm" variant="secondary">
                查看全部
              </ButtonLink>
            </Card.Header>
            <Card.Content className="forum-list p-0">
              {featuredPosts.length > 0 ? (
                featuredPosts.map((post) => <PortalRow key={post.id} post={post} />)
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">当前没有置顶或精选帖子。</div>
              )}
            </Card.Content>
          </SectionCard>

          <div className="board-grid lg:grid-cols-2">
            <ChannelPanel href="/posts?category=request" posts={requests} title="需求互助" />
            <ChannelPanel href="/posts?category=secondhand" posts={secondhand} title="闲置交换" />
            <ChannelPanel href="/posts?category=play" posts={plays} title="约玩组队" />
            <ChannelPanel href="/posts?category=discussion" posts={discussions} title="社区交流" />
          </div>
        </div>

        <div className="forum-sidebar">
          <SectionCard className="overflow-hidden">
            <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3">
              <div>
                <p className="section-kicker">快捷入口</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">常用操作</h2>
              </div>
            </Card.Header>
            <Card.Content className="grid gap-2 p-3">
              <ButtonLink href="/login" size="sm" variant="secondary">
                住户登录
              </ButtonLink>
              <ButtonLink href="/publish" size="sm" variant="secondary">
                发布需求或交流
              </ButtonLink>
              <ButtonLink href="/rules" size="sm" variant="secondary">
                查看社区规则
              </ButtonLink>
            </Card.Content>
          </SectionCard>

          <SectionCard className="overflow-hidden">
            <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3">
              <Card.Title className="text-lg font-semibold text-slate-950">规则摘录</Card.Title>
            </Card.Header>
            <Card.Content className="grid gap-2 p-3">
              {communityRules.slice(0, 3).map((rule) => (
                <div key={rule.title} className="forum-panel rounded-[1rem] px-3 py-3">
                  <div className="text-sm font-semibold text-slate-900">{rule.title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">{rule.points[0]}</div>
                </div>
              ))}
            </Card.Content>
          </SectionCard>

          <SectionCard className="overflow-hidden">
            <Card.Header className="border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3">
              <div>
                <p className="section-kicker">最新动态</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">按时间浏览社区内容</h2>
              </div>
            </Card.Header>
            <Card.Content className="forum-list p-0">
              {latestPosts.length > 0 ? (
                latestPosts.map((post) => (
                  <Link key={post.id} href={`/posts/${post.id}`} className="forum-row">
                    <div className="min-w-0 text-[0.96rem] font-semibold text-slate-900">{post.title}</div>
                    <div className="forum-meta">
                      <span>{getPostBadge(post.category)}</span>
                      <span>{post.authorName}</span>
                      <span>{formatDateTime(post.createdAt)}</span>
                      <span>{post.commentCount} 评论</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">当前还没有最新动态。</div>
              )}
            </Card.Content>
          </SectionCard>
        </div>
      </section>
    </PageShell>
  );
}
