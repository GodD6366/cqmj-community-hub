"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Button, Input } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import {
  CyberPanel,
  CyberStatGrid,
  EmptyState,
  ResidentAvatar,
  ResidentFilterTabs,
  ResidentListRow,
  ResidentPageHeader,
  ResidentPanel,
  ResidentSearchBar,
} from "./resident-shared";
import { timeAgo } from "@/lib/utils";
import { neighborSkillCategories, type NeighborSkillCategory, type NeighborSkillSummary, type NeighborSkillDraft } from "@/lib/types";

const categoryLabels: Record<NeighborSkillCategory | "all", string> = {
  all: "全部",
  computer_repair: "电脑维修",
  bicycle_repair: "单车维修",
  photography: "摄影摄像",
  pet_care: "宠物照看",
  tutoring: "辅导教学",
  cooking: "厨艺分享",
  gardening: "绿植养护",
  tool_sharing: "工具共享",
  home_repair: "家居维修",
  errand: "跑腿代办",
  other: "其他",
};

export function NeighborsClient() {
  const { currentUser, neighborSkills, hydrated, addNeighborSkill, updateNeighborSkill } = useCommunityPosts();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<NeighborSkillCategory | "all">("all");
  const deferredQuery = useDeferredValue(query);

  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<NeighborSkillDraft>({
    category: "other",
    title: "",
    description: "",
    tags: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mySkill = useMemo(() => neighborSkills.find(s => s.isMine), [neighborSkills]);

  const filteredSkills = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    let items = [...neighborSkills];
    
    if (activeCategory !== "all") {
      items = items.filter(item => item.category === activeCategory);
    }

    if (q) {
      items = items.filter((item) => 
        [item.title, item.description, item.ownerName, item.roomNumber].join(" ").toLowerCase().includes(q)
      );
    }
    return items;
  }, [deferredQuery, activeCategory, neighborSkills]);

  const handleSubmit = async () => {
    if (!editDraft.title.trim() || !editDraft.description.trim()) return;
    setIsSubmitting(true);
    try {
      if (mySkill) {
        await updateNeighborSkill(mySkill.id, editDraft);
      } else {
        await addNeighborSkill(editDraft);
      }
      setIsEditing(false);
    } catch {
      alert("登记失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = () => {
    if (mySkill) {
      setEditDraft({
        category: mySkill.category,
        title: mySkill.title,
        description: mySkill.description,
        tags: mySkill.tags,
        availability: mySkill.availability,
        active: mySkill.active,
      });
    } else {
      setEditDraft({ category: "other", title: "", description: "", tags: [] });
    }
    setIsEditing(true);
  };

  const categoryTabs = useMemo(
    () => (["all", ...neighborSkillCategories] as const).map((cat) => ({ key: cat, label: categoryLabels[cat] })),
    [],
  );

  return (
    <main className="page-shell">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_360px] gap-4">
        {/* 左侧主要内容 */}
        <div className="space-y-4">
          {/* 移动端专属 PageHeader：在 md:hidden 下显示 */}
          <div className="md:hidden">
            <ResidentPageHeader
              action={currentUser ? <Button size="sm" onPress={handleEditOpen}>登记</Button> : null}
              kicker="邻里互助"
              subtitle="发现身边的宝藏邻居"
              title="技能库"
            />
          </div>

          {/* 桌面端专属的面板头部：在 hidden md:flex 下显示 */}
          <div className="hidden md:flex justify-between items-center bg-white p-5 rounded-2xl border border-[var(--border)]">
            <div>
              <div className="text-xs text-indigo-600 font-semibold">Neighbors Help · 邻里技能与资源互助</div>
              <h1 className="text-xl font-bold mt-1 text-slate-900">邻里技能库</h1>
            </div>
            {currentUser && (
              <Button size="sm" onPress={handleEditOpen}>
                {mySkill ? "修改我的登记" : "登记我的技能"}
              </Button>
            )}
          </div>

          {/* 搜索与过滤 Tabbar（共享） */}
          <div className="bg-white p-4 rounded-2xl border border-[var(--border)] space-y-4">
            <ResidentSearchBar ariaLabel="搜索技能" placeholder="搜索技能 / 住户" value={query} onChange={setQuery} />
            <ResidentFilterTabs activeKey={activeCategory} items={categoryTabs} onChange={setActiveCategory} />
          </div>

          {/* 技能登记编辑面板（共享，只写一次！） */}
          {isEditing && (
            <div className="app-card border border-[var(--primary)] p-4 bg-white rounded-2xl">
              <h3 className="font-semibold text-slate-800 mb-4">{mySkill ? "修改技能卡片" : "登记我的技能"}</h3>
              <div className="grid gap-4 max-w-lg">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">技能分类</label>
                  <select
                    aria-label="技能分类"
                    className="w-full rounded-[1rem] border border-[var(--field-border)] bg-[var(--surface-secondary)] px-3 py-3 text-[var(--field-foreground)]"
                    value={editDraft.category}
                    onChange={(event) => setEditDraft({ ...editDraft, category: event.target.value as NeighborSkillCategory })}
                  >
                    {neighborSkillCategories.map((cat) => <option key={cat} value={cat}>{categoryLabels[cat]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">技能标题简述</label>
                  <Input
                    placeholder="例如：精通电脑组装与维修"
                    value={editDraft.title}
                    onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">服务详情说明与方便联系的时间</label>
                  <textarea
                    placeholder="说明您能提供的帮助以及方便的时间" 
                    className="min-h-28 w-full rounded-[1rem] border border-[var(--field-border)] bg-[var(--surface-secondary)] px-3 py-3 text-[var(--field-foreground)] outline-none"
                    value={editDraft.description}
                    onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-2 justify-end">
                  <Button isPending={isSubmitting} onPress={handleSubmit}>
                    {isSubmitting ? "保存中..." : "保存登记"}
                  </Button>
                  <Button variant="outline" onPress={() => setIsEditing(false)}>取消</Button>
                </div>
              </div>
            </div>
          )}

          {/* 技能列表（共享） */}
          <div className="grid gap-3">
            {!hydrated ? (
              <div className="app-card p-6 text-sm text-[var(--muted)] text-center">加载中...</div>
            ) : filteredSkills.length > 0 ? (
              filteredSkills.map((skill) => <SkillRow key={skill.id} skill={skill} desktop />)
            ) : (
              <EmptyState title="没有匹配的技能" description="试试其他搜索词" />
            )}
          </div>
        </div>

        {/* 右侧边栏：仅在桌面端显示 */}
        <div className="hidden md:grid gap-4 content-start">
          <CyberPanel title="我的技能状态" kicker="My Skill">
            {currentUser ? (
               <div className="p-1">
                 {mySkill ? (
                   <div>
                     <div className="text-sm text-slate-800 font-semibold mb-1">已登记：{mySkill.title}</div>
                     <div className="text-xs text-slate-500 mb-3">{mySkill.description.substring(0, 30)}...</div>
                     <Button className="w-full" onPress={handleEditOpen} variant="secondary">
                       编辑信息
                     </Button>
                   </div>
                 ) : (
                   <div>
                     <div className="text-sm text-slate-600 mb-3">你还没有登记任何技能或互助资源。登记后，其他邻居可以通过智能匹配找到你。</div>
                     <Button className="w-full" onPress={handleEditOpen}>
                       立即登记
                     </Button>
                   </div>
                 )}
               </div>
            ) : (
               <div className="text-sm text-slate-500">登录后可以登记自己的技能，帮助社区邻居。</div>
            )}
          </CyberPanel>
          <CyberPanel title="目录统计" kicker="Summary">
            <CyberStatGrid columns={2} items={[
              { label: "已登记技能", value: hydrated ? String(neighborSkills.length) : "--" },
              { label: "活跃大类", value: hydrated ? String(new Set(neighborSkills.map(s => s.category)).size) : "--" },
            ]} />
          </CyberPanel>
        </div>
      </div>
    </main>
  );
}

function SkillRow({ skill, desktop = false }: { skill: NeighborSkillSummary; desktop?: boolean }) {
  const [contacting, setContacting] = useState(false);
  const [contacted, setContacted] = useState(false);

  const handleContact = async () => {
    if (skill.isMine) {
      alert("这是您自己登记的技能");
      return;
    }
    setContacting(true);
    try {
      const res = await fetch(`/api/skills/${skill.id}/contact`, {
        method: "POST"
      });
      if (res.ok) {
        setContacted(true);
        alert("已发送通知给该邻居！");
      } else {
        const data = await res.json();
        alert(`通知失败: ${data.error || "未知错误"}`);
      }
    } catch {
      alert("请求失败，请稍后重试");
    } finally {
      setContacting(false);
    }
  };

  return (
    <ResidentListRow
      className={desktop ? "p-4" : undefined}
      leading={<ResidentAvatar name={skill.ownerName} size="sm" />}
      meta={<span>{timeAgo(skill.createdAt)}</span>}
      subtitle={
        <div className="grid gap-1">
          <div className="font-medium text-sm text-slate-800">{skill.title}</div>
          <div className="text-xs text-[var(--muted)]">{skill.description}</div>
        </div>
      }
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate">{skill.roomNumber} {skill.ownerName}</span>
          <span className="app-chip">{categoryLabels[skill.category]}</span>
        </div>
      }
      trailing={
        <Button
          className={contacted ? "opacity-50" : ""}
          isDisabled={contacting || contacted || skill.isMine}
          size="sm"
          variant={contacted ? "secondary" : "outline"}
          onPress={handleContact}
        >
          {contacting ? "发送中..." : contacted ? "已联系" : "联系TA"}
        </Button>
      }
    />
  );
}
