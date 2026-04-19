# 邻里圈（Community Hub）

面向真实小区住户的社区协作平台原型仓库。

项目愿景、白皮书和非技术说明已移到 [why.md](./why.md)。
本文件聚焦仓库结构、当前实现和本地开发 / Coolify 部署方式。

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
- `/mcp/connect`：登录后的 MCP 接入页
- `/login`：登录 / 注册绑定
- `/rules`：社区规则
- `/about`：项目介绍
- `/admin`：邀请码管理后台
- `/mcp`：MCP HTTP 端点

## 技术栈

- **Next.js 16** + **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Prisma**
- **PostgreSQL**
- **Coolify + Nixpacks**

## 数据与运行说明

- Prisma schema 位于 [prisma/schema.prisma](./prisma/schema.prisma)
- 首页文案优先读取 [why.md](./why.md)，缺失时回退到 `README.md`
- Prisma 唯一 datasource 为 `postgresql`，通过 `DATABASE_URL` 连接数据库
- 本地开发默认直接使用 Node.js + pnpm
- 生产部署默认使用 Coolify 的 Nixpacks 构建
- 默认管理员账号与初始邀请码通过环境变量注入

## 本地开发

推荐使用 Node.js 22 和 pnpm 10 直接在宿主机开发，数据库可使用本地 PostgreSQL 或单独托管的 PostgreSQL 实例。

先准备环境文件：

```bash
cp .env.example .env.local
```

安装依赖：

```bash
pnpm install
```

首次初始化数据库：

```bash
pnpm db:push
```

启动开发服务器：

```bash
pnpm dev
```

默认访问地址为 `http://localhost:3000`。

开发过程中常用命令：

```bash
pnpm db:generate
pnpm db:push
pnpm test
```

## Coolify 部署

仓库根目录提供了 [nixpacks.toml](./nixpacks.toml)，Coolify 选择 **Nixpacks** 部署方式即可自动读取：

- Node 版本固定为 `22`
- 构建流程使用项目自带的 `pnpm install` / `pnpm build`
- 启动命令为 `pnpm start:prod`
- 应用启动前会自动执行 `prisma migrate deploy`

在 Coolify 中建议额外创建一个 PostgreSQL 服务，并把应用的 `DATABASE_URL` 指向该数据库。

部署前至少配置以下环境变量：

- `DATABASE_URL`
- `COMMUNITY_ADMIN_USERNAME`
- `COMMUNITY_ADMIN_PASSWORD`
- `COMMUNITY_INVITE_CODES`

如果 Coolify 没有自动识别包管理器，可手动确认使用 `pnpm`。

## 环境变量

最少需要以下变量：

- `DATABASE_URL`
- `COMMUNITY_ADMIN_USERNAME`
- `COMMUNITY_ADMIN_PASSWORD`
- `COMMUNITY_INVITE_CODES`
- `MCP_SIGNING_SECRET`

默认管理员会在首次数据库访问前自动初始化：

- 用户名默认 `admin`
- 密码默认 `cqmjadmin`
- 管理员统一通过 `/login` 登录，然后访问 `/admin`

本地运行可以参考 [.env.example](./.env.example)：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/community_hub?schema=public"
COMMUNITY_ADMIN_USERNAME="admin"
COMMUNITY_ADMIN_PASSWORD="cqmjadmin"
COMMUNITY_INVITE_CODES="WELCOME-2026,NEIGHBOR-2026"
MCP_SIGNING_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_ORIGIN="http://localhost:3000"
```

## MCP 接入

- MCP HTTP 端点固定为 `/mcp`
- 登录用户可在 `/mcp/connect` 查看自己的个人 API key，并一键复制接入文案
- 认证方式为 `Authorization: Bearer <API_KEY>`
- 当前只开放只读工具：
  - `community.current_user`
  - `community.list_posts`
  - `community.get_post`

接入页会直接生成一段中文说明，适合粘贴到支持 MCP 的平台或模型客户端。也可以按标准 MCP HTTP 方式自行接入：

1. 调用 `POST /mcp`
2. 先发送 `initialize`
3. 再调用 `tools/list` 和 `tools/call`

示例请求头：

```http
Authorization: Bearer <your-api-key>
Content-Type: application/json
```

## 部署说明

- 项目已提交 Prisma migrations
- Nixpacks 构建阶段执行 `next build`
- 应用启动阶段执行 `prisma migrate deploy`，随后启动 Next.js 服务
- 应用默认监听 `0.0.0.0`，端口使用平台注入的 `PORT`
- 应用启动后如果发现帖子表为空，会自动写入一批演示数据
- 如果需要反向代理，可继续在 Coolify 前面挂 Nginx 或 Caddy
