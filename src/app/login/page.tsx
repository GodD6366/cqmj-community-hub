import { Suspense } from "react";
import { Card, Spinner } from "@heroui/react";
import { LoginClient } from "@/components/login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell mx-auto max-w-2xl py-10">
          <Card className="glass-card flex items-center gap-3 p-8 text-sm text-slate-500">
            <Spinner size="sm" />
            正在加载登录页...
          </Card>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
