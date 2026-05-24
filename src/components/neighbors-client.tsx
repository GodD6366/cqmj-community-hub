"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Input } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { CyberPanel, CyberStatGrid, DataList, EmptyState, ResidentAvatar } from "./resident-shared";
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
    } catch (e) {
      console.error(e);
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

  return (
    <main className="page-shell space-y-4 md:space-y-5">
      <section className="terminal-mobile-root md:!hidden">
        <div className="terminal-hero-card">
          <div className="terminal-page-head">
            <div>
              <div className="terminal-kicker">邻里互助</div>
              <h1 className="terminal-page-title">技能库</h1>
              <p className="terminal-page-subtitle">发现身边的宝藏邻居</p>
            </div>
            {currentUser && (
              <button 
                type="button" 
                className="terminal-icon-button" 
                aria-label="登记"
                onClick={handleEditOpen}
              >
                +
              </button>
            )}
          </div>
          <div className="terminal-search-shell mt-4">
            <Input aria-label="搜索技能" className="flex-1" placeholder="搜索技能 / 住户" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="terminal-filter-row mt-4 overflow-x-auto pb-2">
            {(["all", ...neighborSkillCategories] as const).map((cat) => (
              <button key={cat} type="button" className={`terminal-filter-pill whitespace-nowrap ${activeCategory === cat ? "is-active" : ""}`} onClick={() => setActiveCategory(cat)}>
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {isEditing && (
          <div className="app-card p-4 mx-4">
            <h3 className="text-lg font-semibold mb-3">{mySkill ? "修改登记" : "登记技能"}</h3>
            <div className="space-y-3">
              <select 
                className="w-full rounded-md border p-2"
                value={editDraft.category}
                onChange={e => setEditDraft({...editDraft, category: e.target.value as NeighborSkillCategory})}
              >
                {neighborSkillCategories.map(cat => (
                  <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                ))}
              </select>
              <input 
                placeholder="技能简述 (如：免费提供梯子)" 
                className="w-full rounded-md border p-2" 
                value={editDraft.title}
                onChange={e => setEditDraft({...editDraft, title: e.target.value})}
              />
              <textarea 
                placeholder="详细说明" 
                className="w-full rounded-md border p-2 h-20"
                value={editDraft.description}
                onChange={e => setEditDraft({...editDraft, description: e.target.value})}
              />
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-4 py-2 border rounded" onClick={() => setIsEditing(false)}>取消</button>
                <button type="button" className="px-4 py-2 bg-[var(--primary)] text-white rounded" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {!hydrated ? <div className="terminal-panel text-sm text-[var(--muted)]">加载中...</div> : filteredSkills.length > 0 ? filteredSkills.map((skill) => <SkillRow key={skill.id} skill={skill} />) : <EmptyState title="没有匹配的技能" description="试试其他搜索词" />}
        </div>
      </section>

      <section className="hidden md:grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_360px] neighbors-desktop">
        <CyberPanel title="技能与资源互助" kicker="Skills Directory">
          <div className="space-y-4">
            <Input aria-label="搜索" placeholder="搜索技能 / 邻居 / 房号" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="flex gap-2 overflow-x-auto pb-2 flex-wrap">
              {(["all", ...neighborSkillCategories] as const).map((cat) => (
                <button key={cat} type="button" className={`rounded-full px-3 py-1.5 text-[0.82rem] font-semibold whitespace-nowrap ${activeCategory === cat ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border border-[var(--border)] text-[var(--muted)]"}`} onClick={() => setActiveCategory(cat)}>
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
            
            {isEditing && (
              <div className="app-card-muted p-4 border border-[var(--primary)]">
                <h3 className="font-semibold text-slate-800 mb-4">{mySkill ? "修改技能卡片" : "登记我的技能"}</h3>
                <div className="grid gap-4 max-w-lg">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">技能分类</label>
                    <select 
                      className="w-full rounded-md border p-2"
                      value={editDraft.category}
                      onChange={e => setEditDraft({...editDraft, category: e.target.value as NeighborSkillCategory})}
                    >
                      {neighborSkillCategories.map(cat => (
                        <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">技能标题</label>
                    <input 
                      placeholder="例如：精通电脑组装与维修" 
                      className="w-full rounded-md border p-2" 
                      value={editDraft.title}
                      onChange={e => setEditDraft({...editDraft, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">服务详情说明</label>
                    <textarea 
                      placeholder="说明您能提供的帮助以及方便的时间" 
                      className="w-full rounded-md border p-2 min-h-[80px]"
                      value={editDraft.description}
                      onChange={e => setEditDraft({...editDraft, description: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" className="px-4 py-2 bg-slate-800 text-white font-medium rounded text-sm shadow hover:bg-slate-700 transition" onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? "保存中..." : "保存我的登记"}
                    </button>
                    <button type="button" className="px-4 py-2 border text-slate-600 font-medium rounded text-sm hover:bg-slate-50 transition" onClick={() => setIsEditing(false)}>取消</button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3">
              {!hydrated ? <div className="app-card-muted p-4 text-sm text-[var(--muted)]">加载中...</div> : filteredSkills.length > 0 ? filteredSkills.map((skill) => <SkillRow key={skill.id} skill={skill} desktop />) : <EmptyState title="没有匹配的技能" description="换个搜索词试试。" />}
            </div>
          </div>
        </CyberPanel>

        <div className="grid gap-4 content-start">
          <CyberPanel title="我的技能状态" kicker="My Skill">
            {currentUser ? (
               <div className="p-1">
                 {mySkill ? (
                   <div>
                     <div className="text-sm text-slate-800 font-semibold mb-1">已登记：{mySkill.title}</div>
                     <div className="text-xs text-slate-500 mb-3">{mySkill.description.substring(0, 30)}...</div>
                     <button type="button" className="w-full py-2 bg-slate-100 text-slate-700 font-semibold rounded text-sm border hover:bg-slate-200 transition" onClick={handleEditOpen}>
                       编辑信息
                     </button>
                   </div>
                 ) : (
                   <div>
                     <div className="text-sm text-slate-600 mb-3">你还没有登记任何技能或互助资源。登记后，其他邻居可以通过智能匹配找到你。</div>
                     <button type="button" className="w-full py-2 bg-[rgba(57,245,143,0.12)] text-[var(--primary)] border border-[rgba(57,245,143,0.3)] font-semibold rounded text-sm hover:bg-[rgba(57,245,143,0.2)] transition" onClick={handleEditOpen}>
                       立即登记
                     </button>
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
      </section>
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
    } catch (e) {
      alert("请求失败，请稍后重试");
    } finally {
      setContacting(false);
    }
  };

  return (
    <article className={desktop ? "app-card-muted p-4" : "terminal-list-row"}>
      <div className="flex items-start gap-3">
        <ResidentAvatar name={skill.ownerName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-950">{skill.roomNumber} {skill.ownerName}</span>
            <span className="app-chip">{categoryLabels[skill.category]}</span>
          </div>
          <div className="mt-1 font-medium text-sm text-slate-800">{skill.title}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">{skill.description}</div>
        </div>
        <button 
          type="button" 
          className={`terminal-outline-button self-center ${contacted ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={handleContact}
          disabled={contacting || contacted || skill.isMine}
        >
          {contacting ? "发送中..." : contacted ? "已联系" : "联系TA"}
        </button>
      </div>
    </article>
  );
}
