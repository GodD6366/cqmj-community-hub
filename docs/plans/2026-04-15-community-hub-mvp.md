# 邻里圈 MVP 实施计划

> **For Hermes:** Use Codex CLI to按任务顺序执行；每个任务完成后先自检再继续。

**Goal:** 把当前原型首页扩展为一个可运行的社区网站 MVP，包含帖子列表、发布帖子、详情页、评论、收藏、举报和简单的站内治理能力。

**Architecture:** 采用 Next.js App Router + TypeScript + Tailwind 作为前端与服务端一体化实现。首版使用本地 JSON/文件作为临时数据存储或轻量内存层，优先把产品闭环跑通，避免过早引入复杂后端；同时保留清晰的模块边界，后续可平滑切换到数据库与鉴权。

**Tech Stack:** Next.js 16、React 19、TypeScript、Tailwind CSS、Node.js。

---

## 执行范围

本次 MVP 只做“能跑、能发、能看、能互动”的最小闭环：

- 首页（已有）继续保留，但升级为真实入口
- 帖子流：需求 / 闲置 / 交流三类帖子可浏览、筛选、排序
- 发布页：创建帖子，支持标题、内容、类别、标签、可见范围
- 详情页：查看帖子内容、评论、收藏、举报
- 简单治理：举报入口、置顶标记、推荐位、审核状态占位
- 基础信息页：社区规则 / 关于 / 帮助

**暂不做：** 登录鉴权、数据库、支付、消息推送、图片上传服务、真实楼栋认证、物业后台完整版。

---

## 任务 1：补齐产品数据模型与种子数据

**Objective:** 定义帖子、评论、用户视图和基础枚举，确保首页和列表页有统一的数据来源。

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/mock-data.ts`
- Create: `src/lib/utils.ts`

**Step 1: Write failing test or type-check target**

新增最小的类型约束与数据校验函数，保证后续页面从统一结构读取数据。

**Step 2: Implement minimal model**

建议数据结构：

```ts
export type PostCategory = "request" | "secondhand" | "discussion";
export type VisibilityScope = "community" | "building" | "private";

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  tags: string[];
  authorName: string;
  createdAt: string;
  commentCount: number;
  favoriteCount: number;
  status: "published" | "pending" | "rejected";
  pinned?: boolean;
  featured?: boolean;
  visibility: VisibilityScope;
}
```

**Step 3: Add mock dataset**

Create 8–12 条帖子，覆盖三类帖子、不同状态、不同可见范围、带标签和计数。

**Step 4: Verify**

Run:

```bash
pnpm lint
pnpm build
```

Expected: pass.

---

## Task 2：把首页从静态介绍页改成真实社区入口

**Objective:** 将首页升级为产品首页，展示帖子入口、核心功能、社区规则和最新动态。

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`（如需补充 SEO）

**Step 1: Replace marketing copy with product copy**

首页内容应包含：
- 顶部导航：Logo、发布、首页、社区规则
- Hero：一句清晰定位
- 三个核心模块卡片：需求 / 闲置 / 交流
- 最新帖子预览
- 产品治理提示

**Step 2: Wire with mock data**

首页动态从 `src/lib/mock-data.ts` 读取，而不是硬编码。

**Step 3: Add navigation targets**

先使用页面锚点或占位路由，确保后续添加 `/posts`、`/publish`、`/rules` 时不需要重构首页。

**Step 4: Verify**

检查首页在桌面和移动端布局。

Run:

```bash
pnpm lint
pnpm build
```

Expected: pass.

---

## Task 3：实现帖子列表页

**Objective:** 提供可筛选的帖子浏览页，支持按类别、热度、时间查看。

**Files:**
- Create: `src/app/posts/page.tsx`
- Create: `src/components/post-card.tsx`
- Create: `src/components/filter-bar.tsx`
- Modify: `src/lib/mock-data.ts`

**Step 1: Build a reusable post card**

卡片显示：
- 标题
- 分类标签
- 作者/时间
- 互动数
- 置顶/精选标识

**Step 2: Build filter bar**

