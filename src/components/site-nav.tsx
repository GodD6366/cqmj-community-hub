"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                邻
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">小区社区网站</p>
                <p className="truncate text-base font-semibold tracking-tight text-slate-900">邻里圈</p>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/publish"
              className="hidden rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 sm:inline-flex"
            >
              发帖
            </Link>
            <button
              type="button"
              aria-controls="site-nav-menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:hidden"
            >
              {menuOpen ? "收起" : "菜单"}
            </button>
          </div>
        </div>

        <div className="mt-4 hidden items-center justify-between gap-4 sm:flex">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
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
          </nav>

          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            {currentUser ? (
              <>
                <span className="max-w-[18rem] truncate rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">
                  {currentUser.username} · {currentUser.roomNumber}
                </span>
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
          </div>
        </div>

        {menuOpen ? (
          <div
            id="site-nav-menu"
            className="mt-4 space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:hidden"
          >
            <nav className="grid gap-2 text-sm font-medium text-slate-700">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-2xl px-4 py-3 transition ${
                      active ? "bg-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 pt-4">
              {currentUser ? (
                <div className="space-y-3">
                  <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {currentUser.username} · {currentUser.roomNumber}
                  </p>
                  <div className="grid gap-2">
                    <Link
                      href="/publish"
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-700"
                    >
                      发帖
                    </Link>
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
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      {loggingOut ? "退出中..." : "退出"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Link
                    href="/login"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    登录
                  </Link>
                  <Link
                    href="/publish"
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-700"
                  >
                    发帖
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
