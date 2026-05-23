import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <div className="mobile-resident-only mobile-resident-stack">
        <section
          className="mobile-resident-hero mobile-resident-enter text-white"
          style={{
            animationDelay: "40ms",
            background:
              "radial-gradient(circle at 16% 18%, rgba(237,170,92,0.28), transparent 24%), radial-gradient(circle at 84% 12%, rgba(140,118,255,0.22), transparent 22%), linear-gradient(160deg, #221f34 0%, #352c54 46%, #4d4477 100%)",
          }}
        >
          <div className="mobile-resident-kicker text-white/72">未找到</div>
          <h1 className="mobile-resident-title mt-5 max-w-[7ch]">页面不存在</h1>
        </section>

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "120ms" }}>
          <div className="mobile-resident-kicker text-[#315d8f]">返回</div>
          <h2 className="mobile-resident-panel-title">回到常用入口</h2>
          <div className="mt-4 grid gap-2.5">
            <Link className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-white" href="/">
              回到首页
            </Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--primary)]" href="/neighbors">
              去邻里页
            </Link>
          </div>
        </section>
      </div>

      <div className="hidden md:block space-y-4">
        <section className="hero-aurora rounded-[1.7rem] p-6 text-white sm:p-8">
          <div className="section-kicker text-white/72">未找到</div>
          <h1 className="editorial-title mt-4 text-3xl font-semibold sm:text-4xl">页面不存在</h1>
        </section>

        <section className="glass-card rounded-[1.5rem] p-6">
          <div className="text-lg font-semibold text-slate-950">回到常用入口</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white" href="/">
              回到首页
            </Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--primary)]" href="/neighbors">
              去邻里页
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
