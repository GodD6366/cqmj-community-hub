"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Input } from "@heroui/react";
import { useCommunityPosts } from "@/lib/community-store";
import { SystemLogo } from "./system-logo";
import { getCommunityName } from "@/lib/community-brand";
import { InviteIcon, HomeLineIcon, UserLineIcon, LockLineIcon } from "./app-icons";

const communityName = getCommunityName();

type InviteCheckResult =
  | { ok: true; normalizedCode: string; remainingUses: number | null; expiresAt: string | null; note: string | null }
  | { ok: false; normalizedCode: string | null; reason: "empty" | "invalid" | "inactive" | "expired" | "exhausted" };

function getInviteHint(result: InviteCheckResult | null) {
  if (!result) return "";
  if (result.ok) {
    const usage = result.remainingUses === null ? "不限次数" : `剩余 ${result.remainingUses} 次`;
    const expiry = result.expiresAt ? ` · 至 ${new Date(result.expiresAt).toLocaleString("zh-CN")}` : "";
    return `${usage}${expiry}`;
  }
  switch (result.reason) {
    case "empty": return "请输入邀请码。";
    case "invalid": return "邀请码无效。";
    case "inactive": return "邀请码已停用。";
    case "expired": return "邀请码已过期。";
    case "exhausted": return "邀请码次数已用完。";
  }
}

function getPostLoginDestination(nextPath: string, user: { skillTokenVersion: number }) {
  if (nextPath === "/" && user.skillTokenVersion === 0) return "/skill/connect?welcome=1";
  return nextPath;
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);
  const initialMode = searchParams.get("tab") === "register" ? "register" : "login";
  const { login, register, currentUser, logout } = useCommunityPosts();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<InviteCheckResult | null>(null);

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode); setError(""); setMessage("");
  }

  // 邀请码校验
  useEffect(() => {
    if (mode !== "register") return;
    const normalized = inviteCode.trim();
    if (!normalized) { setInviteStatus(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCheckingInvite(true);
      try {
        const response = await fetch(`/api/invite/validate?code=${encodeURIComponent(normalized)}`, { cache: "no-store", signal: controller.signal });
        const data = (await response.json().catch(() => null)) as InviteCheckResult | null;
        if (data) setInviteStatus(data);
      } catch { if (!controller.signal.aborted) setInviteStatus(null); }
      finally { if (!controller.signal.aborted) setCheckingInvite(false); }
    }, 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [inviteCode, mode]);

  async function submit() {
    setSubmitting(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        const user = await login({ username, password });
        setMessage("登录成功，正在进入社区。");
        window.setTimeout(() => router.push(getPostLoginDestination(nextPath, user)), 450);
      } else {
        if (password.length < 6) throw new Error("密码至少需要 6 位");
        const user = await register({ username, password, inviteCode, roomNumber });
        setMessage("注册成功，正在进入社区。");
        window.setTimeout(() => router.push(getPostLoginDestination(nextPath, user)), 450);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "操作失败"); }
    finally { setSubmitting(false); }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); }
    catch (e) { setError(e instanceof Error ? e.message : "退出失败"); }
    finally { setLoggingOut(false); }
  }

  // 已登录状态
  if (currentUser) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <div className="app-panel-strong w-full max-w-sm space-y-6 p-6 text-center">
          <SystemLogo className="justify-center" markClassName="h-16 w-16" showLabel={false} />
          <div>
            <p className="text-sm text-muted-foreground">当前账号</p>
            <h1 className="text-xl font-bold">{currentUser.nickname}</h1>
            <span className="text-sm text-muted-foreground">{currentUser.role === "admin" ? "管理员账号" : currentUser.roomNumber || "未绑定房号"}</span>
          </div>
          {error && <div className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}
          <div className="space-y-2">
            <Button className="min-h-11 w-full font-bold" variant="primary" onPress={() => router.push(nextPath)}>进入页面</Button>
            <Button className="min-h-11 w-full font-bold" variant="secondary" onPress={() => router.push("/")}>返回首页</Button>
            <Button className="min-h-11 w-full" variant="ghost" isPending={loggingOut} onPress={() => { void handleLogout(); }}>退出登录</Button>
          </div>
        </div>
      </div>
    );
  }

  const inviteHint = checkingInvite ? "邀请码校验中..." : inviteStatus ? getInviteHint(inviteStatus) : "请输入社区管理员提供的邀请码";

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="app-panel-strong w-full max-w-sm space-y-6 p-6">
        {/* 品牌 */}
        <div className="text-center">
          <SystemLogo className="justify-center" markClassName="h-16 w-16" showLabel={false} />
          <div className="map-coordinate mx-auto mt-4">居民入口站</div>
          <h1 className="app-display mt-3 text-3xl leading-tight">{communityName}</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">登录后参与动态、工单、投票和邻里互助</p>
        </div>

        {/* 登录/注册切换 */}
        <div className="flex rounded-2xl border border-border bg-white/70 p-1">
          <Button
            className={`min-h-11 flex-1 font-bold ${mode === "login" ? "" : "opacity-60"}`}
            variant={mode === "login" ? "secondary" : "ghost"}
            onPress={() => switchMode("login")}
          >
            登录
          </Button>
          <Button
            className={`min-h-11 flex-1 font-bold ${mode === "register" ? "" : "opacity-60"}`}
            variant={mode === "register" ? "secondary" : "ghost"}
            onPress={() => switchMode("register")}
          >
            注册
          </Button>
        </div>

        {message && <div className="rounded-xl bg-success/10 px-4 py-2 text-sm text-success">{message}</div>}
        {error && <div className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}

        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          {mode === "register" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">邀请码</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <InviteIcon />
                  </span>
                  <Input
                    autoCapitalize="characters"
                    placeholder="输入邀请码"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    fullWidth
                    className="min-w-0 pl-9"
                  />
                </div>
                <p className={`text-xs ${inviteStatus?.ok ? "text-success" : "text-muted-foreground"}`}>{inviteHint}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">房号</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <HomeLineIcon />
                  </span>
                  <Input
                    placeholder="楼栋-单元-房号"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    fullWidth
                    className="min-w-0 pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">例如 1-2-302</p>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">用户名</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <UserLineIcon />
              </span>
              <Input
                autoCapitalize="none"
                placeholder="输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                className="min-w-0 pl-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">密码</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <LockLineIcon />
              </span>
              <Input
                type="password"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                className="min-w-0 pl-9"
              />
            </div>
            {mode === "register" && <p className="text-xs text-muted-foreground">至少 6 位密码</p>}
          </div>

          <Button
            type="submit"
            className="min-h-11 w-full font-bold"
            variant="primary"
            isPending={submitting}
          >
            {submitting ? (mode === "login" ? "登录中..." : "注册中...") : mode === "login" ? "登录" : "注册并进入"}
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground">
          <span>{mode === "login" ? "没有账号？" : "已有账号？"}</span>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold text-primary transition-colors hover:bg-primary/8"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "立即注册" : "去登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
