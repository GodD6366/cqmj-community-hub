"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CyberPanel, DataList } from "@/components/resident-shared";
import "./globals.css";

export default function GlobalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="site-frame min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <main className="page-shell">
          <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <CyberPanel title="页面暂时打不开" kicker="Runtime Error">
              <DataList
                items={[
                  { label: "错误状态", value: "500" },
                  { label: "错误标识", value: error.digest ?? "未提供" },
                  { label: "恢复建议", hint: "请先尝试重新加载；若持续失败，可返回首页重新进入。" },
                ]}
              />
            </CyberPanel>
            <CyberPanel title="恢复访问" kicker="Recovery">
              <div className="grid gap-3 sm:grid-cols-2">
                <button className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)]" onClick={() => unstable_retry()} type="button">重新加载</button>
                <Link className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)]" href="/">回到首页</Link>
              </div>
            </CyberPanel>
          </section>
        </main>
      </body>
    </html>
  );
}
