import { describe, expect, it } from "vitest";
import { parseReadmeMarkdown } from "../src/lib/readme";

describe("parseReadmeMarkdown", () => {
  it("parses headings, paragraphs, lists and code blocks", () => {
    const blocks = parseReadmeMarkdown(`
# 邻里圈

一个社区网站。

- 支持发帖
- 支持评论

1. 启动开发容器
2. 启动生产容器

\`\`\`bash
docker compose -f docker-compose.dev.yml up
\`\`\`
`);

    expect(blocks).toEqual([
      { type: "heading", level: 1, text: "邻里圈" },
      { type: "paragraph", text: "一个社区网站。" },
      { type: "unordered-list", items: ["支持发帖", "支持评论"] },
      { type: "ordered-list", items: ["启动开发容器", "启动生产容器"] },
      { type: "code", language: "bash", code: "docker compose -f docker-compose.dev.yml up" },
    ]);
  });

  it("merges wrapped paragraph lines into one block", () => {
    const blocks = parseReadmeMarkdown(`
这一段说明
会被合并成一个段落。
`);

    expect(blocks).toEqual([
      { type: "paragraph", text: "这一段说明 会被合并成一个段落。" },
    ]);
  });
});
