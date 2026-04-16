"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCommunityPosts } from "./community-provider";

const navItems = [
  { href: "/posts", label: "帖子" },
  { href: "/publish", label: "发布" },
  { href: "/rules", label: "规则" },
  { href: "/about", label: "关于" },
  { href: "/admin", label: "后台" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const { currentUser, logout } = useCommunityPosts();
  const [loggingOut, setLoggingOut] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
            邻
          </span>
          <div>
            <p className="text-sm font-medium text-slate-500">小区社区网站</p>
            <p className="text-base font-semibold tracking-tight text-slate-900">邻里圈</p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-medium text-slate-600">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-2 transition ${
                  active ? "bg-slate-900 text-white" : "hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {currentUser ? (
            <>
              <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">{currentUser.username} · {currentUser.roomNumber}</span>
              <button
                type="button"
                disabled={loggingOut}
                onClick={async () => {
                  setLoggingOut(true);
                  try {
                    await logout();
                  } finally {
                    setLoggingOut(false);
                  }
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {loggingOut ? "退出中..." : "退出"}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50"
            >
              登录
            </Link>
          )}

          <Link href="/publish" className="ml-1 rounded-full bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700">
            发帖
          </Link>
        </nav>
      </div>
    </header>
  );
}
