"use client";

import { startTransition, useMemo, useState } from "react";
import { Alert, Button, Input, TextArea } from "@heroui/react";
import type { CommunityUser } from "@/lib/types";
import { buildSkillConnectionPromptForUser } from "@/lib/skill-connect";
import { CyberPanel, CyberStatGrid, DataList } from "./resident-shared";
import { ButtonLink, PageShell } from "./ui";

interface SkillConnectClientProps {
  currentUser: CommunityUser;
  apiBaseUrl: string;
  skillBundleUrl: string;
  initialToken: string;
  welcome: boolean;
}

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("copy_failed");
}

export function SkillConnectClient({ currentUser, apiBaseUrl, skillBundleUrl, initialToken, welcome }: SkillConnectClientProps) {
  const [token, setToken] = useState(initialToken);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRotating, setIsRotating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const prompt = useMemo(
    () => buildSkillConnectionPromptForUser({ skillBundleUrl, user: currentUser }),
    [currentUser, skillBundleUrl],
  );

  return (
    <PageShell className="max-w-[1500px] space-y-4">
      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <CyberPanel title="Skill 接入" kicker="Connection Setup">
          <CyberStatGrid columns={2} items={[
            { label: "账号", value: currentUser.username },
            { label: "模式", value: "读写" },
            { label: "凭证状态", value: token ? "已生成" : "未生成" },
            { label: "欢迎态", value: welcome ? "是" : "否" },
          ]} />
          {welcome ? (
            <Alert className="mt-4" status="success">
              <Alert.Content>
                <Alert.Description>个人 Skill API Key 已生成。</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
        </CyberPanel>

        <CyberPanel title="接入信息" kicker="Config">
          {error ? <Alert className="mb-4" status="danger"><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}
          {message ? <Alert className="mb-4" status="success"><Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content></Alert> : null}

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-900">
              <span>Skill API Base</span>
              <Input aria-label="Skill API Base" fullWidth readOnly value={apiBaseUrl} variant="secondary" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-900">
              <span>Skill Bundle</span>
              <Input aria-label="Skill Bundle" fullWidth readOnly value={skillBundleUrl} variant="secondary" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-900">
              <span>API Key</span>
              <Input aria-label="API Key" fullWidth readOnly value={token} variant="secondary" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-900">
              <span>接入文案</span>
              <TextArea aria-label="接入文案" fullWidth readOnly rows={16} value={prompt} variant="secondary" />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button isPending={isCopying} onPress={() => { setError(""); setMessage(""); setIsCopying(true); startTransition(() => { void copyText(prompt).then(() => setMessage("接入文案已复制。")).catch(() => setError("复制失败，请手动复制文本。")).finally(() => setIsCopying(false)); }); }}>复制接入文案</Button>
            <Button isPending={isRotating} onPress={() => { setError(""); setMessage(""); setIsRotating(true); startTransition(() => { void fetch("/api/skill/token", { method: "POST", credentials: "include" }).then(async (response) => { const data = (await response.json().catch(() => null)) as { token?: string; error?: string } | null; if (!response.ok || !data?.token) throw new Error(data?.error || "重置 API Key 失败"); setToken(data.token); setMessage("API Key 已重置。"); }).catch((requestError) => { setError(requestError instanceof Error ? requestError.message : "重置 API Key 失败"); }).finally(() => setIsRotating(false)); }); }} variant="secondary">重置 API Key</Button>
          </div>
        </CyberPanel>

        <CyberPanel title="接入说明" kicker="Guide">
          <DataList items={[
            { label: "认证方式", value: "Bearer Token", hint: "Skill 脚本读取 bundle 内 config.json" },
            { label: "权限范围", value: "常用读写", hint: "看帖、发帖、回帖、收藏/举报、投票" },
            { label: "返回入口", value: <ButtonLink href="/posts" variant="secondary" size="sm">返回邻里</ButtonLink> },
          ]} />
        </CyberPanel>
      </section>
    </PageShell>
  );
}
