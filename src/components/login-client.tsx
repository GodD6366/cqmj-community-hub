"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Chip, Input } from "@heroui/react";
import { useCommunityPosts } from "./community-provider";
import { ButtonLink, PageShell } from "./ui";

type InviteCheckResult =
  | { ok: true; normalizedCode: string; remainingUses: number | null; expiresAt: string | null; note: string | null }
  | { ok: false; normalizedCode: string | null; reason: "empty" | "invalid" | "inactive" | "expired" | "exhausted" };

function getInviteHint(result: InviteCheckResult | null) {
  if (!result) return "输入邀请码后会自动校验可用性。";
  if (result.ok) {
    const usage = result.remainingUses === null ? "不限次数" : `剩余 ${result.remainingUses} 次`;
    const expiry = result.expiresAt ? `，到期时间 ${new Date(result.expiresAt).toLocaleString("zh-CN")}` : "";
    return `邀请码可用：${usage}${expiry}`;
  }

  switch (result.reason) {
    case "empty":
      return "请输入邀请码。";
    case "invalid":
      return "邀请码不存在或格式不正确。";
    case "inactive":
      return "邀请码已停用，请联系管理员。";
    case "expired":
      return "邀请码已过期，请联系管理员。";
    case "exhausted":
      return "邀请码可用次数已耗尽。";
  }
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);
  const { login, currentUser } = useCommunityPosts();
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
        await login({ username, password });
        setMessage("登录成功，正在跳转...");
      } else {
        if (password.length < 6) {
          throw new Error("密码至少需要 6 位");
        }
        if (password !== confirmPassword) {
          throw new Error("两次输入的密码不一致");
        }
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
      <PageShell className="max-w-3xl py-6">
        <Card className="glass-card p-6 sm:p-8">
          <Card.Header className="p-0">
            <div>
              <p className="section-kicker">当前已登录</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{currentUser.username}</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">房号：{currentUser.roomNumber}</p>
            </div>
          </Card.Header>
          <Card.Content className="flex flex-col gap-3 p-0 pt-6 sm:flex-row">
            <ButtonLink href={nextPath}>继续前往</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              返回首页
            </ButtonLink>
          </Card.Content>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-6xl">
      <div className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr] lg:gap-5">
        <section className="hero-aurora rounded-[1.2rem] p-5 text-white sm:p-6">
          <div className="section-kicker text-white/72">Resident Access Sequence</div>
          <h1 className="editorial-title mt-5 text-[2.5rem] leading-[0.94] font-semibold text-white sm:text-[4rem]">
            邀请码 + 房号，完成社区身份绑定
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
            第一次注册用邀请码和房号完成身份校验。校验完成后，后续只保留最短路径：用户名 + 密码。
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              ["1", "输入邀请码", "先确认邀请码可用，再继续注册。"],
              ["2", "绑定房号", "一户一绑，避免社区身份混乱。"],
              ["3", "长期登录", "完成后即可直接登录、评论和发帖。"],
            ].map(([step, title, desc]) => (
              <div key={step} className="stat-block rounded-[0.9rem] p-4">
                <div className="text-xs font-semibold tracking-[0.16em] text-sky-100 uppercase">Step {step}</div>
                <div className="mt-3 text-base font-semibold text-white">{title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-200">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-[1rem] p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-2 rounded-[0.95rem] bg-[var(--surface-muted)] p-1.5">
            <Button
              className={mode === "login" ? "bg-white text-slate-950 shadow-none" : "border-transparent bg-transparent text-slate-600 shadow-none"}
              onPress={() => setMode("login")}
              variant="secondary"
            >
              已有账号
            </Button>
            <Button
              className={mode === "register" ? "bg-white text-slate-950 shadow-none" : "border-transparent bg-transparent text-slate-600 shadow-none"}
              onPress={() => setMode("register")}
              variant="secondary"
            >
              首次绑定
            </Button>
          </div>

          <div className="mt-6">
            <p className="section-kicker">{mode === "login" ? "欢迎回来" : "首次加入社区"}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.6rem]">
              {mode === "login" ? "用户名 + 密码登录" : "邀请码 + 房号完成注册"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {mode === "login" ? "使用你已经绑定好的用户名和密码登录。" : "注册时会实时校验邀请码是否可用，并校验房号格式。"}
            </p>
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
                    placeholder="输入管理员发放的邀请码"
                    autoCapitalize="characters"
                    autoCorrect="off"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {inviteStatus?.ok ? <Chip color="success" size="sm" variant="soft">邀请码可用</Chip> : null}
                    {inviteStatus && !inviteStatus.ok ? <Chip color="danger" size="sm" variant="soft">邀请码不可用</Chip> : null}
                    <p className={`text-xs leading-5 ${inviteStatus?.ok ? "text-[var(--success)]" : inviteStatus && !inviteStatus.ok ? "text-[var(--danger)]" : "text-slate-500"}`}>
                      {checkingInvite ? "邀请码校验中..." : getInviteHint(inviteStatus)}
                    </p>
                  </div>
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
                  <p className="text-xs leading-5 text-slate-500">格式建议：楼栋-房号，例如 1-905、8-1201。</p>
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
              先逛逛首页
            </ButtonLink>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
