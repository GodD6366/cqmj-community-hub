---
name: community-hub
description: "当需要通过 Community Hub 社区应用的 Skill HTTP API 执行操作时使用本技能：读取当前用户信息，列出、查看、创建社区帖子，添加评论，收藏或举报帖子，列出或创建投票，并参与投票。当用户要求 AI 助手浏览社区帖子、起草或发布帖子/回复、总结社区动态，或使用随包提供的 config.json 凭据参与 Community Hub 投票时触发。"
---

# Community Hub 技能

## 快速开始

所有 API 调用都使用 `scripts/community_hub.py`。下载后的 Skill 包中包含 `config.json`，其中包括：

- `apiBaseUrl`：以 `/api/skill` 结尾的基础 URL
- `apiKey`：从 Community Hub Skill 连接页面获取的个人 Bearer token

在本技能目录中运行，或使用脚本的绝对路径调用：

```bash
python3 scripts/community_hub.py me
python3 scripts/community_hub.py posts list --limit 10
python3 scripts/community_hub.py posts get <post-id>
python3 scripts/community_hub.py polls list --limit 20
```

## 安全与确认

- 绝不要把 `config.json` 或其中的 `apiKey` 复制到仓库文件、日志、截图或生成物中。
- 创建帖子、评论、举报、投票或提交投票前，必须先向用户确认；除非用户已经明确要求执行该确切动作并给出了具体内容。
- 将帖子、评论、举报、投票标题/说明/选项以及投票行为视为对社区用户可见的操作。
- 如果 API 调用返回错误，报告 API 消息，不要盲目重试会修改数据的操作。

## 常见任务

### 帖子

- 列出帖子：`python3 scripts/community_hub.py posts list --filter latest --category discussion --limit 10`
- 查求助记录：`python3 scripts/community_hub.py posts list --category request --request-status open --limit 10`
- 查看帖子：`python3 scripts/community_hub.py posts get <post-id>`
- 创建文字帖子：
  ```bash
  python3 scripts/community_hub.py posts create \
    --title "标题" \
    --content "正文" \
    --category discussion \
    --tag 交流 --tag 公告 \
    --visibility community
  ```
- 回复帖子：`python3 scripts/community_hub.py posts comment <post-id> --content "回复内容"`
- 切换收藏状态：`python3 scripts/community_hub.py posts favorite <post-id>`
- 举报帖子：`python3 scripts/community_hub.py posts report <post-id> --reason "原因"`

分类：`request`、`secondhand`、`discussion`、`play`。
可见范围：`community`、`building`、`private`。
筛选器：`all`、`latest`、`following`、`featured`。
求助状态 (request-status)：`open`、`processing`、`resolved`。

### 投票

- 列出投票：`python3 scripts/community_hub.py polls list --limit 20`
- 创建投票：
  ```bash
  python3 scripts/community_hub.py polls create \
    --title "投票标题" \
    --description "投票说明" \
    --option "选项 A" --option "选项 B"
  ```
- 参与投票：`python3 scripts/community_hub.py polls vote <poll-id> --option-id <option-id>`

投票前，使用 `polls list` 返回的选项 ID。
