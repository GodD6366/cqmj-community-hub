# 邻里圈（Community Hub）

面向真实小区住户的社区协作平台原型仓库。

项目愿景、白皮书和非技术说明已移到 [why.md](./why.md)。
本文件聚焦仓库结构、当前实现和 Docker 部署方式。

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
- **Docker Compose**

## 数据与运行说明

- Prisma schema 位于 [prisma/schema.prisma](./prisma/schema.prisma)
- 首页文案优先读取 [why.md](./why.md)，缺失时回退到 `README.md`
- Prisma 唯一 datasource 为 `postgresql`，通过 `DATABASE_URL` 连接数据库
- 开发与生产都以本地 Docker 作为标准部署方式
- 管理员密码与初始邀请码通过环境变量注入

## 开发环境 Docker

开发环境会启动 `web` + `db` 两个容器，并挂载本地源码目录，适合热更新和日常开发。

首次使用先准备环境文件：

```bash
cp .env.docker.dev.example .env.docker.dev
```

启动开发容器：

```bash
docker compose -f docker-compose.dev.yml --env-file .env.docker.dev up --build
```

或直接使用脚本：

```bash
pnpm docker:dev
```

默认访问地址：

- 应用：`http://localhost:3000`
- 数据库：`localhost:55432`

常用命令：

```bash
docker compose -f docker-compose.dev.yml --env-file .env.docker.dev down
docker compose -f docker-compose.dev.yml --env-file .env.docker.dev logs -f web
```

开发容器启动时会自动执行：

- `pnpm install`
- `pnpm prisma generate`
- `pnpm prisma db push`
- `pnpm dev --hostname 0.0.0.0 --port 3000`

## 生产环境 Docker

生产环境会先构建镜像，再启动 `web` + `db` 容器，适合本机演示、局域网部署或自托管服务器部署。

默认情况下，生产环境会避开开发环境端口，方便两套同时运行：

- 应用：`http://localhost:3001`
- 数据库：`localhost:55433`

先准备生产环境文件：

```bash
cp .env.docker.prod.example .env.docker.prod
```

启动生产容器：

```bash
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d --build
```

或直接使用脚本：

```bash
pnpm docker:prod
```

常用命令：

```bash
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod ps
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod logs -f web
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod down
```

生产容器启动时会自动执行：

- `pnpm db:migrate:deploy`
- `pnpm start`

## 环境变量

最少需要以下变量：

- `DATABASE_URL`
- `COMMUNITY_ADMIN_PASSWORD`
- `COMMUNITY_INVITE_CODES`

如果不走 Docker，也可以参考 [.env.example](./.env.example) 在宿主机本地运行：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:55432/community_hub?schema=public"
COMMUNITY_ADMIN_PASSWORD="admin"
COMMUNITY_INVITE_CODES="WELCOME-2026,NEIGHBOR-2026"
```

Docker 运行时推荐分别使用：

- 开发模板：[.env.docker.dev.example](./.env.docker.dev.example)
- 生产模板：[.env.docker.prod.example](./.env.docker.prod.example)

旧的 [.env.docker.example](./.env.docker.example) 仍可作为通用模板，但更推荐按环境拆分配置。

## 部署说明

- 项目已提交 Prisma migrations
- 生产镜像构建阶段只执行 `next build`
- 数据库迁移改为在生产容器启动时执行 `prisma migrate deploy`
- 开发环境使用 `prisma db push`，避免每次开发都依赖完整迁移流程
- 应用启动后如果发现帖子表为空，会自动写入一批演示数据
- 如果需要反向代理，建议在 Next.js 容器前增加 Nginx 或 Caddy
