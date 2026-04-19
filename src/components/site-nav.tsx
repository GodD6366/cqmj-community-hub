"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { Avatar, Badge, Button, Chip, Input } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { ButtonLink } from "./ui";
import { SystemLogo } from "./system-logo";

const navItems: Array<{ href: string; label: string; requiresAuth?: boolean }> = [
  { href: "/posts", label: "帖子广场" },
  { href: "/publish", label: "发布中心" },
  { href: "/mcp/connect", label: "AI助手", requiresAuth: true },
  { href: "/rules", label: "社区规则" },
  { href: "/about", label: "项目说明" },
];

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useCommunityPosts();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isLoginPage = pathname === "/login";
  const visibleNavItems = navItems.filter((item) => !item.requiresAuth || currentUser);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    startTransition(() => {
      router.push(query ? `/posts?q=${encodeURIComponent(query)}` : "/posts");
    });
  }

  const accountActions = currentUser ? (
    <>
      {currentUser.role === "admin" ? (
        <ButtonLink href="/admin" size="sm" variant="secondary">
          管理后台
        </ButtonLink>
      ) : null}
      <Badge.Anchor>
        <Avatar className="border-2 border-[var(--border-strong)] bg-[var(--surface)] text-[var(--primary-strong)]" size="sm">
          <Avatar.Fallback>{currentUser.username.slice(0, 1).toUpperCase()}</Avatar.Fallback>
        </Avatar>
        <Badge color="success" placement="bottom-right" size="sm" />
      </Badge.Anchor>
      <Chip color="success" size="sm" variant="soft">
        {currentUser.role === "admin" ? `${currentUser.username} · 管理员` : `${currentUser.username} · ${currentUser.roomNumber}`}
      </Chip>
      <Button
        size="sm"
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
    <ButtonLink href="/login" size="sm" variant="secondary">
      登录
    </ButtonLink>
  ) : null;

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto max-w-[96rem]">
        <div className="topbar-shell px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="min-w-0 shrink-0">
              <SystemLogo className="gap-2.5" markClassName="h-12 w-12" />
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 lg:flex">
              {visibleNavItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-[0.85rem] px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[3px_3px_0_var(--signal)]"
                        : "text-slate-700 hover:bg-[rgba(15,39,66,0.06)]",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <form onSubmit={submitSearch}>
                <Input
                  aria-label="搜索帖子"
                  className="w-[12.5rem] xl:w-[15rem]"
                  placeholder="搜索标题、正文、标签"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </form>
              {!isLoginPage ? (
                <ButtonLink href="/publish" size="sm">
                  发布内容
                </ButtonLink>
              ) : null}
              <div className="flex items-center gap-1.5">{accountActions}</div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              {!isLoginPage ? (
                <ButtonLink href="/publish" size="sm">
                  发布
                </ButtonLink>
              ) : null}
              <Button onPress={() => setMenuOpen((open) => !open)} size="sm" variant="secondary">
                {menuOpen ? "收起" : "菜单"}
              </Button>
            </div>
          </div>

          {menuOpen ? (
            <div className="mobile-drawer grid gap-3 lg:hidden">
              <form onSubmit={submitSearch}>
                <Input
                  aria-label="搜索帖子"
                  fullWidth
                  placeholder="搜索标题、正文、标签"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </form>

              <nav className="grid gap-2">
                {visibleNavItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "rounded-[0.9rem] px-3 py-2.5 text-sm font-semibold transition",
                        active
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[3px_3px_0_var(--signal)]"
                          : "forum-panel text-slate-700",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex flex-wrap items-center gap-2">{accountActions}</div>
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