支持：
- 分类切换：全部 / 需求 / 闲置 / 交流
- 排序：最新 / 最热 / 精选

**Step 3: Render list page**

列表页使用 mock 数据进行前端筛选，确保交互真实可用。

**Step 4: Verify**

Run:

```bash
pnpm lint
pnpm build
```

Expected: pass.

---

## Task 4：实现帖子详情页与评论区

**Objective:** 让用户可以打开帖子详情、查看正文、互动和评论。

**Files:**
- Create: `src/app/posts/[id]/page.tsx`
- Create: `src/components/comment-list.tsx`
- Create: `src/components/comment-form.tsx`
- Update: `src/lib/mock-data.ts`

**Step 1: Detail page layout**

页面应包含：
- 帖子头部信息
- 正文
- 标签、可见范围、发布时间
- 收藏、举报按钮
- 评论列表和评论输入框

**Step 2: Comments mock flow**

先做客户端本地交互，不接后端；评论提交后追加到本页状态即可。

**Step 3: Empty / pending / rejected states**

当帖子状态不是已发布时，明确显示占位说明。

**Step 4: Verify**

Run:

```bash
pnpm lint
pnpm build
```

Expected: pass.

---

## Task 5：实现发布页

**Objective:** 让用户可以创建三种类型的帖子，并看到发布成功反馈。

**Files:**
- Create: `src/app/publish/page.tsx`
- Create: `src/components/post-editor.tsx`
- Update: `src/lib/mock-data.ts`

**Step 1: Editor form**

表单字段：
- 类型选择
- 标题
- 内容
- 标签
- 可见范围
- 是否匿名（可选）

**Step 2: Client-side validation**

最小校验：
- 标题不能为空
- 内容不能为空
- 标签至少 1 个
- 标题长度上限

**Step 3: Success experience**

提交后显示成功页/成功提示，并把新帖子插入到本地数据源或本页临时状态。

**Step 4: Verify**

Run:

```bash
pnpm lint
pnpm build
```

Expected: pass.

---

## Task 6：补齐社区规则、关于与导航结构

**Objective:** 给社区产品补上必要的治理说明和产品入口，避免像空壳站点。

**Files:**
- Create: `src/app/rules/page.tsx`
- Create: `src/app/about/page.tsx`
- Create: `src/components/site-nav.tsx`

**Step 1: 社区规则页**

包含：
- 内容规范
- 闲置交易规则
- 举报与审核说明
- 隐私说明

**Step 2: 关于页**

说明本站定位、适用范围、未来计划。

**Step 3: 全站导航组件**

统一首页、帖子、发布、规则、关于的入口。

**Step 4: Verify**

Run:

```bash
pnpm lint
pnpm build
```

Expected: pass.

---

## Task 7：体验打磨与收尾

**Objective:** 统一视觉语言、空状态和移动端表现，让 MVP 看起来像一个完整产品。

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/*`

**Step 1: Global polish**

- 统一按钮、卡片、文本层级
- 确保移动端首屏信息完整
- 保持中文文案一致

**Step 2: Add SEO metadata**

设置：
- title
- description
- open graph 占位

**Step 3: Remove dead code**

清理 create-next-app 默认内容和未使用组件。

**Step 4: Final verification**

Run:

```bash
pnpm lint
pnpm build
```

Expected: pass with no warnings blocking release.

---

## 交付标准

完成时必须满足：

- 首页不是默认模板，而是社区产品首页
- 至少有 3 个真实可访问的功能页
- 帖子列表、详情、发布页可走通
- 治理规则可见
- 代码通过 lint 和 build

---

## 推荐执行顺序

1. 数据模型与 mock 数据
2. 首页升级
3. 帖子列表页
4. 详情页 + 评论
5. 发布页
6. 规则页 + 关于页
7. 体验打磨与收尾

---

## 给 Codex 的执行指令

在仓库根目录执行以下目标：

> 按本计划实现社区网站 MVP。优先完成基础数据模型、首页、列表、详情、发布和规则页；每完成一个任务就运行 lint/build 验证。不要引入数据库或后端服务，先用 mock 数据与本地状态把产品闭环跑通。
