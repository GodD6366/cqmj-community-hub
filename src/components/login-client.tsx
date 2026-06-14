"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Input } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { SystemLogo } from "./system-logo";
import { getCommunityName } from "@/lib/community-brand";
import { ButtonLink } from "./ui";
import { HomeLineIcon, InviteIcon, LockLineIcon, UserLineIcon } from "./app-icons";

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
    setMode(nextMode);
    setError("");
    setMessage("");
  }

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

  async function submit() {
    setSubmitting(true);
    setError("");
    setMessage("");
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
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
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
  }

  if (currentUser) {
    return (
      <main className="auth-page">
        <section className="auth-card auth-card--session">
          <SystemLogo className="justify-center" markClassName="h-16 w-16" showLabel={false} />
          <div className="auth-heading">
            <p>当前账号</p>
            <h1>{currentUser.nickname}</h1>
            <span>{currentUser.role === "admin" ? "管理员账号" : currentUser.roomNumber || "未绑定房号"}</span>
          </div>
          {error ? <Alert className="auth-alert" status="danger"><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}
          <div className="auth-actions">
            <ButtonLink className="auth-button auth-button--primary" href={nextPath}>
              进入页面
            </ButtonLink>
            <ButtonLink className="auth-button auth-button--secondary" href="/">
              返回首页
            </ButtonLink>
            <Button className="auth-button auth-button--danger" isPending={loggingOut} type="button" variant="danger-soft" onPress={handleLogout}>
              {loggingOut ? "退出中..." : "退出登录"}
            </Button>
          </div>
        </section>
      </main>
    );
  }

  const inviteHint = checkingInvite ? "邀请码校验中..." : inviteStatus ? getInviteHint(inviteStatus) : "请输入社区管理员提供的邀请码";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <SystemLogo markClassName="h-16 w-16" showLabel={false} />
          <div>
            <p>居民入口</p>
            <h1>{communityName}</h1>
            <span>登录后参与动态、工单、投票和邻里互助</span>
          </div>
        </div>

        <div aria-label="登录或注册" className="auth-segment" role="group">
          <Button
            aria-pressed={mode === "login"}
            className="auth-segment-button"
            data-active={mode === "login" ? "true" : undefined}
            type="button"
            variant="secondary"
            onPress={() => switchMode("login")}
          >
            登录
          </Button>
          <Button
            aria-pressed={mode === "register"}
            className="auth-segment-button"
            data-active={mode === "register" ? "true" : undefined}
            type="button"
            variant="secondary"
            onPress={() => switchMode("register")}
          >
            注册
          </Button>
        </div>

        {message ? <Alert className="auth-alert" status="success"><Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content></Alert> : null}
        {error ? <Alert className="auth-alert" status="danger"><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {mode === "register" ? (
            <>
              <AuthField hint={inviteHint} icon={<InviteIcon />} label="邀请码">
                <Input
                  autoCapitalize="characters"
                  autoCorrect="off"
                  className="auth-input-control"
                  placeholder="输入邀请码"
                  type="text"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                />
              </AuthField>
              <AuthField hint="例如 1-2-302" icon={<HomeLineIcon />} label="房号">
                <Input
                  autoCapitalize="none"
                  className="auth-input-control"
                  placeholder="楼栋-单元-房号"
                  type="text"
                  value={roomNumber}
                  onChange={(event) => setRoomNumber(event.target.value)}
                />
              </AuthField>
            </>
          ) : null}

          <AuthField icon={<UserLineIcon />} label="用户名">
            <Input
              autoCapitalize="none"
              autoCorrect="off"
              className="auth-input-control"
              placeholder="输入用户名"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </AuthField>

          <AuthField hint={mode === "register" ? "至少 6 位密码" : undefined} icon={<LockLineIcon />} label="密码">
            <Input
              className="auth-input-control"
              placeholder="输入密码"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </AuthField>

          <Button className="auth-submit" isPending={submitting} type="submit">
            {submitting ? (mode === "login" ? "登录中..." : "注册中...") : mode === "login" ? "登录" : "注册并进入"}
          </Button>
        </form>

        <p className="auth-footer">
          {mode === "login" ? "没有账号？" : "已有账号？"}
          <button
            type="button"
            onClick={() => {
              switchMode(mode === "login" ? "register" : "login");
            }}
          >
            {mode === "login" ? "立即注册" : "去登录"}
          </button>
        </p>
      </section>
    </main>
  );
}

function AuthField({
  children,
  hint,
  icon,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      <span className="auth-input">
        <span className="auth-input-icon">{icon}</span>
        {children}
      </span>
      {hint ? <span className="auth-field-hint">{hint}</span> : null}
    </label>
  );
}
