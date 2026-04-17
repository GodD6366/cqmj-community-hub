import Link from 'next/link';
import { Card, Chip } from '@heroui/react';
import { getCurrentUserFromCookie } from '@/lib/auth-server';
import { listPostsForViewer } from '@/lib/community-server';
import { communityRules } from '../lib/mock-data';
import { type CommunityPost } from '../lib/types';
import { formatDateTime, getPostBadge, timeAgo } from '../lib/utils';
import { ButtonLink, PageShell, SectionCard } from '../components/ui';

function NoticeRow({ post }: { post: CommunityPost }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className='grid gap-3 border-b border-[var(--separator)] px-4 py-4 transition hover:bg-[rgba(255,211,77,0.12)] last:border-b-0 md:grid-cols-[7rem_minmax(0,1fr)_6rem]'
    >
      <div className='text-[11px] font-bold tracking-[0.18em] text-slate-500 uppercase'>
        <div>{getPostBadge(post.category)}</div>
        <div className='mt-2'>{timeAgo(post.createdAt)}</div>
      </div>
      <div className='min-w-0'>
        <div className='flex flex-wrap items-center gap-2'>
          {post.pinned ? (
            <Chip color='danger' size='sm' variant='soft'>
              置顶
            </Chip>
          ) : null}
          {post.featured ? (
            <Chip color='warning' size='sm' variant='soft'>
              精选
            </Chip>
          ) : null}
        </div>
        <h3 className='mt-2 line-clamp-2 text-lg font-semibold tracking-tight text-slate-950'>
          {post.title}
        </h3>
        <p className='mt-1 line-clamp-2 text-sm leading-6 text-slate-700'>
          {post.content}
        </p>
      </div>
      <div className='text-right text-sm text-slate-600'>
        <div>{post.authorName}</div>
        <div className='mt-2 text-xs'>{post.commentCount} 评论</div>
      </div>
    </Link>
  );
}

