
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ReadmeRenderer } from "../components/readme-renderer";

const fallbackReadme = `# 邻里圈

why.md 和 README.md 暂未找到。请在仓库根目录补充文档，首页会自动渲染它们的内容。`;

async function loadLandingMarkdown() {
  try {
    return await readFile(path.join(process.cwd(), "why.md"), "utf8");
  } catch {
    // Fall through to the technical README when the whitepaper doc is absent.
  }

  try {
    return await readFile(path.join(process.cwd(), "README.md"), "utf8");
  } catch {
    return fallbackReadme;
  }
}

export default async function Home() {
  const markdown = await loadLandingMarkdown();

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <section className="mt-2 sm:mt-6">
        <ReadmeRenderer markdown={markdown} />
      </section>
    </main>
  );
}
