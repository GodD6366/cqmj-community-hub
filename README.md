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
- **PostgreSQL**（本地使用 Docker，线上使用 Supabase 托管）
- **Vercel** 用于部署

## 数据与运行说明

- Prisma schema 位于 [prisma/schema.prisma](./prisma/schema.prisma)
- 首页文案优先读取 [why.md](./why.md)，缺失时回退到 `README.md`
- Prisma 唯一 datasource 为 `postgresql`，通过 `DATABASE_URL` 连接数据库
- 本地主开发路径使用 Docker Postgres，线上通过 `DATABASE_URL` 连接 Supabase Postgres
- 管理员密码与初始邀请码通过环境变量注入

## 本地开发

先启动本地 PostgreSQL：

```bash
docker compose up -d db
```

再在宿主机启动开发服务：

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm dev
```

默认情况下，宿主机通过 `localhost:55432` 连接 Docker 中的 PostgreSQL。

## 本地 Docker 部署

仓库同时提供“应用 + PostgreSQL”一体化本地部署，用于演示或整体验证；它不是默认开发入口。

如果使用默认配置，直接执行：

```bash
docker compose up -d --build
```

应用默认会监听 `http://localhost:30080`，数据库默认会监听 `localhost:55432`，数据库数据持久化在 Docker volume `postgres_data` 中。

如果希望自定义数据库名、账号、管理员密码或邀请码，可以先准备一个 Docker 专用环境文件：

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

常用管理命令：

```bash
docker compose ps
docker compose logs -f web
docker compose down
docker compose down -v
```

- `docker compose down`：停止容器，保留数据库数据
- `docker compose down -v`：连同数据库 volume 一起清空

## 环境变量

最少需要以下变量：

- `DATABASE_URL`
- `COMMUNITY_ADMIN_PASSWORD`
- `COMMUNITY_INVITE_CODES`

本地可以参考 [.env.example](./.env.example)：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:55432/community_hub?schema=public"
COMMUNITY_ADMIN_PASSWORD="admin"
COMMUNITY_INVITE_CODES="WELCOME-2026,NEIGHBOR-2026"
```

Docker 部署时推荐使用 [.env.docker.example](./.env.docker.example) 作为模板，通过 `docker compose --env-file .env.docker up -d --build` 注入变量。
如果你希望把应用映射回宿主机 `3000`，可以设置 `HOST_WEB_PORT=3000`；如果你希望把数据库映射回宿主机 `5432`，可以设置 `HOST_DB_PORT=5432`。前提都是本机对应端口没有被其他服务占用。

## 部署说明

- 在 Vercel 中配置 `DATABASE_URL`、`COMMUNITY_ADMIN_PASSWORD` 和 `COMMUNITY_INVITE_CODES`
- 线上 `DATABASE_URL` 指向 Supabase 提供的 PostgreSQL 连接串；本项目不要求本地接入 Supabase CLI
- 每次 schema 变更后运行 `pnpm db:generate`
- 首次部署到空库时运行 `pnpm db:push`
- 应用启动后如果发现帖子表为空，会自动写入一批演示数据
- 不支持 SQLite / PostgreSQL 双轨，也不提供旧数据库流程兼容层
