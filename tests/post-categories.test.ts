import { describe, expect, it } from "vitest";
import { filterPosts, getPostBadge } from "../src/lib/utils";
import { isPostCategory, parsePostCategoryFilter } from "../src/lib/types";
import type { CommunityPost } from "../src/lib/types";

const basePost: CommunityPost = {
  id: "post-play-test",
  title: "约玩：今晚广场散步",
  content: "饭后散步，欢迎一起。",
  category: "play",
  tags: ["散步", "夜跑"],
  authorName: "测试住户",
  createdAt: "2026-04-17T12:00:00.000Z",
  updatedAt: "2026-04-17T12:00:00.000Z",
  commentCount: 0,
  favoriteCount: 0,
  visibility: "community",
  status: "published",
  comments: [],
};

describe("post categories", () => {
  it('filters play posts correctly', () => {
    const posts: CommunityPost[] = [
      basePost,
      {
        ...basePost,
        id: "post-request-test",
        title: "求助：找保洁",
        category: "request",
      },
    ];

    expect(filterPosts(posts, { category: "play", query: "" })).toEqual([basePost]);
  });

  it('returns the correct badge for play posts', () => {
    expect(getPostBadge("play")).toBe("约玩");
  });

  it('accepts play in category parsing and falls back invalid values to all', () => {
    expect(isPostCategory("play")).toBe(true);
    expect(parsePostCategoryFilter("play")).toBe("play");
    expect(parsePostCategoryFilter("unknown")).toBe("all");
  });
});
