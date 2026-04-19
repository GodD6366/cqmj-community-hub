"use client";

import { startTransition, useMemo, useState } from "react";
import { Alert, Button, Card, Chip, Input, TextArea } from "@heroui/react";
import type { CommunityUser } from "@/lib/types";
import { buildMcpConnectionPromptForUser } from "@/lib/mcp-connect";
import { ButtonLink, PageShell } from "./ui";

interface McpConnectClientProps {
  currentUser: CommunityUser;
  endpoint: string;
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

  if (!copied) {
    throw new Error("copy_failed");
  }
}

export function McpConnectClient({
  currentUser,
  endpoint,
  initialToken,
  welcome,
}: McpConnectClientProps) {
  const [token, setToken] = useState(initialToken);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRotating, setIsRotating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const prompt = useMemo(
    () =>
      buildMcpConnectionPromptForUser({
        endpoint,
        apiKey: token,
        user: currentUser,
      }),
    [currentUser, endpoint, token],
  );

  return (
    <PageShell className="max-w-5xl space-y-4 py-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <div className="hero-aurora rounded-[1.2rem] p-5 text-white sm:p-6">
          <div className="section-kicker text-white/72">Model Access</div>
          <h1 className="editorial-title mt-5 text-[2.7rem] leading-[0.94] font-semibold text-white sm:text-[4.2rem]">
            把邻里圈接入你的大模型工作台
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            这是你的个人只读 MCP 凭证。复制下面这段接入说明，直接发给支持 MCP 的平台或模型客户端即可。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Chip color="success" size="sm" variant="soft">
              {currentUser.username} · 个人 MCP Key
            </Chip>
            <Chip color="warning" size="sm" variant="soft">
              Bearer Token
            </Chip>
          </div>
        </div>

        <Card className="glass-card p-5 sm:p-6">
          <Card.Header className="p-0">
            <div>
              <div className="section-kicker">Quick Notes</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                使用边界
              </h2>
            </div>
          </Card.Header>
          <Card.Content className="grid gap-3 p-0 pt-5">
            {[
              "这是个人凭证，不要共享给其他住户或公开贴图。",
              "当前 MCP 只开放只读工具，不支持发帖、评论或后台操作。",
              "点击“重置 API key”后，旧 key 会立即失效。",
            ].map((item) => (
              <div key={item} className="route-card px-3 py-3 text-sm leading-6 text-slate-700">
                {item}
              </div>
            ))}
            <ButtonLink href="/posts" variant="secondary">
              返回帖子广场
            </ButtonLink>
          </Card.Content>
        </Card>
      </section>

      {welcome ? (
        <Alert status="success">
          <Alert.Content>
            <Alert.Description>已为你生成个人 MCP key。复制下面这段话给支持 MCP 的平台即可完成接入。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {message ? (
        <Alert status="success">
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Card className="glass-card p-5 sm:p-6">
        <Card.Header className="p-0">
          <div>
            <div className="section-kicker">Connection Payload</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              接入信息
            </h2>
          </div>
        </Card.Header>
        <Card.Content className="grid gap-5 p-0 pt-6">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            <span>MCP 端点</span>
            <Input aria-label="MCP 端点" fullWidth readOnly value={endpoint} variant="secondary" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            <span>API key</span>
            <Input aria-label="API key" fullWidth readOnly value={token} variant="secondary" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            <span>复制这段话给模型或平台</span>
            <TextArea
              aria-label="复制这段话给模型或平台"
              fullWidth
              readOnly
              rows={10}
              value={prompt}
              variant="secondary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              isPending={isCopying}
              onPress={() => {
                setError("");
                setMessage("");
                setIsCopying(true);
                startTransition(() => {
                  void copyText(prompt)
                    .then(() => setMessage("接入文案已复制。"))
                    .catch(() => setError("复制失败，请手动复制文本。"))
                    .finally(() => setIsCopying(false));
                });
              }}
            >
              复制接入文案
            </Button>
            <Button
              isPending={isRotating}
              onPress={() => {
                setError("");
                setMessage("");
                setIsRotating(true);
                startTransition(() => {
                  void fetch("/api/mcp/token", {
                    method: "POST",
                    credentials: "include",
                  })
                    .then(async (response) => {
                      const data = (await response.json().catch(() => null)) as { token?: string; error?: string } | null;
                      if (!response.ok || !data?.token) {
                        throw new Error(data?.error || "重置 API key 失败");
                      }
                      setToken(data.token);
                      setMessage("API key 已重置，旧 key 立即失效。");
                    })
                    .catch((requestError) => {
                      setError(requestError instanceof Error ? requestError.message : "重置 API key 失败");
                    })
                    .finally(() => setIsRotating(false));
                });
              }}
              variant="secondary"
            >
              重置 API key
            </Button>
          </div>
        </Card.Content>
      </Card>
    </PageShell>
  );
}
