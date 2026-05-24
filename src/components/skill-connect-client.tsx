"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Alert, Button, Input, TextArea } from "@heroui/react";
import type { CommunityUser } from "@/lib/types";
import { buildSkillConnectionPromptForUser } from "@/lib/skill-connect";
import { CyberPanel, CyberStatGrid, DataList } from "./resident-shared";
import { ButtonLink, PageShell } from "./ui";

interface SkillConnectClientProps {
  currentUser: CommunityUser;
  apiBaseUrl: string;
  skillBundleUrl: string;
  bundleDownloadToken: string;
  bundleDownloadTokenExpiresAt: string;
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

/* ── Toast ────────────────────────────────────────────────── */

interface ToastState {
  visible: boolean;
  text: string;
  status: "success" | "error";
}

const TOAST_DURATION_MS = 2500;

function useToast() {
  const [toast, setToast] = useState<ToastState>({ visible: false, text: "", status: "success" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string, status: "success" | "error" = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, text, status });
    timerRef.current = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { toast, show };
}

function CopyToast({ toast }: { toast: ToastState }) {
  const isSuccess = toast.status === "success";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-live="polite"
      role="status"
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: toast.visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-120%)",
        opacity: toast.visible ? 1 : 0,
        zIndex: 9999,
        pointerEvents: "none",
        transition: "transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.35s cubic-bezier(.4,0,.2,1)",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 24px",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 600,
          color: "#fff",
          background: isSuccess
            ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
            : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          boxShadow: isSuccess
            ? "0 8px 32px rgba(34,197,94,.35), 0 2px 8px rgba(0,0,0,.12)"
            : "0 8px 32px rgba(239,68,68,.35), 0 2px 8px rgba(0,0,0,.12)",
          backdropFilter: "blur(8px)",
          whiteSpace: "nowrap" as const,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>{isSuccess ? "✅" : "❌"}</span>
        {toast.text}
      </div>
    </div>,
    document.body,
  );
}

/* ── Main ─────────────────────────────────────────────────── */

export function SkillConnectClient({ currentUser, apiBaseUrl, skillBundleUrl, bundleDownloadToken, bundleDownloadTokenExpiresAt, initialToken, welcome }: SkillConnectClientProps) {
  const [token, setToken] = useState(initialToken);
  const [downloadToken, setDownloadToken] = useState(bundleDownloadToken);
  const [downloadTokenExpiresAt, setDownloadTokenExpiresAt] = useState(bundleDownloadTokenExpiresAt);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRotating, setIsRotating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const { toast, show: showToast } = useToast();

  const currentSkillBundleUrl = useMemo(() => {
    try {
      const url = new URL(skillBundleUrl);
      url.searchParams.set("token", downloadToken);
      return url.toString();
    } catch {
      return skillBundleUrl;
    }
  }, [downloadToken, skillBundleUrl]);

  const prompt = useMemo(
    () => buildSkillConnectionPromptForUser({ skillBundleUrl: currentSkillBundleUrl, bundleDownloadToken: downloadToken, bundleDownloadTokenExpiresAt: downloadTokenExpiresAt, user: currentUser }),
    [currentSkillBundleUrl, currentUser, downloadToken, downloadTokenExpiresAt],
  );

  return (
    <PageShell className="max-w-[1500px] space-y-4">
      <CopyToast toast={toast} />

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
              <span>API Key</span>
              <Input aria-label="API Key" fullWidth readOnly value={token} variant="secondary" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-900">
              <span>接入文案</span>
              <TextArea aria-label="接入文案" fullWidth readOnly rows={16} value={prompt} variant="secondary" />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button isPending={isCopying} onPress={() => { setIsCopying(true); startTransition(() => { void copyText(prompt).then(() => showToast("接入文案已复制到剪贴板", "success")).catch(() => showToast("复制失败，请手动复制文本", "error")).finally(() => setIsCopying(false)); }); }}>复制接入文案</Button>
            <Button isPending={isRotating} onPress={() => { setError(""); setMessage(""); setIsRotating(true); startTransition(() => { void fetch("/api/skill/token", { method: "POST", credentials: "include" }).then(async (response) => { const data = (await response.json().catch(() => null)) as { token?: string; bundleDownloadToken?: string; bundleDownloadTokenExpiresAt?: string; error?: string } | null; if (!response.ok || !data?.token || !data.bundleDownloadToken || !data.bundleDownloadTokenExpiresAt) throw new Error(data?.error || "重置 API Key 失败"); setToken(data.token); setDownloadToken(data.bundleDownloadToken); setDownloadTokenExpiresAt(data.bundleDownloadTokenExpiresAt); setMessage("API Key 与 Bundle 临时下载 Token 已重置。"); }).catch((requestError) => { setError(requestError instanceof Error ? requestError.message : "重置 API Key 失败"); }).finally(() => setIsRotating(false)); }); }} variant="secondary">重置 API Key</Button>
          </div>
        </CyberPanel>

        <CyberPanel title="接入说明" kicker="Guide">
          <DataList items={[
            { label: "下载认证", value: "临时 Token", hint: "Bundle URL 的 token 只用于下载" },
            { label: "API 认证", value: "Bearer Token", hint: "Skill 脚本读取 bundle 内 config.json" },
            { label: "权限范围", value: "常用读写", hint: "看帖、发帖、回帖、收藏/举报、投票" },
            { label: "返回入口", value: <ButtonLink href="/posts" variant="secondary" size="sm">返回邻里</ButtonLink> },
          ]} />
        </CyberPanel>
      </section>
    </PageShell>
  );
}
