---
name: community-hub
description: "Use this skill to operate a Community Hub neighborhood app through its Skill HTTP API: read current user info, list/read/create community posts, add comments, favorite or report posts, list/create polls, and vote in polls. Trigger when users ask an AI assistant to browse neighborhood posts, draft/publish posts or replies, summarize community activity, or participate in Community Hub polls using the bundled config.json credentials."
---

# Community Hub Skill

## Quick start

Use `scripts/community_hub.py` for all API calls. The downloaded Skill bundle includes `config.json` with:

- `apiBaseUrl`: base URL ending in `/api/skill`
- `apiKey`: personal Bearer token from the Community Hub Skill connect page

Run from this skill directory or reference the script by absolute path:

```bash
python3 scripts/community_hub.py me
python3 scripts/community_hub.py posts list --limit 10
python3 scripts/community_hub.py posts get <post-id>
python3 scripts/community_hub.py polls list --limit 20
```

## Safety and confirmation

- Never copy `config.json` or its `apiKey` into repository files, logs, screenshots, or generated artifacts.
- Before creating a post, comment, report, poll, or vote, confirm with the user unless they explicitly requested that exact action and content.
- Treat posts, comments, reports, poll titles/descriptions/options, and votes as user-visible community actions.
- If an API call returns an error, report the API message and do not retry mutating actions blindly.

## Common tasks

### Posts

- List posts: `python3 scripts/community_hub.py posts list --filter latest --category discussion --limit 10`
- Read a post: `python3 scripts/community_hub.py posts get <post-id>`
- Create a text post:
  ```bash
  python3 scripts/community_hub.py posts create \
    --title "标题" \
    --content "正文" \
    --category discussion \
    --tag 交流 --tag 公告 \
    --visibility community
  ```
- Reply to a post: `python3 scripts/community_hub.py posts comment <post-id> --content "回复内容"`
- Toggle favorite: `python3 scripts/community_hub.py posts favorite <post-id>`
- Report a post: `python3 scripts/community_hub.py posts report <post-id> --reason "原因"`

Categories: `request`, `secondhand`, `discussion`, `play`.
Visibility: `community`, `building`, `private`.
Filters: `all`, `latest`, `following`, `featured`.

### Polls

- List polls: `python3 scripts/community_hub.py polls list --limit 20`
- Create a poll:
  ```bash
  python3 scripts/community_hub.py polls create \
    --title "投票标题" \
    --description "投票说明" \
    --option "选项 A" --option "选项 B"
  ```
- Vote: `python3 scripts/community_hub.py polls vote <poll-id> --option-id <option-id>`

Use the option IDs returned by `polls list` before voting.
