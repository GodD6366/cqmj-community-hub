import type { Metadata } from "next";
import { ReadmeRenderer } from "../../components/readme-renderer";
import { PageShell } from "../../components/ui";
import { loadProjectDescriptionMarkdown } from "../../lib/project-docs";

export const metadata: Metadata = {
  title: "项目说明 | 邻里圈",
  description: "查看邻里圈项目说明，内容优先来自仓库根目录 why.md。",
};

export default async function AboutPage() {
  const markdown = await loadProjectDescriptionMarkdown();

  return (
    <PageShell className="max-w-5xl py-6">
      <ReadmeRenderer markdown={markdown} />
    </PageShell>
  );
}
