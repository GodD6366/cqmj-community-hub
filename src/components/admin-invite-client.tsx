"use client";

import { useEffect, useMemo, useState } from "react";

type InviteCode = {
  id: string;
  code: string;
  note: string | null;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String((body as { error?: unknown }).error ?? "请求失败") : "请求失败";
    throw new Error(message);
  }
  if (body === null) {
    throw new Error("响应为空");
  }
  return body;
}

export function AdminInviteClient() {
  const [adminPassword, setAdminPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sortedCodes = useMemo(() => inviteCodes.slice().sort((a, b) => Number(b.active) - Number(a.active)), [inviteCodes]);

  const loadCodes = async () => {
    const response = await fetch("/api/admin/invite-codes", { cache: "no-store" });
    if (response.status === 401) {
      setLoggedIn(false);
      return;
    }
    const data = await readJson<{ inviteCodes: InviteCode[] }>(response);
    setInviteCodes(data.inviteCodes ?? []);
    setLoggedIn(true);
  };

  useEffect(() => {
    void loadCodes().catch(() => undefined);
  }, []);

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      await readJson(
        await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: adminPassword }),
        }),
      );
      setLoggedIn(true);
      await loadCodes();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "管理员登录失败");
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await readJson(
        await fetch("/api/admin/invite-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            code,
            note,
            maxUses: maxUses ? Number(maxUses) : null,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          }),
        }),
      );
      setCode("");
      setNote("");
      setMaxUses("");
      setExpiresAt("");
      setMessage("邀请码已创建");
      await loadCodes();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  const updateInvite = async (id: string, active: boolean) => {
    setLoading(true);
    setError("");
    try {
      await readJson(
        await fetch(`/api/admin/invite-codes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ active }),
        }),
      );
      await loadCodes();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "更新失败");
    } finally {
      setLoading(false);
    }
  };

  const removeInvite = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      await readJson(
        await fetch(`/api/admin/invite-codes/${id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      await loadCodes();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "删除失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-slate-500">管理员后台</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">邀请码管理</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          在这里可以创建、停用和删除邀请码。注册页会校验这些邀请码，用户登录仍然使用用户名 + 密码。
        </p>
      </section>

      {!loggedIn ? (
        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">管理员登录</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
              placeholder="管理员密码"
            />
            <button
              type="button"
              disabled={loading}
              onClick={login}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </div>
          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </section>
      ) : (
        <>
          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900">创建邀请码</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
                placeholder="邀请码，例如: WELCOME-2026"
              />
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
                placeholder="备注，例如: 1 号楼新住户"
              />
              <input
                value={maxUses}
                onChange={(event) => setMaxUses(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
                placeholder="使用次数上限（可空）"
              />
              <input
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
                placeholder="过期时间 ISO 字符串（可空）"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={createInvite}
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? "保存中..." : "创建邀请码"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  await fetch("/api/admin/logout", { method: "POST" });
                  setLoggedIn(false);
                  setAdminPassword("");
                }}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700"
              >
                退出管理员
              </button>
            </div>
            {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          </section>

          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900">现有邀请码</h2>
            <div className="mt-4 space-y-4">
              {sortedCodes.length === 0 ? (
                <p className="text-sm text-slate-500">还没有邀请码，先创建一个。</p>
              ) : (
                sortedCodes.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{item.code}</h3>
                        <p className="text-sm text-slate-600">
                          {item.note || "无备注"} · 已用 {item.usedCount}
                          {item.maxUses === null ? "" : ` / ${item.maxUses}`}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {item.active ? "启用中" : "已停用"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => updateInvite(item.id, !item.active)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700"
                      >
                        {item.active ? "停用" : "启用"}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => removeInvite(item.id)}
                        className="rounded-full border border-rose-200 bg-white px-4 py-2 text-rose-600"
                      >
                        删除
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
