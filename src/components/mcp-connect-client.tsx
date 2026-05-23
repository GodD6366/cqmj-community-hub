"use client";

import { startTransition, useMemo, useState } from "react";
import { Alert, Button, Card, Chip, Input, TextArea } from "@heroui/react";
import type { CommunityUser } from "@/lib/types";
import { buildMcpConnectionPromptForUser } from "@/lib/mcp-connect";
import { ResidentMetricGrid, ResidentMobileHero, ResidentMobilePanel } from "./resident-shared";
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
      <div className="mobile-resident-only mobile-resident-stack">
        <ResidentMobileHero
          background="radial-gradient(circle at 16% 18%, rgba(237,170,92,0.28), transparent 24%), radial-gradient(circle at 84% 12%, rgba(96,188,255,0.22), transparent 22%), linear-gradient(160deg, #151f34 0%, #233d63 46%, #31598e 100%)"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="mobile-resident-kicker text-white/72">MCP 接入</div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[0.72rem] font-semibold text-white/82 ring-1 ring-white/10">
              只读
            </span>
          </div>
          <h1 className="mobile-resident-title mt-5 max-w-[8ch]">MCP 接入</h1>

          <ResidentMetricGrid
            className="mt-5"
            items={[
              { label: "账号", value: currentUser.username },
              { label: "模式", value: "只读" },
            ]}
            tone="inverse"
          />
          {welcome ? (
            <Alert className="mt-5" status="success">
              <Alert.Content>
                <Alert.Description>个人密钥已生成。</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
        </ResidentMobileHero>

        <ResidentMobilePanel delay="120ms">
          {error ? (
            <Alert status="danger">
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {message ? (
            <Alert className={error ? "mt-3" : undefined} status="success">
              <Alert.Content>
                <Alert.Description>{message}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <div className={`space-y-3 ${error || message ? "mt-3" : ""}`}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
              <span>MCP 端点</span>
              <Input aria-label="MCP 端点" fullWidth readOnly value={endpoint} variant="secondary" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
              <span>API key</span>
              <Input aria-label="API key" fullWidth readOnly value={token} variant="secondary" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
              <span>接入文案</span>
              <TextArea
                aria-label="接入文案"
                fullWidth
                readOnly
                rows={8}
                value={prompt}
                variant="secondary"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-2.5">
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
                      setMessage("API key 已重置。");
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
            <ButtonLink href="/posts" variant="secondary">
              返回邻里
            </ButtonLink>
          </div>
        </ResidentMobilePanel>
      </div>

      <section className="hidden md:grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <div className="hero-aurora rounded-[1.2rem] p-5 text-white sm:p-6">
          <div className="section-kicker text-white/72">MCP 接入</div>
          <h1 className="editorial-title mt-5 text-[2.7rem] leading-[0.94] font-semibold text-white sm:text-[4.2rem]">
            接入邻里圈 MCP
          </h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Chip color="success" size="sm" variant="soft">
              {currentUser.username} · 个人密钥
            </Chip>
            <Chip color="warning" size="sm" variant="soft">
              Bearer Token
            </Chip>
          </div>
        </div>

        <Card className="glass-card p-5 sm:p-6">
          <Card.Header className="p-0">
            <div className="section-kicker">状态</div>
          </Card.Header>
          <Card.Content className="grid gap-3 p-0 pt-5">
            {[
              "个人凭证",
              "只读",
              "可重置",
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

      <div className="hidden space-y-4 md:block">
        {welcome ? (
          <Alert status="success">
            <Alert.Content>
              <Alert.Description>已生成个人密钥。</Alert.Description>
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
              <div className="section-kicker">配置</div>
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
              <span>接入文案</span>
              <TextArea
                aria-label="接入文案"
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
                        setMessage("API key 已重置。");
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
      </div>
    </PageShell>
  );
}
