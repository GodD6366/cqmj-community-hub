"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Badge, Button, Chip } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { ButtonLink } from "./ui";
import { SystemLogo } from "./system-logo";

const navItems = [
  { href: "/posts", label: "帖子广场", index: "01" },
  { href: "/publish", label: "发布中心", index: "02" },
  { href: "/rules", label: "社区规则", index: "03" },
  { href: "/about", label: "项目说明", index: "04" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const { currentUser, logout } = useCommunityPosts();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto max-w-7xl">
        <div className="glass-card px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Link href="/" className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <SystemLogo />
              </div>
            </Link>

            <div className="flex items-center gap-2 text-white">
              {!isLoginPage ? (
                <ButtonLink href="/publish" className="hidden sm:inline-flex">
                  发布内容
                </ButtonLink>
              ) : null}
              <Button className="sm:hidden" onPress={() => setMenuOpen((open) => !open)} variant="secondary">
                {menuOpen ? "收起" : "菜单"}
              </Button>
            </div>
          </div>

          <div className="mt-4 hidden gap-4 border-t border-[var(--separator)] pt-4 sm:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <nav className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "route-card grid gap-1 px-3 py-3 transition hover:-translate-y-[1px]",
                      active ? "bg-[var(--primary)] text-white" : "bg-[rgba(255,250,241,0.9)]",
                    )}
                  >
                    <span className={cn("text-[11px] font-bold tracking-[0.24em] uppercase", active ? "text-white/68" : "text-slate-500")}>
                      {item.index}
                    </span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              {currentUser ? (
                <>
                  {currentUser.role === "admin" ? (
                    <ButtonLink href="/admin" variant="secondary">
                      管理后台
                    </ButtonLink>
                  ) : null}
                  <Badge.Anchor>
                    <Avatar className="border-2 border-[var(--border-strong)] bg-[var(--signal)] text-[var(--primary-strong)]" size="md">
                      <Avatar.Fallback>{currentUser.username.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                    </Avatar>
                    <Badge color="success" placement="bottom-right" size="sm" />
                  </Badge.Anchor>
                  <Chip color="success" variant="soft">
                    {currentUser.role === "admin"
                      ? `${currentUser.username} · 管理员`
                      : `${currentUser.username} · ${currentUser.roomNumber}`}
                  </Chip>
                  <Button
                    isPending={loggingOut}
                    onPress={async () => {
                      setLoggingOut(true);
                      try {
                        await logout();
                      } finally {
                        setLoggingOut(false);
                      }
                    }}
                    variant="secondary"
                  >
                    {loggingOut ? "退出中..." : "退出"}
                  </Button>
                </>
              ) : !isLoginPage ? (
                <ButtonLink href="/login" variant="secondary">
                  登录
                </ButtonLink>
              ) : null}
            </div>
          </div>

          {menuOpen ? (
            <div className="mt-4 grid gap-3 border-t border-[var(--separator)] pt-4 sm:hidden">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <ButtonLink key={item.href} href={item.href} variant={active ? "primary" : "secondary"}>
                    {item.index} · {item.label}
                  </ButtonLink>
                );
              })}
              {currentUser ? (
                <>
                  {currentUser.role === "admin" ? (
                    <ButtonLink href="/admin" variant="secondary">
                      管理后台
                    </ButtonLink>
                  ) : null}
                  <Button
                    isPending={loggingOut}
                    onPress={async () => {
                      setLoggingOut(true);
                      try {
                        await logout();
                      } finally {
                        setLoggingOut(false);
                      }
                    }}
                    variant="secondary"
                  >
                    {loggingOut ? "退出中..." : "退出"}
                  </Button>
                </>
              ) : !isLoginPage ? (
                <ButtonLink href="/login" variant="secondary">
                  登录
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
