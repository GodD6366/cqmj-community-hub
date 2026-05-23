import type { Metadata } from "next";
import { ReadmeRenderer } from "../../components/readme-renderer";
import { PageShell } from "../../components/ui";
import { loadProjectDescriptionMarkdown } from "../../lib/project-docs";

export const metadata: Metadata = {
  title: "项目介绍 | 邻里圈",
  description: "查看邻里圈项目文档。",
};

export default async function AboutPage() {
  const markdown = await loadProjectDescriptionMarkdown();
  const contentMarkdown = markdown.replace(/^\s*#\s+.+?\n+/, "");

  return (
    <PageShell className="max-w-5xl py-6">
      <div className="mobile-resident-only mobile-resident-stack">
        <section
          className="mobile-resident-hero mobile-resident-enter text-white"
          style={{
            animationDelay: "40ms",
            background:
              "radial-gradient(circle at 16% 18%, rgba(237,170,92,0.28), transparent 24%), radial-gradient(circle at 84% 12%, rgba(96,188,255,0.22), transparent 22%), linear-gradient(160deg, #1a2035 0%, #274166 46%, #335987 100%)",
          }}
        >
          <div className="mobile-resident-kicker text-white/72">项目介绍</div>
          <h1 className="mobile-resident-title mt-5 max-w-[8ch]">项目介绍</h1>
        </section>
      </div>

      <section className="hero-aurora hidden rounded-[1.7rem] p-6 text-white sm:p-8 md:block">
        <div className="section-kicker text-white/72">项目介绍</div>
        <h1 className="editorial-title mt-4 text-3xl font-semibold sm:text-4xl">项目介绍</h1>
      </section>

      <div className="mt-4 md:mt-6">
        <ReadmeRenderer markdown={contentMarkdown} />
      </div>
    </PageShell>
  );
}
