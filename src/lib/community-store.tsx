"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CommunityPost, CommunityUser, PostDraft } from "./types";

interface AuthPayload {
  username: string;
  password: string;
  inviteCode?: string;
  roomNumber?: string;
}

interface CommunityStore {
  posts: CommunityPost[];
  currentUser: CommunityUser | null;
  hydrated: boolean;
  refresh: () => Promise<void>;
  addPost: (draft: PostDraft) => Promise<string>;
  addComment: (
    postId: string,
    comment: { content: string },
  ) => Promise<{ id: string; authorName: string; content: string; createdAt: string }>;
  toggleFavorite: (postId: string) => Promise<boolean>;
  reportPost: (postId: string, reason?: string) => Promise<void>;
  login: (payload: AuthPayload) => Promise<CommunityUser>;
  register: (payload: Required<AuthPayload>) => Promise<CommunityUser>;
  logout: () => Promise<void>;
}

export function filterPublicPosts(posts: CommunityPost[]) {
  return posts.filter((post) => post.status === "published" && post.visibility !== "private");
}

const CommunityPostsContext = createContext<CommunityStore | null>(null);

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const error = body && typeof body === "object" && "error" in body ? String((body as { error?: unknown }).error ?? "请求失败") : "请求失败";
    throw new Error(error);
  }
  if (body === null) {
    throw new Error("响应为空");
  }
  return body;
}

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [currentUser, setCurrentUser] = useState<CommunityUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/posts", { cache: "no-store" });
    const data = await readJson<{ posts: CommunityPost[]; currentUser: CommunityUser | null }>(response);
    setPosts(data.posts ?? []);
    setCurrentUser(data.currentUser ?? null);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch {
        setPosts([]);
        setCurrentUser(null);
      } finally {
        setHydrated(true);
      }
    })();
  }, [refresh]);

  const addPost = useCallback(
    async (draft: PostDraft) => {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      const data = await readJson<{ id: string }>(response);
      await refresh();
      return data.id;
    },
    [refresh],
  );

  const addComment = useCallback(
    async (postId: string, comment: { content: string }) => {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(comment),
      });
      const data = await readJson<{ comment: { id: string; authorName: string; content: string; createdAt: string } }>(response);
      await refresh();
      return data.comment;
    },
    [refresh],
  );

  const toggleFavorite = useCallback(
    async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}/favorite`, {
        method: "POST",
        credentials: "include",
      });
      const data = await readJson<{ favorited: boolean }>(response);
      await refresh();
      return data.favorited;
    },
    [refresh],
  );

  const reportPost = useCallback(
    async (postId: string, reason?: string) => {
      const response = await fetch(`/api/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      await readJson<{ ok: boolean }>(response);
      await refresh();
    },
    [refresh],
  );

  const login = useCallback(
    async (payload: AuthPayload) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ user: CommunityUser }>(response);
      await refresh();
      return data.user;
    },
    [refresh],
  );

  const register = useCallback(
    async (payload: Required<AuthPayload>) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ user: CommunityUser }>(response);
      await refresh();
      return data.user;
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    await readJson<{ ok: boolean }>(response);
    await refresh();
  }, [refresh]);

  const value = useMemo<CommunityStore>(
    () => ({
      posts,
      currentUser,
      hydrated,
      refresh,
      addPost,
      addComment,
      toggleFavorite,
      reportPost,
      login,
      register,
      logout,
    }),
    [addComment, addPost, currentUser, hydrated, login, logout, posts, refresh, register, reportPost, toggleFavorite],
  );

  return <CommunityPostsContext.Provider value={value}>{children}</CommunityPostsContext.Provider>;
}

export function useCommunityPosts() {
  const context = useContext(CommunityPostsContext);
  if (!context) {
    throw new Error("useCommunityPosts must be used within CommunityProvider");
  }
  return context;
}
