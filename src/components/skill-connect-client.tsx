"use client";

import { useState } from "react";
import { Button, Card, Input } from "@heroui/react";
import { Toast, useToast } from "./ui/toast";
import { CopyIcon } from "./app-icons";

interface SkillConnectClientProps {
  currentUser: {
    id: string;
    username: string;
    nickname: string;
    roomNumber: string;
    skillTokenVersion: number;
  };
  apiBaseUrl: string;
  skillBundleUrl: string;
  bundleDownloadToken: string;
  bundleDownloadTokenExpiresAt: string;
  initialToken: string;
  welcome: boolean;
}

export function SkillConnectClient({
  currentUser,
  apiBaseUrl,
  skillBundleUrl,
  bundleDownloadTokenExpiresAt,
  initialToken,
  welcome,
}: SkillConnectClientProps) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [copiedBundle, setCopiedBundle] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();
  const shortBundleUrl = `${skillBundleUrl.slice(0, 44)}...${skillBundleUrl.slice(-12)}`;

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      show("Token 已复制。", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch { show("复制失败", "error"); }
  }

  async function copyBundleUrl() {
    try {
      await navigator.clipboard.writeText(skillBundleUrl);
      setCopiedBundle(true);
      show("Bundle 地址已复制。", "success");
      setTimeout(() => setCopiedBundle(false), 2000);
    } catch { show("复制失败", "error"); }
  }

  async function handleGenerateToken() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/skill/token", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setToken(data.token);
      show("Token 已生成。", "success");
    } catch (e) { show(e instanceof Error ? e.message : "生成失败", "error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 pt-8 md:p-6">
      <Toast toast={toast} />
      <div className="app-panel-strong p-5 md:p-6">
        <div className="map-coordinate">AI 接入站</div>
        <h1 className="app-display mt-3 text-3xl leading-tight md:text-4xl">AI 助手 Skill 接入</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">复制 Token 或下载 Bundle，让 AI 助手安全访问你的社区数据。</p>
      </div>

      {welcome && (
        <Card className="app-panel border-primary/30 bg-primary/5 p-5">
          <Card.Title>欢迎使用 AI Skill 接入</Card.Title>
          <Card.Description>首次登录，请复制下方 Token 并为你的 AI 助手配置 Skill 连接。</Card.Description>
        </Card>
      )}

      {/* 用户信息 */}
      <Card className="app-panel p-5">
        <Card.Title>账户信息</Card.Title>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4 rounded-xl bg-white/70 px-3 py-2"><span className="text-muted-foreground">用户名</span><span className="break-all text-right">@{currentUser.username}</span></div>
          <div className="flex justify-between gap-4 rounded-xl bg-white/70 px-3 py-2"><span className="text-muted-foreground">昵称</span><span className="break-all text-right">{currentUser.nickname}</span></div>
          <div className="flex justify-between gap-4 rounded-xl bg-white/70 px-3 py-2"><span className="text-muted-foreground">房号</span><span className="break-all text-right">{currentUser.roomNumber}</span></div>
        </div>
      </Card>

      {/* Token 管理 */}
      <Card className="app-panel p-5">
        <Card.Title>API Token</Card.Title>
        <Card.Description>将此 Token 配置到 AI 助手中，即可通过 API 访问社区数据。</Card.Description>
        <div className="mt-3 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              readOnly
              value={token}
              className="min-w-0 font-mono text-sm"
              aria-label="当前 Token"
            />
            <Button variant="secondary" className="min-h-11 w-full sm:w-auto" onPress={() => { void copyToken(); }}>
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
          <Button variant="primary" className="min-h-11" isPending={busy} onPress={() => { void handleGenerateToken(); }}>
            重新生成 Token
          </Button>
        </div>
      </Card>

      {/* 配置信息 */}
      <Card className="app-panel p-5">
        <Card.Title>Skill 配置信息</Card.Title>
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-2xl border border-border/70 bg-white/72 p-3">
            <span className="text-xs font-bold text-muted-foreground">API 地址</span>
            <code className="mt-2 block min-w-0 rounded-xl bg-muted/40 px-3 py-2 text-xs break-all">{apiBaseUrl}</code>
          </div>
          <div className="rounded-2xl border border-border/70 bg-white/72 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-muted-foreground">Bundle 地址</span>
              <button
                type="button"
                className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-primary-strong transition-colors hover:bg-primary/8"
                onClick={() => { void copyBundleUrl(); }}
              >
                <CopyIcon className="h-3.5 w-3.5" />
                {copiedBundle ? "已复制" : "复制"}
              </button>
            </div>
            <code className="mt-2 block min-w-0 rounded-xl bg-muted/40 px-3 py-2 text-xs break-all" title={skillBundleUrl}>
              <span className="md:hidden">{shortBundleUrl}</span>
              <span className="hidden md:inline">{skillBundleUrl}</span>
            </code>
          </div>
          <div className="rounded-2xl border border-border/70 bg-white/72 p-3">
            <span className="text-xs font-bold text-muted-foreground">Token 有效期</span>
            <span className="mt-2 block">{new Date(bundleDownloadTokenExpiresAt).toLocaleString("zh-CN")}</span>
          </div>
        </div>
      </Card>

      {/* 下载 Bundle */}
      <Card className="app-panel p-5">
        <Card.Title>下载 Skill Bundle</Card.Title>
        <Card.Description>下载 AI 助手 Skill 配置文件包。</Card.Description>
        <div className="mt-3">
          <a href={skillBundleUrl} download className="inline-block">
            <Button variant="primary" className="min-h-11">下载 Skill Bundle</Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
