import type { Metadata } from "next";
import { getCommunityName } from "@/lib/community-brand";
import { loadProjectDescriptionMarkdown } from "@/lib/project-docs";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { BuildingIcon, MessagesIcon, ServiceIcon, ShieldIcon } from "@/components/app-icons";

const communityName = getCommunityName();

const highlights = [
  {
    title: "项目定位",
    description: "面向小区住户的社区协作平台，围绕真实邻里关系降低沟通成本。",
    icon: BuildingIcon,
  },
  {
    title: "界面方向",
    description: "清爽居民 App 风格，信息密度适中，移动端优先。",
    icon: ShieldIcon,
  },
  {
    title: "核心能力",
    description: "社区动态、服务工单、技能互助、投票协同和居民消息。",
    icon: ServiceIcon,
  },
] as const;

export const metadata: Metadata = {
  title: `项目介绍 | ${communityName}`,
  description: `查看 ${communityName} 项目文档。`,
};

export default async function AboutPage() {
  const markdown = await loadProjectDescriptionMarkdown();
  const contentMarkdown = markdown.replace(/^\s*#\s+.+?\n+/, "");

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6 lg:p-8">
      <section className="app-panel-strong overflow-hidden p-5 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="section-kicker">PROJECT OVERVIEW</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight md:text-4xl">项目介绍</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              {communityName} 把邻里求助、公共事务和本地服务放在同一个轻量工作台里，让居民能更快找到人、说清事、追踪结果。
            </p>
          </div>
          <div className="rounded-[var(--radius-panel)] border border-primary/15 bg-primary/8 p-4">
            <div className="flex items-center gap-3">
              <span className="app-logo-mark">
                <MessagesIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black">居民协作中枢</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">动态、工单、互助和消息保持同一套体验。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="app-panel p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-black">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="app-panel p-5 md:p-7">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">DOCUMENTATION</p>
            <h2 className="mt-1 text-xl font-black">项目文档</h2>
          </div>
          <p className="text-sm text-muted-foreground">来源于本地项目说明，已按页面阅读体验排版。</p>
        </div>
        <MarkdownRenderer content={contentMarkdown} />
      </section>
    </main>
  );
}
