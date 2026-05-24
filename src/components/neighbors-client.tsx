"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Input } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { CyberPanel, CyberStatGrid, DataList, EmptyState, ResidentAvatar } from "./resident-shared";
import { timeAgo, uniquePosts } from "@/lib/utils";

interface NeighborProfile {
  id: string;
  name: string;
  roomNumber: string;
  building: string;
  score: number;
  label: string;
  intro: string;
  lastActive: string;
}

const filters = [
  { key: "hot", label: "邻居榜" },
  { key: "active", label: "常互动" },
  { key: "new", label: "新住户" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

function inferRoomNumberFromText(text: string) {
  const match = text.match(/\b\d+-\d{3,4}\b/);
  return match?.[0] ?? "待完善";
}

function inferRoomNumber(name: string, currentUserRoom?: string, index = 0) {
  const fromName = inferRoomNumberFromText(name);
  if (fromName !== "待完善") return fromName;
  if (currentUserRoom) {
    const [building] = currentUserRoom.split("-");
    return `${building}-${String(1001 + index).padStart(4, "0")}`;
  }
  return `${(index % 3) + 1}-${String(1001 + index).padStart(4, "0")}`;
}

export function NeighborsClient() {
  const { currentUser, posts, serviceTickets, notifications, hydrated } = useCommunityPosts();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("hot");
  const deferredQuery = useDeferredValue(query);

  const neighbors = useMemo<NeighborProfile[]>(() => {
    const map = new Map<string, NeighborProfile>();
    const publicPosts = uniquePosts(posts);

    function upsert(name: string, roomHint?: string, activity?: string, scoreDelta = 1, introHint?: string) {
      if (!name.trim()) return;
      const key = name.trim();
      const existing = map.get(key);
      const roomNumber = roomHint && roomHint !== "待完善" ? roomHint : inferRoomNumber(name, currentUser?.roomNumber, map.size);
      const building = roomNumber.split("-")[0] ?? "1";
      const nextActivity = activity ?? existing?.lastActive ?? new Date().toISOString();
      const nextIntro = introHint ?? existing?.intro ?? "热心邻居";
      const nextScore = (existing?.score ?? 0) + scoreDelta;
      map.set(key, {
        id: existing?.id ?? `${key}-${roomNumber}`,
        name: key,
        roomNumber,
        building,
        score: nextScore,
        label: nextScore >= 6 ? "互动达人" : nextScore >= 3 ? "热心邻居" : "新住户",
        intro: nextIntro,
        lastActive: nextActivity,
      });
    }

    publicPosts.forEach((post, index) => {
      upsert(post.authorName, inferRoomNumber(post.content, currentUser?.roomNumber, index), post.updatedAt || post.createdAt, 2 + post.commentCount + post.favoriteCount, post.tags[0] ? `${post.tags[0]} 爱好者` : "常在社区发言");
      post.comments.forEach((comment) => upsert(comment.authorName, undefined, comment.createdAt, 1, "经常参与评论"));
    });

    serviceTickets.forEach((ticket) => {
      upsert(ticket.authorName, ticket.roomNumber || undefined, ticket.updatedAt, 2, `最近提交过${ticket.title}`);
    });

    notifications.forEach((item) => {
      const room = inferRoomNumber(item.title, currentUser?.roomNumber, map.size);
      upsert(item.title.replace(/[：:].*$/, "").trim(), room, item.createdAt, 1, "近期收到社区提醒");
    });

    if (currentUser) {
      upsert(currentUser.nickname, currentUser.roomNumber, currentUser.createdAt, 5, "已认证业主");
    }

    return Array.from(map.values());
  }, [currentUser, notifications, posts, serviceTickets]);

  const filteredNeighbors = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const items = [...neighbors];
    if (filter === "active") items.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
    else if (filter === "new") items.sort((a, b) => a.score - b.score);
    else items.sort((a, b) => b.score - a.score);

    if (!q) return items;
    return items.filter((item) => [item.name, item.roomNumber, item.label, item.intro].join(" ").toLowerCase().includes(q));
  }, [deferredQuery, filter, neighbors]);

  return (
    <main className="page-shell space-y-4 md:space-y-5">
      <section className="terminal-mobile-root md:hidden">
        <div className="terminal-hero-card">
          <div className="terminal-page-head">
            <div>
              <div className="terminal-kicker">投票目录</div>
              <h1 className="terminal-page-title">投票</h1>
              <p className="terminal-page-subtitle">搜索住户 / 房号，快速找到常互动邻居</p>
            </div>
            <button type="button" className="terminal-icon-button" aria-label="筛选">⌯</button>
          </div>
          <div className="terminal-search-shell mt-4">
            <Input aria-label="搜索住户" className="flex-1" placeholder="搜索邻居 / 房号" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="terminal-filter-row mt-4">
            {filters.map((item) => (
              <button key={item.key} type="button" className={`terminal-filter-pill ${filter === item.key ? "is-active" : ""}`} onClick={() => setFilter(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {!hydrated ? <div className="terminal-panel text-sm text-[var(--muted)]">加载中...</div> : filteredNeighbors.length > 0 ? filteredNeighbors.map((neighbor) => <NeighborRow key={neighbor.id} neighbor={neighbor} />) : <EmptyState title="没有匹配的住户" description="换个房号或用户名再试试。" />}
        </div>
      </section>

      <section className="hidden gap-4 xl:grid-cols-[minmax(0,1.5fr)_360px] md:grid">
        <CyberPanel title="投票目录" kicker="Voting Directory">
          <div className="space-y-4">
            <Input aria-label="搜索住户" placeholder="搜索邻居 / 房号 / 标签" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="flex gap-2 overflow-x-auto pb-2">
              {filters.map((item) => (
                <button key={item.key} type="button" className={`rounded-full px-3 py-1.5 text-[0.82rem] font-semibold ${filter === item.key ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border border-[var(--border)] text-[var(--muted)]"}`} onClick={() => setFilter(item.key)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              {!hydrated ? <div className="app-card-muted p-4 text-sm text-[var(--muted)]">加载中...</div> : filteredNeighbors.length > 0 ? filteredNeighbors.map((neighbor) => <NeighborRow key={neighbor.id} neighbor={neighbor} desktop />) : <EmptyState title="没有匹配的住户" description="换个房号或用户名再试试。" />}
            </div>
          </div>
        </CyberPanel>

        <div className="grid gap-4">
          <CyberPanel title="目录统计" kicker="Summary">
            <CyberStatGrid columns={3} items={[
              { label: "住户数", value: hydrated ? String(neighbors.length) : "--" },
              { label: "同楼栋", value: hydrated ? String(neighbors.filter((item) => currentUser?.roomNumber && item.building === currentUser.roomNumber.split("-")[0]).length) : "--" },
              { label: "最近活跃", value: hydrated ? timeAgo(filteredNeighbors[0]?.lastActive ?? new Date().toISOString()) : "--" },
            ]} />
          </CyberPanel>
          <CyberPanel title="当前筛选" kicker="Filter State">
            <DataList items={filters.map((item) => ({ label: item.label, hint: item.key === filter ? "当前查看" : "切换查看不同邻里分组", value: item.key === filter ? "当前" : undefined }))} />
          </CyberPanel>
        </div>
      </section>
    </main>
  );
}

function NeighborRow({ neighbor, desktop = false }: { neighbor: NeighborProfile; desktop?: boolean }) {
  return (
    <article className={desktop ? "app-card-muted p-4" : "terminal-list-row"}>
      <div className="flex items-center gap-3">
        <ResidentAvatar name={neighbor.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-950">{neighbor.roomNumber} {neighbor.name}</span>
            <span className="app-chip">{neighbor.label}</span>
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">{neighbor.intro}</div>
        </div>
        <button type="button" className="terminal-outline-button">聊一聊</button>
      </div>
    </article>
  );
}
