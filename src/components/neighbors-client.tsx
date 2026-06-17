"use client";

import { useMemo, useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { useCommunityPosts } from "@/lib/community-store";
import { EmptyState } from "./ui/empty-state";
import { Toast, useToast } from "./ui/toast";
import type { NeighborSkillCategory, NeighborSkillDraft } from "@/lib/types";
import { SearchIcon } from "./app-icons";

const categoryLabels: Record<NeighborSkillCategory, string> = {
  computer_repair: "电脑维修",
  bicycle_repair: "自行车维修",
  photography: "摄影",
  pet_care: "宠物照料",
  tutoring: "家教辅导",
  cooking: "美食烹饪",
  gardening: "园艺",
  tool_sharing: "工具共享",
  home_repair: "家庭维修",
  errand: "跑腿代办",
  other: "其他",
};

export function NeighborsClient() {
  const { neighborSkills, addNeighborSkill, updateNeighborSkill, currentUser } = useCommunityPosts();
  const { toast, show } = useToast();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<NeighborSkillCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<NeighborSkillCategory>("other");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTags, setFormTags] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    let result = neighborSkills;
    if (filterCategory !== "all") result = result.filter((s) => s.category === filterCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) => s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)));
    }
    return result;
  }, [neighborSkills, filterCategory, search]);

  async function handleSave() {
    if (!formTitle.trim()) { show("请输入技能名称", "error"); return; }
    setBusy(true);
    try {
      const draft: NeighborSkillDraft = {
        category: formCategory,
        title: formTitle.trim(),
        description: formDesc.trim(),
        tags: formTags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      };
      if (editingSkillId) await updateNeighborSkill(editingSkillId, draft);
      else await addNeighborSkill(draft);
      resetForm();
      show("保存成功。", "success");
    } catch (e) { show(e instanceof Error ? e.message : "保存失败", "error"); }
    finally { setBusy(false); }
  }

  function resetForm() {
    setShowForm(false); setEditingSkillId(null);
    setFormCategory("other"); setFormTitle(""); setFormDesc(""); setFormTags("");
  }

  async function handleContact(skillId: string) {
    try {
      await fetch(`/api/skills/${skillId}/contact`, { method: "POST" });
      show("已联系邻居，请耐心等待回复。", "success");
    } catch { show("联系失败", "error"); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3 px-4 pb-28 pt-5 md:space-y-5 md:p-6">
      <Toast toast={toast} />
      <div className="app-panel-strong flex flex-col gap-4 p-4 md:p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="map-coordinate">邻里技能站</div>
          <h1 className="app-display mt-2 text-[1.85rem] leading-tight md:mt-3 md:text-4xl">邻里技能互助</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:leading-7">找到会修、会教、会帮忙的邻居，让能力在小区内部流动起来。</p>
        </div>
        {currentUser && (
          <Button className="min-h-11 font-bold" variant="primary" size="sm" onPress={() => setShowForm(!showForm)}>
            {showForm ? "取消" : "登记技能"}
          </Button>
        )}
      </div>

      {/* 登记表单 */}
      {showForm && (
        <Card className="app-panel space-y-3 p-3.5 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">{editingSkillId ? "编辑技能" : "登记技能"}</h2>
              <p className="text-xs text-muted-foreground">把能帮什么、适合什么时间说清楚。</p>
            </div>
            <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-bold text-primary">互助</span>
          </div>
          <select className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" value={formCategory} onChange={(e) => setFormCategory(e.target.value as NeighborSkillCategory)}>
            {(Object.entries(categoryLabels) as [NeighborSkillCategory, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="技能名称" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
          <textarea className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" rows={3} placeholder="技能描述" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
          <input className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="标签，逗号分隔" value={formTags} onChange={(e) => setFormTags(e.target.value)} />
          <div className="flex gap-2">
            <Button className="min-h-11 flex-1 font-bold" variant="primary" size="sm" isPending={busy} onPress={() => { void handleSave(); }}>
              {editingSkillId ? "更新技能" : "登记技能"}
            </Button>
            {editingSkillId && <Button className="min-h-11" variant="ghost" size="sm" onPress={resetForm}>取消编辑</Button>}
          </div>
        </Card>
      )}

      {/* 搜索 */}
      <div className="app-panel flex min-h-12 items-center gap-2 px-3 py-2">
        <SearchIcon />
        <input
          type="text"
          className="min-h-11 flex-1 bg-transparent text-sm outline-none"
          placeholder="搜索技能、住户..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 分类筛选 */}
      <div className="app-panel mobile-scroll-rail flex gap-2 overflow-x-auto p-3 [-webkit-overflow-scrolling:touch] md:flex-wrap">
        <button
          type="button"
          className={`app-chip app-chip-compact shrink-0 ${filterCategory === "all" ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/15" : "border-default-200 text-muted-foreground"}`}
          onClick={() => setFilterCategory("all")}
        >
          全部
        </button>
        {(Object.entries(categoryLabels) as [NeighborSkillCategory, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`app-chip app-chip-compact shrink-0 ${filterCategory === key ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/15" : "border-default-200 text-muted-foreground"}`}
            onClick={() => setFilterCategory(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 技能列表 */}
      {filtered.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((skill) => (
            <Card key={skill.id} className="app-panel p-4">
              <div className="flex items-center justify-between">
                <Chip size="sm" variant="soft">{categoryLabels[skill.category]}</Chip>
                {skill.isMine && <span className="text-xs text-muted-foreground">我的技能</span>}
              </div>
              <h3 className="mt-2 font-semibold">{skill.title}</h3>
              {skill.description && <p className="mt-1 text-sm text-muted-foreground">{skill.description}</p>}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {Array.from(skill.ownerName)[0]}
                  </div>
                  <span>{skill.ownerName} · {skill.roomNumber}</span>
                </div>
                <div className="flex gap-1">
                  {!skill.isMine && currentUser && (
                    <Button className="min-h-11" size="sm" variant="secondary" onPress={() => { void handleContact(skill.id); }}>联系TA</Button>
                  )}
                  {skill.isMine && (
                    <Button className="min-h-11" size="sm" variant="ghost" onPress={() => {
                      setFormCategory(skill.category);
                      setFormTitle(skill.title);
                      setFormDesc(skill.description ?? "");
                      setFormTags(skill.tags.join(", "));
                      setEditingSkillId(skill.id);
                      setShowForm(true);
                    }}>编辑</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无技能登记" description="成为第一个登记技能的邻居吧" actionLabel="登记技能" actionHref="#" />
      )}
    </div>
  );
}