function CompactColumn({
  title,
  href,
  posts,
}: {
  title: string;
  href: string;
  posts: CommunityPost[];
}) {
  return (
    <SectionCard className='overflow-hidden'>
      <Card.Header className='flex items-center justify-between border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-3'>
        <div className='text-sm font-semibold tracking-[0.08em] text-slate-900 uppercase'>
          {title}
        </div>
        <Link
          href={href}
          className='text-xs font-semibold text-[var(--accent)] underline underline-offset-4'
        >
          进入频道
        </Link>
      </Card.Header>
      <Card.Content className='divide-y divide-[var(--separator)] p-0'>
        {posts.map((post, index) => (
          <Link
            key={post.id}
            href={`/posts/${post.id}`}
            className='block px-4 py-3 transition hover:bg-[rgba(15,39,66,0.04)]'
          >
            <div className='grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3'>
              <div className='rounded-[0.7rem] border-2 border-[var(--border-strong)] bg-[var(--signal)] px-2 py-1 text-center text-[11px] font-bold text-[var(--primary-strong)]'>
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className='min-w-0'>
                <div className='line-clamp-2 text-sm font-semibold text-slate-900'>
                  {post.title}
                </div>
                <div className='mt-1 text-xs text-slate-500'>
                  {post.authorName} · {formatDateTime(post.createdAt)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </Card.Content>
    </SectionCard>
  );
}

export default async function Home() {
  const currentUser = await getCurrentUserFromCookie();
  const posts = await listPostsForViewer(currentUser?.id ?? null);

  const pinnedPosts = posts
    .filter((post) => post.pinned || post.featured)
    .slice(0, 4);
  const latestPosts = posts.slice(0, 6);
  const requests = posts
    .filter((post) => post.category === 'request')
    .slice(0, 4);
  const secondhand = posts
    .filter((post) => post.category === 'secondhand')
    .slice(0, 4);
  const plays = posts
    .filter((post) => post.category === 'play')
    .slice(0, 4);
  const discussions = posts
    .filter((post) => post.category === 'discussion')
    .slice(0, 4);

  return (
    <PageShell className='space-y-4'>
      <section className='grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_22rem]'>
        <div className='hero-aurora rounded-[1.2rem] p-5 text-white sm:p-6'>
          <div className='section-kicker text-white/72'>
            Neighborhood Operations Board
          </div>
          <div className='mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_12rem]'>
            <div>
              <h1 className='editorial-title max-w-3xl text-[2.7rem] leading-[0.92] font-semibold sm:text-[4.3rem]'>
                {currentUser
                  ? `欢迎回来，${currentUser.username}`
                  : '让一个小区像系统一样运转'}
              </h1>
              <p className='mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base'>
                邻里圈不是聊天房，而是一块被持续维护的社区面板。需求、闲置、治理与交流都应该被看见、被分类、被回应。
              </p>
              <div className='mt-6 flex flex-wrap gap-2 '>
                <ButtonLink href='/posts' variant='outline'>
                  打开帖子广场
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>

        <SectionCard className='overflow-hidden'>
          <Card.Header className='border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-4'>
            <div>
              <div className='section-kicker'>快速通道</div>
              <h2 className='mt-3 text-xl font-semibold tracking-tight text-slate-950'>
                进入功能区
              </h2>
            </div>
          </Card.Header>
          <Card.Content className='grid gap-3 p-4'>
            {[
              {
                href: '/login',
                label: '住户登录',
                desc: '邀请码绑定身份后进入社区',
              },
              {
                href: '/publish',
                label: '发布中心',
                desc: '发需求、闲置、约玩和讨论内容',
              },
              {
                href: '/rules',
                label: '查看规则',
                desc: '先对齐发帖边界和治理方式',
              },
            ].map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className='route-card grid grid-cols-[3rem_minmax(0,1fr)] gap-3 px-3 py-3 transition hover:-translate-y-[1px]'
              >
                <div className='rounded-[0.8rem] border-2 border-[var(--border-strong)] bg-[var(--signal)] px-2 py-1 text-center text-xs font-bold text-[var(--primary-strong)]'>
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className='min-w-0'>
                  <div className='text-sm font-semibold text-slate-950'>
                    {item.label}
                  </div>
                  <div className='mt-1 text-xs leading-5 text-slate-600'>
                    {item.desc}
                  </div>
                </div>
              </Link>
            ))}
          </Card.Content>
        </SectionCard>
      </section>

      <section className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]'>
        <div className='space-y-4'>
          <SectionCard className='overflow-hidden'>
            <Card.Header className='border-b-2 border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <div className='section-kicker'>Priority Feed</div>
                  <h2 className='mt-3 text-2xl font-semibold tracking-tight text-slate-950'>
                    置顶与精选信息
                  </h2>
                </div>
                <ButtonLink
                  href='/posts?sort=featured'
                  size='sm'
                  variant='secondary'
                >
                  查看全部精选
                </ButtonLink>
              </div>
            </Card.Header>
            <Card.Content className='p-0'>
              {pinnedPosts.map((post) => (
                <NoticeRow key={post.id} post={post} />
              ))}
            </Card.Content>
          </SectionCard>

          <div className='board-grid md:grid-cols-2 2xl:grid-cols-4'>
            <CompactColumn
              title='需求互助'
              href='/posts?category=request'
              posts={requests}
            />
            <CompactColumn
              title='闲置交换'
              href='/posts?category=secondhand'
              posts={secondhand}
            />
            <CompactColumn
              title='约玩组队'
              href='/posts?category=play'
              posts={plays}
            />
            <CompactColumn
              title='社区交流'
              href='/posts?category=discussion'
              posts={discussions}
            />
          </div>
        </div>

        <div className='space-y-4'>
          <SectionCard className='overflow-hidden'>
            <Card.Header className='border-b border-[var(--separator)] bg-[var(--surface-muted)] px-4 py-4'>
              <div>
                <div className='section-kicker'>Latest Stream</div>
                <h2 className='mt-3 text-xl font-semibold tracking-tight text-slate-950'>
                  最新动态
                </h2>
              </div>
            </Card.Header>
            <Card.Content className='divide-y divide-[var(--separator)] p-0'>
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className='block px-4 py-4 transition hover:bg-[rgba(15,39,66,0.04)]'
                >
                  <div className='flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase'>
                    <span>{getPostBadge(post.category)}</span>
                    <span>·</span>
                    <span>{timeAgo(post.createdAt)}</span>
                  </div>
                  <div className='mt-2 text-base font-semibold text-slate-950'>
                    {post.title}
                  </div>
                  <div className='mt-1 text-sm leading-6 text-slate-700'>
                    {post.content.slice(0, 72)}...
                  </div>
                </Link>
              ))}
            </Card.Content>
          </SectionCard>

          <SectionCard className='p-4'>
            <Card.Header className='p-0'>
              <Card.Title className='text-lg font-semibold text-slate-950'>
                社区运行规则
              </Card.Title>
            </Card.Header>
            <Card.Content className='space-y-3 p-0 pt-4'>
              {communityRules.map((rule) => (
                <div key={rule.title} className='route-card p-3'>
                  <div className='text-sm font-semibold text-slate-950'>
                    {rule.title}
                  </div>
                  <div className='mt-2 text-xs leading-5 text-slate-600'>
                    {rule.points[0]}
                  </div>
                </div>
              ))}
            </Card.Content>
          </SectionCard>
        </div>
      </section>
    </PageShell>
  );
}
