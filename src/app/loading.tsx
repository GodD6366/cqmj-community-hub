export default function Loading() {
  return (
    <main className="page-shell space-y-4 pt-2 md:space-y-6 md:pt-4">
      <div className="mobile-resident-only mobile-resident-stack">
        <section
          className="mobile-resident-hero mobile-resident-enter text-white"
          style={{
            animationDelay: "40ms",
            background:
              "radial-gradient(circle at 16% 18%, rgba(237,170,92,0.28), transparent 24%), radial-gradient(circle at 84% 12%, rgba(96,188,255,0.22), transparent 22%), linear-gradient(160deg, #1a2035 0%, #274166 46%, #335987 100%)",
          }}
        >
          <div className="mobile-resident-kicker text-white/72">加载中</div>
          <h1 className="mobile-resident-title mt-5 max-w-[6ch]">页面加载中</h1>
        </section>

        <section className="mobile-resident-panel mobile-resident-enter" style={{ animationDelay: "120ms" }}>
          <div className="h-12 animate-pulse rounded-[1rem] bg-[var(--surface-muted)]" />
          <div className="mt-3 h-12 animate-pulse rounded-[1rem] bg-[var(--surface-muted)]" />
          <div className="mt-3 h-32 animate-pulse rounded-[1.2rem] bg-[var(--surface-muted)]" />
        </section>
      </div>

      <div className="hidden md:block space-y-4">
        <section className="hero-aurora rounded-[1.7rem] p-6 text-white sm:p-8">
          <div className="section-kicker text-white/72">加载中</div>
          <div className="mt-4 h-14 w-72 animate-pulse rounded-[1rem] bg-white/10" />
          <div className="mt-4 h-6 w-96 animate-pulse rounded-full bg-white/10" />
        </section>

        <section className="glass-card rounded-[1.5rem] p-6">
          <div className="h-14 animate-pulse rounded-[1rem] bg-[var(--surface-muted)]" />
          <div className="mt-4 h-14 animate-pulse rounded-[1rem] bg-[var(--surface-muted)]" />
          <div className="mt-4 h-40 animate-pulse rounded-[1.25rem] bg-[var(--surface-muted)]" />
        </section>
      </div>
    </main>
  );
}
