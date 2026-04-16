# 邻里圈（Community Hub）

面向真实小区住户的社区协作平台原型仓库。

项目愿景、白皮书和非技术说明已移到 [why.md](./why.md)。
本文件聚焦仓库结构、当前实现和开发接入。

## 当前仓库已实现的能力

- 邀请码 + 房号注册绑定
- 用户名密码登录
- 发布需求、闲置、交流三类帖子
- 帖子列表与详情浏览
- 评论、收藏、举报
- 社区规则页、关于页
- 邀请码管理后台
- 空库首次启动时自动写入示例帖子

## 页面入口

- `/`：首页，优先渲染仓库根目录 `why.md`
- `/posts`：帖子广场
- `/publish`：发帖页面
- `/login`：登录 / 注册绑定
- `/rules`：社区规则
- `/about`：项目介绍
- `/admin`：邀请码管理后台

## 技术栈

- **Next.js 16** + **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Prisma**
- **PostgreSQL**
- **Vercel** 用于部署

## 数据与运行说明

- Prisma schema 位于 [prisma/schema.prisma](./prisma/schema.prisma)
- 首页文案优先读取 [why.md](./why.md)，缺失时回退到 `README.md`
- 本地默认使用 `DATABASE_URL` 连接 PostgreSQL
- 管理员密码与初始邀请码通过环境变量注入

## 本地开发

```bash
pnpm install
pnpm prisma generate
pnpm prisma db push
pnpm dev
```

如果希望直接用 Docker 启动本地 PostgreSQL：

```bash
docker compose up --build
```

## 环境变量

最少需要以下变量：

- `DATABASE_URL`
- `COMMUNITY_ADMIN_PASSWORD`
- `COMMUNITY_INVITE_CODES`

本地可以参考 [.env.example](./.env.example)：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/community_hub?schema=public"
COMMUNITY_ADMIN_PASSWORD="admin"
COMMUNITY_INVITE_CODES="WELCOME-2026,NEIGHBOR-2026"
```

## 部署说明

- 在 Vercel 中配置 `DATABASE_URL`、`COMMUNITY_ADMIN_PASSWORD` 和 `COMMUNITY_INVITE_CODES`
- 每次 schema 变更后运行 `pnpm prisma generate`
- 首次部署到空库时运行 `pnpm prisma db push`
- 应用启动后如果发现帖子表为空，会自动写入一批演示数据
