# 邻里圈（Community Hub）

面向真实小区住户的社区协作平台原型仓库。

项目愿景、白皮书和非技术说明见 [why.md](./why.md)。
本文件聚焦仓库结构、当前实现、本地开发与部署方式。

## 当前已实现的能力

- 邀请码 + 房号注册绑定
- 用户名密码登录 / 登出
- 自动初始化管理员账号
- 发布需求、闲置、交流、约玩 4 类帖子
- 发布帖子时支持最多 9 张图片上传
- 浏览器压缩图片为 `WebP` 后直传 S3 兼容对象存储
- 帖子列表、搜索、分类筛选、详情浏览
- 评论、收藏、举报
- 楼栋可见 / 全小区可见 / 私密可见
- 社区投票的创建、参与、后台管理
- 服务工单的提交、状态流转、后台管理
- 消息中心与未读/已读处理
- 用户、邀请码、帖子、投票、工单后台
- Community Hub Skill 与个人读写 API key
- 社区规则页、项目说明页、个人中心

## 页面入口

- `/`：社区首页
- `/posts`：帖子广场（支持 `?q=`、`?category=`、`?mode=mine|favorites`）
- `/neighbors`：邻里页
- `/publish`：发布中心
- `/services`：服务工单页
- `/messages`：消息中心
- `/me`：个人中心
- `/login`：登录 / 注册绑定
- `/rules`：社区规则
- `/about`：项目介绍（优先渲染仓库根目录 `why.md`）
- `/admin`：管理员后台
- `/skill/connect`：登录后的 Skill 接入页
- `/api/skill/*`：Skill JSON API
- `/api/skill/bundle`：Community Hub Skill 包下载

## 技术栈

- **Next.js 16** + **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Prisma**
- **PostgreSQL**
- **Coolify + Nixpacks**

## 数据与运行说明

- Prisma schema 位于 [prisma/schema.prisma](./prisma/schema.prisma)
- 项目使用 App Router
- `DATABASE_URL` 为唯一数据库连接入口
- 管理员账号会在首次数据库访问前自动初始化
- `/about` 页面优先读取 [why.md](./why.md)，缺失时回退到 `README.md`
- 生产部署默认使用 Coolify 的 Nixpacks 构建

## 本地开发

推荐使用 Node.js 22 和 pnpm 10 在宿主机直接开发，数据库可使用本地 PostgreSQL 或托管 PostgreSQL。

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
pnpm lint
pnpm build
```

## 环境变量

最少需要以下变量：

- `DATABASE_URL`
- `COMMUNITY_ADMIN_USERNAME`
- `COMMUNITY_ADMIN_PASSWORD`
- `COMMUNITY_INVITE_CODES`
- `SKILL_SIGNING_SECRET`
- `NEXT_PUBLIC_APP_ORIGIN`
- `NEXT_PUBLIC_COMMUNITY_NAME`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`
- `S3_UPLOAD_PREFIX`
- `S3_FORCE_PATH_STYLE`（自定义 S3 / MinIO / 反向代理场景建议设为 `true`）

