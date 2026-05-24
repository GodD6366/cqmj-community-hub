"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Input } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { ButtonLink, PageShell } from "./ui";
import { CyberPanel, CyberStatGrid, DataList } from "./resident-shared";
import { SystemLogo } from "./system-logo";
import { getCommunityName } from "@/lib/community-brand";

const communityName = getCommunityName();

type InviteCheckResult =
  | {
      ok: true;
      normalizedCode: string;
      remainingUses: number | null;
      expiresAt: string | null;
      note: string | null;
    }
  | {
      ok: false;
      normalizedCode: string | null;
      reason: "empty" | "invalid" | "inactive" | "expired" | "exhausted";
    };

function getInviteHint(result: InviteCheckResult | null) {
  if (!result) return "";
  if (result.ok) {
    const usage =
      result.remainingUses === null
        ? "不限次数"
        : `剩余 ${result.remainingUses} 次`;
    const expiry = result.expiresAt
      ? ` · 至 ${new Date(result.expiresAt).toLocaleString("zh-CN")}`
      : "";
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

function getPostLoginDestination(
  nextPath: string,
  user: { skillTokenVersion: number },
) {
  if (nextPath === "/" && user.skillTokenVersion === 0)
    return "/skill/connect?welcome=1";
  return nextPath;
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => searchParams.get("next") || "/",
    [searchParams],
  );
  const { login, register, currentUser, logout } = useCommunityPosts();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<InviteCheckResult | null>(
    null,
  );
  const desktopSteps =
    mode === "login"
      ? ["输入账号", "验证身份", "进入社区"]
      : ["邀请码", "绑定房号", "完成注册"];

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
        const response = await fetch(
          `/api/invite/validate?code=${encodeURIComponent(normalized)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = (await response
          .json()
          .catch(() => null)) as InviteCheckResult | null;
        if (data) setInviteStatus(data);
      } catch {
        if (!controller.signal.aborted) setInviteStatus(null);
      } finally {
        if (!controller.signal.aborted) setCheckingInvite(false);
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
        window.setTimeout(
          () => router.push(getPostLoginDestination(nextPath, user)),
          500,
        );
      } else {
        if (password.length < 6) throw new Error("密码至少需要 6 位");
        const user = await register({
          username,
          password,
          inviteCode,
          roomNumber,
        });
        setMessage("注册并绑定成功，正在跳转...");
        window.setTimeout(
          () => router.push(getPostLoginDestination(nextPath, user)),
          500,
        );
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setError("");
    setMessage("");
    setLoggingOut(true);
    try {
      await logout();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "退出失败");
    } finally {
      setLoggingOut(false);
    }
  };

  if (currentUser) {
    return (
      <>
        {/* 移动端已登录 */}
        <div className="mobile-login md:!hidden">
          <div className="mobile-login-card">
            <div className="mobile-login-logo">邻</div>
            <div className="mobile-login-title">{currentUser.nickname}</div>
            <div className="text-sm text-[var(--muted)] mt-1">
              {currentUser.role === "admin"
                ? "管理员账号"
                : currentUser.roomNumber || "未绑定房号"}
            </div>
            {error ? <div className="mobile-login-error">{error}</div> : null}
            <div className="w-full mt-4 grid gap-2">
              <Link
                href={nextPath}
                className="mobile-login-submit text-center"
                style={{ textDecoration: "none", display: "block" }}
              >
                进入页面
              </Link>
              <Link
                href="/"
                className="mobile-login-submit text-center"
                style={{
                  textDecoration: "none",
                  display: "block",
                  background: "transparent",
                  border: "1px solid rgba(76,255,177,0.2)",
                  color: "#9cffc9",
                }}
              >
                返回首页
              </Link>
              <button
                type="button"
                className="mobile-login-submit"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,93,122,0.2)",
                  color: "#ff8da4",
                }}
                onClick={handleLogout}
              >
                {loggingOut ? "退出中..." : "退出登录"}
              </button>
            </div>
          </div>
        </div>

        {/* 桌面端已登录 */}
        <PageShell className="max-w-5xl hidden md:block">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <CyberPanel title="已登录" kicker="Resident Session">
              <div className="flex items-start gap-4">
                <SystemLogo showLabel={false} markClassName="h-14 w-14" />
                <div>
                  <div className="text-[1.6rem] font-semibold text-slate-950">
                    {currentUser.nickname}
                  </div>
                  <div className="mt-2 text-sm text-[var(--muted)]">
                    {currentUser.role === "admin"
                      ? "管理员账号"
                      : currentUser.roomNumber || "未绑定房号"}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <CyberStatGrid
                  columns={2}
                  items={[
                    { label: "昵称", value: currentUser.nickname },
                    { label: "用户名", value: currentUser.username },
                    {
                      label: "角色",
                      value: currentUser.role === "admin" ? "管理员" : "住户",
                    },
                  ]}
                />
              </div>
              {error ? (
                <Alert className="mt-4" status="danger">
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink href={nextPath}>进入页面</ButtonLink>
                <ButtonLink href="/" variant="secondary">
                  返回首页
                </ButtonLink>
                <Button
                  isPending={loggingOut}
                  onPress={handleLogout}
                  variant="secondary"
                >
                  {loggingOut ? "退出中..." : "退出登录"}
                </Button>
              </div>
            </CyberPanel>
            <CyberPanel title="当前状态" kicker="Session State">
              <DataList
                items={[
                  {
                    label: "社区权限",
                    value: currentUser.role === "admin" ? "管理员" : "居民",
                  },
                  { label: "跳转目标", value: nextPath },
                  { label: "会话状态", value: "在线" },
                ]}
              />
            </CyberPanel>
          </section>
        </PageShell>
      </>
    );
  }

  return (
    <>
      {/* 移动端登录 / 注册 */}
      {mode === "register" ? (
        <div className="mobile-register-terminal md:!hidden">
          <div className="mobile-register-corner mobile-register-corner--tl" />
          <div className="mobile-register-corner mobile-register-corner--tr" />
          <div className="mobile-register-corner mobile-register-corner--bl" />
          <div className="mobile-register-corner mobile-register-corner--br" />

          <header className="mobile-register-header">
            <div>
              <div className="mobile-register-brand">
                COMMUNITY
                <br />
                TERMINAL_
              </div>
              <h1>{communityName}</h1>
              <p>邻里互助 · 共建美好社区</p>
            </div>
            <span className="mobile-register-status">SYS:ONLINE</span>
          </header>

          <section className="mobile-register-panel" aria-label="注册加入社区">
            <div className="mobile-register-panel-title">
              <span>{"///"}</span> 欢迎加入 <span>{"///"}</span>
            </div>
            {message ? (
              <div className="mobile-login-success">{message}</div>
            ) : null}
            {error ? <div className="mobile-login-error">{error}</div> : null}

            <form
              className="mobile-register-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label className="mobile-register-field">
                <span>邀请码</span>
                <span className="mobile-register-input-wrap">
                  <InviteIcon />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="请输入邀请码"
                    autoCapitalize="characters"
                    autoCorrect="off"
                  />
                </span>
                <small>
                  {checkingInvite
                    ? "校验中..."
                    : inviteStatus
                      ? getInviteHint(inviteStatus)
                      : "请输入社区管理员提供的邀请码"}
                </small>
              </label>

              <label className="mobile-register-field">
                <span>房屋信息</span>
                <span className="mobile-register-input-wrap">
                  <HomeLineIcon />
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(event) => setRoomNumber(event.target.value)}
                    placeholder="如：1-2-302"
                    autoCapitalize="none"
                  />
                </span>
                <small>请输入楼栋-单元-房号</small>
              </label>

              <label className="mobile-register-field">
                <span>用户名</span>
                <span className="mobile-register-input-wrap">
                  <UserLineIcon />
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="请输入用户名"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </span>
              </label>

              <label className="mobile-register-field">
                <span>密码</span>
                <span className="mobile-register-input-wrap">
                  <LockLineIcon />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="至少 6 位密码"
                  />
                </span>
              </label>

              <button
                type="submit"
                className="mobile-register-submit"
                disabled={submitting}
              >
                {submitting ? "注册中..." : "进入社区"}
              </button>
            </form>

            <div className="mobile-register-divider">
              <span>或</span>
            </div>
            <button
              type="button"
              className="mobile-register-help"
              onClick={() => setMode("login")}
            >
              已有账号？去登录 <span>›</span>
            </button>
          </section>

          <footer className="mobile-register-footer">
            ·· COMMUNITY TERMINAL v1.0.0 ··
          </footer>
        </div>
      ) : (
        <div className="mobile-login md:!hidden">
          <div className="mobile-login-card">
            <div className="mobile-login-logo">邻</div>
            <div className="mobile-login-title">{communityName}</div>

            <div className="mobile-login-toggle">
              <button
                type="button"
                className="mobile-login-toggle-btn is-active"
                onClick={() => setMode("login")}
              >
                登录
              </button>
              <button
                type="button"
                className="mobile-login-toggle-btn"
                onClick={() => setMode("register")}
              >
                注册
              </button>
            </div>

            {message ? (
              <div className="mobile-login-success">{message}</div>
            ) : null}
            {error ? <div className="mobile-login-error">{error}</div> : null}

            <form
              className="mobile-login-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                className="mobile-login-input"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="请输入用户名"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <input
                className="mobile-login-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
              />
              <button
                type="submit"
                className="mobile-login-submit"
                disabled={submitting}
              >
                {submitting ? "登录中..." : "登录"}
              </button>
            </form>

            <div className="mobile-login-register">
              没有账号？
              <button
                type="button"
                onClick={() => setMode("register")}
                style={{
                  color: "var(--primary)",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                立即注册
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 桌面端登录 */}
      <PageShell className="max-w-[1500px] hidden md:block">
        <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <CyberPanel title="邻里共建" kicker="Resident Access">
            <SystemLogo markClassName="h-14 w-14" />
            <div className="mt-4 text-[2rem] font-semibold leading-[1.05] tracking-[-0.05em] text-slate-950">
              登录社区 · 连接邻里
            </div>
            <div className="mt-3 text-sm leading-7 text-[var(--muted)]">
              基于你的设计稿风格，这里改成终端式居民入口。登录后可查看社区动态、发帖、报修、参与投票。
            </div>
            <div className="mt-4">
              <DataList
                items={[
                  { label: "真实邻里", hint: "房号绑定与邀请码注册" },
                  { label: "公开透明", hint: "消息、工单、投票统一查看" },
                  { label: "高效协同", hint: "居民与物业同屏协作" },
                ]}
              />
            </div>
          </CyberPanel>

          <CyberPanel
            title={mode === "login" ? "账号登录" : "邀请码注册"}
            kicker="Auth Terminal"
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${mode === "login" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border border-[var(--border)] text-[var(--muted)]"}`}
                  onClick={() => setMode("login")}
                >
                  登录
                </button>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${mode === "register" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border border-[var(--border)] text-[var(--muted)]"}`}
                  onClick={() => setMode("register")}
                >
                  注册
                </button>
              </div>
            }
          >
            {message ? (
              <Alert className="mb-4" status="success">
                <Alert.Content>
                  <Alert.Description>{message}</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}
            {error ? (
              <Alert className="mb-4" status="danger">
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-900">
                <span>用户名</span>
                <Input
                  aria-label="用户名"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="例如：godd"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-900">
                <span>密码</span>
                <Input
                  aria-label="密码"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 6 位"
                />
              </label>
              {mode === "register" ? (
                <label className="grid gap-2 text-sm font-semibold text-slate-900">
                  <span>房号</span>
                  <Input
                    aria-label="房号"
                    value={roomNumber}
                    onChange={(event) => setRoomNumber(event.target.value)}
                    placeholder="1-905"
                    autoCapitalize="none"
                  />
                </label>
              ) : null}
              {mode === "register" ? (
                <label className="md:col-span-2 grid gap-2 text-sm font-semibold text-slate-900">
                  <span>邀请码</span>
                  <Input
                    aria-label="邀请码"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="邀请码"
                    autoCapitalize="characters"
                    autoCorrect="off"
                  />
                  {checkingInvite || inviteStatus ? (
                    <div className="text-xs text-[var(--muted)]">
                      {checkingInvite
                        ? "校验中..."
                        : getInviteHint(inviteStatus)}
                    </div>
                  ) : null}
                </label>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button isPending={submitting} onPress={submit}>
                {submitting
                  ? mode === "login"
                    ? "登录中..."
                    : "注册中..."
                  : mode === "login"
                    ? "登录"
                    : "进入社区"}
              </Button>
              <ButtonLink href="/" variant="secondary">
                返回首页
              </ButtonLink>
            </div>
          </CyberPanel>

          <CyberPanel title="登录流程" kicker="Steps">
            <CyberStatGrid
              columns={3}
              items={desktopSteps.map((item, index) => ({
                label: `步骤 ${index + 1}`,
                value: item,
              }))}
            />
            <div className="mt-4 text-sm leading-7 text-[var(--muted)]">
              注册时需邀请码与房号；登录后将自动按 next 参数跳转到目标页。
            </div>
          </CyberPanel>
        </section>
      </PageShell>
    </>
  );
}

function InviteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}

function HomeLineIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

function UserLineIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function LockLineIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M7 10V8a5 5 0 0 1 10 0v2" />
      <path d="M6 10h12v10H6z" />
      <path d="M12 14v2" />
    </svg>
  );
}
