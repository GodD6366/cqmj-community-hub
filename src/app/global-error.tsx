"use client";

import Link from "next/link";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="site-frame min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
          <div className="mobile-resident-only mobile-resident-stack">
            <section
              className="mobile-resident-hero mobile-resident-enter text-white"
              style={{
                animationDelay: "40ms",
                background:
                  "radial-gradient(circle at 16% 18%, rgba(237,170,92,0.28), transparent 24%), radial-gradient(circle at 84% 12%, rgba(255,119,149,0.18), transparent 22%), linear-gradient(160deg, #2a1e2a 0%, #4a2742 46%, #6e3450 100%)",
              }}
            >
              <div className="mobile-resident-kicker text-white/72">运行异常</div>
              <h1 className="mobile-resident-title mt-5 max-w-[7ch]">页面暂时打不开</h1>
            </section>

            <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "120ms" }}>
              <div className="mobile-resident-kicker text-[#315d8f]">重试</div>
              <h2 className="mobile-resident-panel-title">重试</h2>
              <div className="mt-4 grid gap-2.5">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-white"
                  onClick={() => unstable_retry()}
                  type="button"
                >
                  重新加载
                </button>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--primary)]"
                  href="/"
                >
                  回到首页
                </Link>
              </div>
            </section>
          </div>

          <div className="hidden md:block space-y-4">
            <section className="hero-aurora rounded-[1.7rem] p-6 text-white sm:p-8">
              <div className="section-kicker text-white/72">运行异常</div>
              <h1 className="editorial-title mt-4 text-3xl font-semibold sm:text-4xl">页面暂时打不开</h1>
            </section>

            <section className="glass-card rounded-[1.5rem] p-6">
              <div className="text-lg font-semibold text-slate-950">重试</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white"
                  onClick={() => unstable_retry()}
                  type="button"
                >
                  重新加载
                </button>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--primary)]"
                  href="/"
                >
                  回到首页
                </Link>
              </div>
              {error.digest ? <div className="mt-4 text-xs text-[var(--muted)]">错误标识：{error.digest}</div> : null}
            </section>
          </div>
        </main>
      </body>
    </html>
  );
}
