import type { Metadata } from "next";
import { CyberPanel, DataList } from "../../components/resident-shared";
import { ReadmeRenderer } from "../../components/readme-renderer";
import { PageShell } from "../../components/ui";
import { getCommunityName } from "../../lib/community-brand";
import { loadProjectDescriptionMarkdown } from "../../lib/project-docs";

const communityName = getCommunityName();

export const metadata: Metadata = {
  title: `项目介绍 | ${communityName}`,
  description: `查看 ${communityName} 项目文档。`,
};

export default async function AboutPage() {
  const markdown = await loadProjectDescriptionMarkdown();
  const contentMarkdown = markdown.replace(/^\s*#\s+.+?\n+/, "");

  return (
    <PageShell className="max-w-[1500px]">
      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CyberPanel title="项目介绍" kicker="About Community Hub">
          <DataList items={[
            { label: "项目定位", hint: "面向小区住户的社区协作平台" },
            { label: "界面方向", hint: "清爽居民 App 风格" },
            { label: "核心能力", hint: "社区动态、服务工单、投票协同、居民消息" },
          ]} />
        </CyberPanel>
        <ReadmeRenderer markdown={contentMarkdown} />
      </section>
    </PageShell>
  );
}
