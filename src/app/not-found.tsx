import Link from "next/link";
import { CyberPanel, DataList } from "@/components/resident-shared";

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CyberPanel title="页面不存在" kicker="404 / Not Found">
          <DataList
            items={[
              { label: "状态", value: "404" },
              { label: "说明", hint: "目标页面不存在、链接已失效，或该内容已被移除。" },
            ]}
          />
        </CyberPanel>
        <CyberPanel title="返回导航" kicker="Shortcuts">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)]" href="/">回到首页</Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)]" href="/neighbors">进入邻里页</Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)]" href="/services">查看服务</Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)]" href="/me">返回我的</Link>
          </div>
        </CyberPanel>
      </section>
    </main>
  );
}
