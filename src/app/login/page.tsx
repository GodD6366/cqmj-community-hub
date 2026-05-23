import { Suspense } from "react";
import { Card, Spinner } from "@heroui/react";
import { LoginClient } from "@/components/login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell mx-auto max-w-2xl py-3">
          <div className="mobile-resident-only mobile-resident-stack">
            <section
              className="mobile-resident-hero mobile-resident-enter px-4 pb-1 pt-2 text-white"
              style={{
                animationDelay: "40ms",
                background:
                  "radial-gradient(circle at 16% 18%, rgba(237,170,92,0.3), transparent 24%), radial-gradient(circle at 84% 12%, rgba(96,188,255,0.22), transparent 22%), linear-gradient(160deg, #12192f 0%, #233556 46%, #41558a 100%)",
              }}
            >
              <div className="mobile-resident-kicker text-white/72">居民入口</div>
              <h1 className="mobile-resident-title mt-1 max-w-[6ch] text-[1.38rem]">登录 / 注册</h1>
            </section>

            <section className="mobile-resident-panel mobile-resident-enter -mt-4 px-4 pb-3 pt-2" style={{ animationDelay: "120ms" }}>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Spinner size="sm" />
                加载中
              </div>
            </section>
          </div>

          <Card className="glass-card hidden items-center gap-3 p-8 text-sm text-slate-500 md:flex">
            <Spinner size="sm" />
            加载中
          </Card>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
