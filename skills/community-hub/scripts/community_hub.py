#!/usr/bin/env python3
"""Community Hub Skill CLI.

Reads config.json from the skill bundle, calls the Community Hub Skill HTTP API,
and prints JSON responses.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


VALID_CATEGORIES = ("request", "secondhand", "discussion", "play")
VALID_VISIBILITIES = ("community", "building", "private")
VALID_FILTERS = ("all", "latest", "following", "featured")
VALID_REQUEST_STATUSES = ("open", "processing", "resolved")


def die(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(code)


def load_config() -> tuple[str, str]:
    config_path = Path(__file__).resolve().parents[1] / "config.json"
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        die(f"Missing config.json at {config_path}")
    except json.JSONDecodeError as exc:
        die(f"Invalid config.json: {exc}")

    base = str(config.get("apiBaseUrl", "")).strip().rstrip("/")
    key = str(config.get("apiKey", "")).strip()
    if not base:
        die("config.json apiBaseUrl is required, e.g. https://example.com/api/skill")
    if not key:
        die("config.json apiKey is required")
    return base, key


def request_json(method: str, path: str, body: dict[str, Any] | None = None, query: dict[str, Any] | None = None) -> Any:
    base, key = load_config()
    url = f"{base}{path}"
    if query:
        clean_query = {k: v for k, v in query.items() if v is not None and v != ""}
        if clean_query:
            url = f"{url}?{urllib.parse.urlencode(clean_query)}"

    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"error": raw or exc.reason}
        print(json.dumps({"status": exc.code, **payload}, ensure_ascii=False, indent=2), file=sys.stderr)
        raise SystemExit(1) from exc
    except urllib.error.URLError as exc:
        die(f"Request failed: {exc.reason}")


def print_json(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def cmd_me(_: argparse.Namespace) -> None:
    print_json(request_json("GET", "/me"))


def cmd_posts_list(args: argparse.Namespace) -> None:
    print_json(request_json("GET", "/posts", query={"filter": args.filter, "category": args.category, "requestStatus": args.request_status, "limit": args.limit}))


def cmd_posts_get(args: argparse.Namespace) -> None:
    print_json(request_json("GET", f"/posts/{urllib.parse.quote(args.post_id)}"))


def cmd_posts_create(args: argparse.Namespace) -> None:
    tags = args.tag or []
    if not tags:
        die("At least one --tag is required")
    print_json(request_json("POST", "/posts", {
        "title": args.title,
        "content": args.content,
        "category": args.category,
        "tags": tags,
        "visibility": args.visibility,
        "anonymous": args.anonymous,
        "images": [],
    }))


def cmd_posts_comment(args: argparse.Namespace) -> None:
    print_json(request_json("POST", f"/posts/{urllib.parse.quote(args.post_id)}/comments", {"content": args.content}))


def cmd_posts_favorite(args: argparse.Namespace) -> None:
    print_json(request_json("POST", f"/posts/{urllib.parse.quote(args.post_id)}/favorite", {}))


def cmd_posts_report(args: argparse.Namespace) -> None:
    print_json(request_json("POST", f"/posts/{urllib.parse.quote(args.post_id)}/report", {"reason": args.reason}))


def cmd_polls_list(args: argparse.Namespace) -> None:
    print_json(request_json("GET", "/polls", query={"limit": args.limit}))


def cmd_polls_create(args: argparse.Namespace) -> None:
    if len(args.option or []) < 2:
        die("At least two --option values are required")
    body: dict[str, Any] = {
        "title": args.title,
        "description": args.description,
        "options": args.option,
        "endsAt": args.ends_at,
    }
    print_json(request_json("POST", "/polls", body))


def cmd_polls_vote(args: argparse.Namespace) -> None:
    print_json(request_json("POST", f"/polls/{urllib.parse.quote(args.poll_id)}/vote", {"optionId": args.option_id}))


def cmd_notifications_list(args: argparse.Namespace) -> None:
    print_json(request_json("GET", "/notifications", query={"limit": args.limit, "unreadOnly": "true" if args.unread_only else ""}))


def cmd_notifications_read(args: argparse.Namespace) -> None:
    print_json(request_json("POST", "/notifications", {"ids": args.id} if args.id else {}))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Community Hub Skill CLI")
    sub = parser.add_subparsers(required=True)

    me = sub.add_parser("me", help="Show current Skill user")
    me.set_defaults(func=cmd_me)

    posts = sub.add_parser("posts", help="Post operations")
    posts_sub = posts.add_subparsers(required=True)

    posts_list = posts_sub.add_parser("list", help="List visible posts")
    posts_list.add_argument("--filter", choices=VALID_FILTERS)
    posts_list.add_argument("--category", choices=VALID_CATEGORIES)
    posts_list.add_argument("--request-status", choices=VALID_REQUEST_STATUSES)
    posts_list.add_argument("--limit", type=int, default=10)
    posts_list.set_defaults(func=cmd_posts_list)

    posts_get = posts_sub.add_parser("get", help="Get post details")
    posts_get.add_argument("post_id")
    posts_get.set_defaults(func=cmd_posts_get)

    posts_create = posts_sub.add_parser("create", help="Create a text post")
    posts_create.add_argument("--title", required=True)
    posts_create.add_argument("--content", required=True)
    posts_create.add_argument("--category", required=True, choices=VALID_CATEGORIES)
    posts_create.add_argument("--tag", action="append", default=[])
    posts_create.add_argument("--visibility", default="community", choices=VALID_VISIBILITIES)
    posts_create.add_argument("--anonymous", action="store_true")
    posts_create.set_defaults(func=cmd_posts_create)

    posts_comment = posts_sub.add_parser("comment", help="Add a comment to a post")
    posts_comment.add_argument("post_id")
    posts_comment.add_argument("--content", required=True)
    posts_comment.set_defaults(func=cmd_posts_comment)

    posts_favorite = posts_sub.add_parser("favorite", help="Toggle favorite on a post")
    posts_favorite.add_argument("post_id")
    posts_favorite.set_defaults(func=cmd_posts_favorite)

    posts_report = posts_sub.add_parser("report", help="Report a post")
    posts_report.add_argument("post_id")
    posts_report.add_argument("--reason", default="用户举报")
    posts_report.set_defaults(func=cmd_posts_report)

    polls = sub.add_parser("polls", help="Poll operations")
    polls_sub = polls.add_subparsers(required=True)

    polls_list = polls_sub.add_parser("list", help="List polls")
    polls_list.add_argument("--limit", type=int, default=20)
    polls_list.set_defaults(func=cmd_polls_list)

    polls_create = polls_sub.add_parser("create", help="Create a poll")
    polls_create.add_argument("--title", required=True)
    polls_create.add_argument("--description", required=True)
    polls_create.add_argument("--option", action="append", required=True)
    polls_create.add_argument("--ends-at")
    polls_create.set_defaults(func=cmd_polls_create)

    polls_vote = polls_sub.add_parser("vote", help="Vote in a poll")
    polls_vote.add_argument("poll_id")
    polls_vote.add_argument("--option-id", required=True)
    polls_vote.set_defaults(func=cmd_polls_vote)

    notifications = sub.add_parser("notifications", help="Notification operations")
    notif_sub = notifications.add_subparsers(required=True)

    notif_list = notif_sub.add_parser("list", help="List notifications")
    notif_list.add_argument("--limit", type=int, default=30)
    notif_list.add_argument("--unread-only", action="store_true")
    notif_list.set_defaults(func=cmd_notifications_list)

    notif_read = notif_sub.add_parser("read", help="Mark notifications as read")
    notif_read.add_argument("--id", action="append", help="Notification IDs to mark as read (if omitted, marks all as read)")
    notif_read.set_defaults(func=cmd_notifications_read)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
