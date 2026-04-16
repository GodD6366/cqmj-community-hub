import { Suspense } from "react";
import { LoginClient } from "@/components/login-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8"><div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">正在加载登录页...</div></main>}>
      <LoginClient />
    </Suspense>
  );
}
