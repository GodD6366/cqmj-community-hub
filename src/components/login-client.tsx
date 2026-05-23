"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Chip, Input } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { ButtonLink, PageShell } from "./ui";
import { ResidentMobileHero, ResidentMobilePanel } from "./resident-shared";
import { SystemLogo } from "./system-logo";

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
    case "empty":
      return "请输入邀请码。";
    case "invalid":
      return "邀请码无效。";
    case "inactive":
      return "邀请码已停用。";
    case "expired":
      return "邀请码已过期。";
    case "exhausted":
      return "邀请码次数已用完。";
  }
}

function getPostLoginDestination(nextPath: string, user: { mcpTokenVersion: number }) {
  if (nextPath === "/" && user.mcpTokenVersion === 0) {
    return "/mcp/connect?welcome=1";
  }

  return nextPath;
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);
  const { login, register, currentUser } = useCommunityPosts();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<InviteCheckResult | null>(null);
  const desktopSteps = mode === "login" ? ["输入账号", "验证身份", "进入社区"] : ["邀请码", "绑定房号", "完成注册"];

  useEffect(() => {
    if (mode !== "register") return;
    const normalized = inviteCode.trim();
    if (!normalized) {
      setInviteStatus(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCheckingInvite(true);
      try {
        const response = await fetch(`/api/invite/validate?code=${encodeURIComponent(normalized)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as InviteCheckResult | null;
        if (data) {
          setInviteStatus(data);
        }
      } catch {
        if (!controller.signal.aborted) {
          setInviteStatus(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCheckingInvite(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [inviteCode, mode]);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (mode === "login") {
        const user = await login({ username, password });
        setMessage("登录成功，正在跳转...");
        window.setTimeout(() => router.push(getPostLoginDestination(nextPath, user)), 500);
      } else {
        if (password.length < 6) {
          throw new Error("密码至少需要 6 位");
        }
        if (password !== confirmPassword) {
          throw new Error("两次输入的密码不一致");
        }
        const user = await register({ username, password, inviteCode, roomNumber });
        setMessage("注册并绑定成功，正在跳转...");
        window.setTimeout(() => router.push(getPostLoginDestination(nextPath, user)), 500);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (currentUser) {
    return (
      <PageShell className="max-w-3xl py-6">
        <div className="mobile-resident-only mobile-resident-stack">
          <ResidentMobileHero
            background="radial-gradient(circle at 16% 18%, rgba(237,170,92,0.3), transparent 24%), radial-gradient(circle at 84% 12%, rgba(94,190,255,0.22), transparent 22%), linear-gradient(160deg, #1c1c2f 0%, #31355f 46%, #515691 100%)"
            className="px-4 py-4"
          >
            <div className="mobile-resident-kicker text-white/72">居民入口</div>
            <h1 className="mobile-resident-title mt-3 max-w-[6ch] text-[1.7rem]">已登录</h1>
            <p className="mobile-resident-copy mt-3 max-w-[28ch] text-white/76">
              {currentUser.role === "admin" ? "管理员账号" : currentUser.roomNumber || "未绑定房号"}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {[
                { label: "用户名", value: currentUser.username },
                { label: "角色", value: currentUser.role === "admin" ? "管理员" : "住户" },
              ].map((item) => (
                <div key={item.label} className="mobile-resident-metric bg-white/10 ring-1 ring-white/10 backdrop-blur-sm">
                  <div className="mobile-resident-metric-label text-white/58">{item.label}</div>
                  <div className="mobile-resident-metric-value text-white text-[1rem]">{item.value}</div>
                </div>
              ))}
            </div>
          </ResidentMobileHero>

          <ResidentMobilePanel delay="120ms">
            <div className="mobile-resident-kicker text-[#315d8f]">入口</div>
            <h2 className="mobile-resident-panel-title">继续访问</h2>

            <div className="mt-4 grid gap-2.5">
              <ButtonLink href={nextPath}>进入页面</ButtonLink>
              <ButtonLink href="/" variant="secondary">
                返回首页
              </ButtonLink>
            </div>
          </ResidentMobilePanel>
        </div>

        <div className="hidden md:block">
          <Card className="glass-card p-6 sm:p-8">
            <Card.Header className="p-0">
              <div>
                <p className="section-kicker">已登录</p>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{currentUser.username}</h1>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {currentUser.role === "admin"
                    ? "角色：管理员"
                    : `房号：${currentUser.roomNumber || "未绑定"}`}
                </p>
              </div>
            </Card.Header>
            <Card.Content className="flex flex-col gap-3 p-0 pt-6 sm:flex-row">
              <ButtonLink href={nextPath}>进入页面</ButtonLink>
              <ButtonLink href="/" variant="secondary">
                返回首页
              </ButtonLink>
            </Card.Content>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-6xl pt-0">
      <div className="mobile-resident-only mobile-resident-stack">
        <ResidentMobileHero
          className="px-4 pb-0 pt-2.5"
          background="radial-gradient(circle at 16% 18%, rgba(237,170,92,0.3), transparent 24%), radial-gradient(circle at 84% 12%, rgba(96,188,255,0.22), transparent 22%), linear-gradient(160deg, #12192f 0%, #233556 46%, #41558a 100%)"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="mobile-resident-kicker text-white/72">居民入口</div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.68rem] font-semibold text-white/80 ring-1 ring-white/10">
              {mode === "login" ? "登录" : "注册"}
            </span>
          </div>
          <h1 className="mobile-resident-title mt-2 max-w-none text-[1.26rem] whitespace-nowrap">{mode === "login" ? "账号登录" : "邀请码注册"}</h1>
        </ResidentMobileHero>

        <ResidentMobilePanel className="-mt-5 px-4 pb-3 pt-3" delay="120ms">
          <div className="flex flex-row gap-1.5 rounded-[1rem] bg-[var(--surface-muted)] p-1.25">
            <Button
              className={mode === "login" ? "min-h-9 flex-1 bg-white text-slate-950 shadow-none" : "min-h-9 flex-1 border-transparent bg-transparent text-slate-600 shadow-none"}
              onPress={() => setMode("login")}
              variant="secondary"
            >
              登录
            </Button>
            <Button
              className={mode === "register" ? "min-h-9 flex-1 bg-white text-slate-950 shadow-none" : "min-h-9 flex-1 border-transparent bg-transparent text-slate-600 shadow-none"}
              onPress={() => setMode("register")}
              variant="secondary"
            >
              注册
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            <label className="block space-y-1.5 text-[0.82rem] font-semibold text-slate-800">
              <span>用户名</span>
              <Input
                aria-label="用户名"
                fullWidth
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="例如：godd"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>

            <label className="block space-y-1.5 text-[0.82rem] font-semibold text-slate-800">
              <span>密码</span>
              <Input
                aria-label="密码"
                fullWidth
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
              />
            </label>

            {mode === "register" ? (
              <>
                <label className="block space-y-1.5 text-[0.82rem] font-semibold text-slate-800">
                  <span>确认密码</span>
                  <Input
                    aria-label="确认密码"
                    fullWidth
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="再次输入密码"
                  />
                </label>

                <label className="block space-y-1.5 text-[0.82rem] font-semibold text-slate-800">
                  <span>邀请码</span>
                  <Input
                    aria-label="邀请码"
                    className={inviteStatus?.ok ? "border-emerald-300/80 bg-emerald-50/70" : undefined}
                    fullWidth
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="邀请码"
                    autoCapitalize="characters"
                    autoCorrect="off"
                  />
                  {checkingInvite || inviteStatus ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {inviteStatus?.ok ? <Chip color="success" size="sm" variant="soft">可用</Chip> : null}
                      {inviteStatus && !inviteStatus.ok ? <Chip color="danger" size="sm" variant="soft">不可用</Chip> : null}
                      <p className={`text-[0.72rem] leading-5 ${inviteStatus?.ok ? "text-[var(--success)]" : inviteStatus && !inviteStatus.ok ? "text-[var(--danger)]" : "text-slate-500"}`}>
                        {checkingInvite ? "校验中..." : getInviteHint(inviteStatus)}
                      </p>
                    </div>
                  ) : null}
                </label>

                <label className="block space-y-1.5 text-[0.82rem] font-semibold text-slate-800">
                  <span>房号</span>
                  <Input
                    aria-label="房号"
                    fullWidth
                    value={roomNumber}
                    onChange={(event) => setRoomNumber(event.target.value)}
                    placeholder="1-905"
                    autoCapitalize="none"
                  />
                </label>
              </>
            ) : null}
          </div>

          {message ? (
            <Alert className="mt-3" status="success">
              <Alert.Content>
                <Alert.Description>{message}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
          {error ? (
            <Alert className="mt-3" status="danger">
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <div className="mt-3 grid gap-2">
            <Button
              isPending={submitting}
              onPress={submit}
              isDisabled={mode === "register" && inviteStatus !== null && !inviteStatus.ok}
            >
              {submitting ? "处理中..." : mode === "login" ? "进入社区" : "完成绑定"}
            </Button>
            <ButtonLink href="/" variant="secondary">
              返回首页
            </ButtonLink>
          </div>
        </ResidentMobilePanel>
      </div>

      <div className="hidden md:grid gap-4 lg:grid-cols-[0.94fr_1.06fr] lg:gap-5">
        <section className="hero-aurora rounded-[1.2rem] p-5 text-white sm:p-6">
          <div className="flex items-center gap-3">
            <SystemLogo className="gap-0" markClassName="h-12 w-12" showLabel={false} />
            <div className="section-kicker text-white/72">居民入口</div>
          </div>
          <h1 className="editorial-title mt-5 text-[2.5rem] leading-[0.94] font-semibold text-white sm:text-[4rem]">
            登录 / 注册
          </h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              mode === "login" ? "账号登录" : "邀请码注册",
              mode === "login" ? "快速进入" : "房号绑定",
            ].map((item) => (
              <Chip key={item} size="sm" variant="soft">
                {item}
              </Chip>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {desktopSteps.map((item, index) => (
              <div
                key={item}
                className="rounded-[1rem] bg-white/10 px-3.5 py-3 ring-1 ring-white/10 backdrop-blur-sm"
              >
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/58">
                  0{index + 1}
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{item}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-[1rem] p-4 sm:p-6">
          <div className="flex flex-row gap-2 rounded-[0.95rem] bg-[var(--surface-muted)] p-1.5">
            <Button
              className={mode === "login" ? "bg-white text-slate-950 shadow-none" : "border-transparent bg-transparent text-slate-600 shadow-none"}
              onPress={() => setMode("login")}
              variant="secondary"
            >
              登录
            </Button>
            <Button
              className={mode === "register" ? "bg-white text-slate-950 shadow-none" : "border-transparent bg-transparent text-slate-600 shadow-none"}
              onPress={() => setMode("register")}
              variant="secondary"
            >
              注册
            </Button>
          </div>

          <div className="mt-6">
            <p className="section-kicker">{mode === "login" ? "登录" : "注册"}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.6rem]">
              {mode === "login" ? "账号登录" : "邀请码注册"}
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block space-y-2 text-sm font-semibold text-slate-800">
              <span>用户名</span>
              <Input
                aria-label="用户名"
                fullWidth
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="例如：godd"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>

            <label className="block space-y-2 text-sm font-semibold text-slate-800">
              <span>密码</span>
              <Input
                aria-label="密码"
                fullWidth
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
              />
            </label>

            {mode === "register" ? (
              <>
                <label className="block space-y-2 text-sm font-semibold text-slate-800">
                  <span>确认密码</span>
                  <Input
                    aria-label="确认密码"
                    fullWidth
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="再次输入密码"
                  />
                </label>

                <label className="block space-y-2 text-sm font-semibold text-slate-800">
                  <span>邀请码</span>
                  <Input
                    aria-label="邀请码"
                    className={inviteStatus?.ok ? "border-emerald-300/80 bg-emerald-50/70" : undefined}
                    fullWidth
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="邀请码"
                    autoCapitalize="characters"
                    autoCorrect="off"
                  />
                  {checkingInvite || inviteStatus ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {inviteStatus?.ok ? <Chip color="success" size="sm" variant="soft">可用</Chip> : null}
                      {inviteStatus && !inviteStatus.ok ? <Chip color="danger" size="sm" variant="soft">不可用</Chip> : null}
                      <p className={`text-xs leading-5 ${inviteStatus?.ok ? "text-[var(--success)]" : inviteStatus && !inviteStatus.ok ? "text-[var(--danger)]" : "text-slate-500"}`}>
                        {checkingInvite ? "校验中..." : getInviteHint(inviteStatus)}
                      </p>
                    </div>
                  ) : null}
                </label>

                <label className="block space-y-2 text-sm font-semibold text-slate-800">
                  <span>房号</span>
                  <Input
                    aria-label="房号"
                    fullWidth
                    value={roomNumber}
                    onChange={(event) => setRoomNumber(event.target.value)}
                    placeholder="例如：1-905"
                    autoCapitalize="none"
                  />
                </label>
              </>
            ) : null}
          </div>

          {message ? (
            <Alert className="mt-4" status="success">
              <Alert.Content>
                <Alert.Description>{message}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
          {error ? (
            <Alert className="mt-4" status="danger">
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              isPending={submitting}
              onPress={submit}
              isDisabled={mode === "register" && inviteStatus !== null && !inviteStatus.ok}
            >
              {submitting ? "处理中..." : mode === "login" ? "进入社区" : "完成绑定"}
            </Button>
            <ButtonLink href="/" variant="secondary">
              返回首页
            </ButtonLink>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
