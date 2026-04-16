"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useCommunityPosts } from "./community-provider";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);
  const { login, currentUser } = useCommunityPosts();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (mode === "login") {
        await login({ username, password });
        setMessage("登录成功，正在跳转...");
      } else {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username, password, inviteCode, roomNumber }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "注册失败");
        }
        setMessage("注册并绑定成功，正在跳转...");
      }
      window.setTimeout(() => router.push(nextPath), 500);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (currentUser) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">当前已登录</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{currentUser.username}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">房号：{currentUser.roomNumber}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={nextPath} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              继续前往
            </Link>
            <Link href="/" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
              返回首页
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex gap-2 rounded-full bg-slate-100 p-1 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full px-4 py-2 transition ${mode === "login" ? "bg-white text-slate-900 shadow" : ""}`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-full px-4 py-2 transition ${mode === "register" ? "bg-white text-slate-900 shadow" : ""}`}
          >
            注册绑定
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-500">{mode === "login" ? "欢迎回来" : "首次加入社区"}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
            {mode === "login" ? "用户名 + 密码登录" : "邀请码 + 房号完成注册"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {mode === "login"
              ? "使用你已经绑定好的用户名和密码登录。"
              : "注册时需要邀请码和房号，邀请码由后台配置，房号用于绑定你的住户身份。"}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>用户名</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="例如：godd"
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="至少 6 位"
            />
          </label>

          {mode === "register" ? (
            <>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>邀请码</span>
                <input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="输入管理员发放的邀请码"
                />
              </label>

              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>房号</span>
                <input
                  value={roomNumber}
                  onChange={(event) => setRoomNumber(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="例如：1-905"
                />
              </label>
            </>
          ) : null}
        </div>

        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "处理中..." : mode === "login" ? "登录" : "注册并绑定"}
          </button>
          <Link href="/" className="text-sm font-medium text-slate-600 underline underline-offset-4">
            先逛逛首页
          </Link>
        </div>
      </div>
    </main>
  );
}
