import { readFile } from "node:fs/promises";
import path from "node:path";

const FALLBACK_MARKDOWN = `# 项目说明

当前仓库暂未提供 \`why.md\` 或 \`README.md\` 内容，请稍后补充项目说明文档。`;

const PROJECT_DOC_CANDIDATES = ["why.md", "README.md"] as const;

export async function loadProjectDescriptionMarkdown() {
  for (const fileName of PROJECT_DOC_CANDIDATES) {
    const filePath = path.join(process.cwd(), fileName);

    try {
      const markdown = await readFile(filePath, "utf8");

      if (markdown.trim()) {
        return markdown;
      }
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }
  }

  return FALLBACK_MARKDOWN;
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