本地运行参考 [.env.example](./.env.example)：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/community_hub?schema=public"
COMMUNITY_ADMIN_USERNAME="admin"
COMMUNITY_ADMIN_PASSWORD="cqmjadmin"
COMMUNITY_INVITE_CODES="WELCOME-2026,NEIGHBOR-2026"
SKILL_SIGNING_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_COMMUNITY_NAME="汤臣一品"
S3_ENDPOINT="https://<your-s3-endpoint>"
S3_REGION="auto"
S3_BUCKET="community-hub-assets"
S3_ACCESS_KEY_ID="<your-access-key-id>"
S3_SECRET_ACCESS_KEY="<your-secret-access-key>"
S3_PUBLIC_BASE_URL="https://cdn.example.com"
S3_UPLOAD_PREFIX="posts"
S3_FORCE_PATH_STYLE="true"
```

## 内容与可见性规则

### 帖子

- 支持 `request` / `secondhand` / `discussion` / `play`
- 帖子状态支持 `published` / `pending` / `rejected`
- 管理员可在后台修改状态、置顶、精选或删除帖子
- 普通用户可编辑或删除自己的帖子

### 可见范围

- `community`：全小区可见
- `building`：仅同楼栋住户可见
- `private`：仅作者本人和管理员可见

## 图片上传

- 最多上传 `9` 张图片
- 浏览器端压缩为 `WebP`
- 单图压缩后不超过 `2MB`
- 最长边压缩到 `2048px`
- 由服务端签发预上传地址，再直传 S3 兼容对象存储
- 如果站点本身通过 `HTTPS` 对外访问，`S3_ENDPOINT` 与 `S3_PUBLIC_BASE_URL` 也必须提供浏览器可直连的 `HTTPS` 地址
- 帖子列表显示首图缩略图，详情页展示全部图片

## 投票与工单

### 投票

- 登录用户可创建投票
- 住户每个投票仅可参与一次
- 支持截止时间与自动关闭
- 管理员可结束、重新开放或删除投票

### 工单

- 支持报修、投诉建议、保洁环境、公共设施、其他服务
- 登录用户可提交工单
- 管理员可切换 `open / processing / resolved`
- 状态变化会推送到住户消息中心

## 消息中心

当前会汇总以下通知：

- 评论提醒
- 收藏提醒
- 投票动态
- 工单动态
- 系统通知

支持查看未读数量，并一键标记全部已读。

## 管理后台

`/admin` 提供 5 个管理 tab：

- 用户管理：编辑普通用户、禁用/启用、删除
- 邀请码管理：创建、启用/停用、删除
- 帖子管理：改状态、置顶、精选、删除
- 投票管理：查看、结束、重新开放、删除
- 工单管理：切换状态

## Skill 接入

- 登录用户可在 `/skill/connect` 下载包含 `config.json` 的个人 Skill Bundle，并一键复制接入文案
- Skill 名称固定为 `community-hub`，默认调用写法为 `$community-hub`
- Skill Bundle 地址固定为 `/api/skill/bundle`，需登录后下载，包内 `community-hub/config.json` 包含 `apiBaseUrl` 与个人 `apiKey`
- Skill API Base 固定为 `/api/skill`
- 认证方式：`Authorization: Bearer <config.json apiKey>`
- 当前开放常用读写能力：
  - `GET /api/skill/me`
  - `GET /api/skill/posts` / `GET /api/skill/posts/[id]`
  - `POST /api/skill/posts`
  - `POST /api/skill/posts/[id]/comments`
  - `POST /api/skill/posts/[id]/favorite`
  - `POST /api/skill/posts/[id]/report`
  - `GET /api/skill/polls`
  - `POST /api/skill/polls`
  - `POST /api/skill/polls/[id]/vote`

示例请求头：

```http
Authorization: Bearer <config.json apiKey>
Content-Type: application/json
```

旧 `/mcp` 端点已下线并返回 `410 Gone`；旧 `/mcp/connect` 会跳转到 `/skill/connect`。

## Coolify 部署

仓库根目录提供了 [nixpacks.toml](./nixpacks.toml)，Coolify 选择 **Nixpacks** 部署方式即可自动读取：

- Node 版本固定为 `22`
- 构建流程使用项目自带的 `pnpm install` / `pnpm build`
- 启动命令为 `pnpm start:prod`
- 应用启动前会自动执行 `prisma migrate deploy`

建议在 Coolify 中单独创建 PostgreSQL 服务，并把应用的 `DATABASE_URL` 指向该数据库。

部署前至少配置：

- `DATABASE_URL`
- `COMMUNITY_ADMIN_USERNAME`
- `COMMUNITY_ADMIN_PASSWORD`
- `COMMUNITY_INVITE_CODES`
- `SKILL_SIGNING_SECRET`
- 一组完整的 S3 相关环境变量

## 当前明确不做的能力

- 举报后台处置流
- 邻居群 / 群组功能

这两项已不作为当前产品范围的一部分。
