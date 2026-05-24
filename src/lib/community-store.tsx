"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  CommunityPost,
  CommunityUser,
  NotificationItem,
  PollDraft,
  PollUpdateDraft,
  PollSummary,
  PostDraft,
  RequestStatus,
  ServiceTicketDraft,
  ServiceTicketSummary,
  NeighborSkillSummary,
  NeighborSkillDraft,
} from "./types";

interface AuthPayload {
  username: string;
  password: string;
  inviteCode?: string;
  roomNumber?: string;
}

interface CommunityStore {
  posts: CommunityPost[];
  polls: PollSummary[];
  neighborSkills: NeighborSkillSummary[];
  serviceTickets: ServiceTicketSummary[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  currentUser: CommunityUser | null;
  hydrated: boolean;
  refresh: () => Promise<void>;
  markNotificationsRead: (ids?: string[]) => Promise<number>;
  addPost: (draft: PostDraft) => Promise<string>;
  updatePost: (postId: string, draft: PostDraft) => Promise<void>;
  updateRequestStatus: (postId: string, status: RequestStatus) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  addPoll: (draft: PollDraft) => Promise<string>;
  updatePoll: (pollId: string, draft: PollUpdateDraft) => Promise<void>;
  deletePoll: (pollId: string) => Promise<void>;
  votePoll: (pollId: string, optionId: string) => Promise<void>;
  addServiceTicket: (draft: ServiceTicketDraft) => Promise<string>;
  updateServiceTicket: (ticketId: string, draft: ServiceTicketDraft) => Promise<void>;
  deleteServiceTicket: (ticketId: string) => Promise<void>;
  addNeighborSkill: (draft: NeighborSkillDraft) => Promise<string>;
  updateNeighborSkill: (skillId: string, draft: NeighborSkillDraft) => Promise<void>;
  addComment: (
    postId: string,
    comment: { content: string },
  ) => Promise<{ id: string; authorName: string; content: string; createdAt: string }>;
  updateComment: (
    postId: string,
    commentId: string,
    comment: { content: string },
  ) => Promise<{ id: string; authorName: string; content: string; createdAt: string }>;
  toggleFavorite: (postId: string) => Promise<boolean>;
  reportPost: (postId: string, reason?: string) => Promise<void>;
  updateProfile: (payload: { username: string; nickname: string; roomNumber: string }) => Promise<CommunityUser>;
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
    const error =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: unknown }).error ?? "请求失败")
        : "请求失败";
    throw new Error(error);
  }
  if (body === null) {
    throw new Error("响应为空");
  }
  return body;
}

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [neighborSkills, setNeighborSkills] = useState<NeighborSkillSummary[]>([]);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicketSummary[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<CommunityUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/posts", { cache: "no-store" });
    const data = await readJson<{
      posts: CommunityPost[];
      polls: PollSummary[];
      neighborSkills: NeighborSkillSummary[];
      serviceTickets: ServiceTicketSummary[];
      notifications: NotificationItem[];
      unreadNotificationCount: number;
      currentUser: CommunityUser | null;
    }>(response);

    setPosts(data.posts ?? []);
    setPolls(data.polls ?? []);
    setNeighborSkills(data.neighborSkills ?? []);
    setServiceTickets(data.serviceTickets ?? []);
    setNotifications(data.notifications ?? []);
    setUnreadNotificationCount(data.unreadNotificationCount ?? 0);
    setCurrentUser(data.currentUser ?? null);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch {
        setPosts([]);
        setPolls([]);
        setServiceTickets([]);
        setNotifications([]);
        setUnreadNotificationCount(0);
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

  const updatePost = useCallback(
    async (postId: string, draft: PostDraft) => {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      await readJson<{ ok: boolean }>(response);
      await refresh();
    },
    [refresh],
  );

  const updateRequestStatus = useCallback(
    async (postId: string, status: RequestStatus) => {
      const response = await fetch(`/api/posts/${postId}/request-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestStatus: status }),
      });
      await readJson<{ ok: boolean }>(response);
      await refresh();
    },
    [refresh],
  );

  const deletePost = useCallback(
    async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      await readJson<{ ok: boolean }>(response);
      await refresh();
    },
    [refresh],
  );

  const addPoll = useCallback(
    async (draft: PollDraft) => {
      const response = await fetch("/api/polls", {
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

  const votePoll = useCallback(
    async (pollId: string, optionId: string) => {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ optionId }),
      });
      await readJson<{ ok: boolean }>(response);
      await refresh();
    },
    [refresh],
  );

  const updatePoll = useCallback(
    async (pollId: string, draft: PollUpdateDraft) => {
      const response = await fetch(`/api/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      await readJson<{ ok: boolean }>(response);
      await refresh();
    },
    [refresh],
  );

  const deletePoll = useCallback(
    async (pollId: string) => {
      const response = await fetch(`/api/polls/${pollId}`, {
        method: "DELETE",
        credentials: "include",
      });
      await readJson<{ ok: boolean }>(response);
      await refresh();
    },
    [refresh],
  );

  const addNeighborSkill = useCallback(
    async (draft: NeighborSkillDraft) => {
      const response = await fetch("/api/skills", {
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

  const updateNeighborSkill = useCallback(
    async (skillId: string, draft: NeighborSkillDraft) => {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      await readJson<{ ok: boolean }>(response);
      await refresh();
    },
    [refresh],
  );

  const addServiceTicket = useCallback(
    async (draft: ServiceTicketDraft) => {
      const response = await fetch("/api/service-tickets", {
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

  const updateServiceTicket = useCallback(
    async (ticketId: string, draft: ServiceTicketDraft) => {
      const response = await fetch(`/api/service-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      await readJson<{ ok: boolean }>(response);
      await refresh();
    },
    [refresh],
  );

  const deleteServiceTicket = useCallback(
    async (ticketId: string) => {
      const response = await fetch(`/api/service-tickets/${ticketId}`, {
        method: "DELETE",
        credentials: "include",
      });
      await readJson<{ ok: boolean }>(response);
      await refresh();
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
      const data = await readJson<{
        comment: { id: string; authorName: string; content: string; createdAt: string };
      }>(response);
      await refresh();
      return data.comment;
    },
    [refresh],
  );

  const updateComment = useCallback(
    async (postId: string, commentId: string, comment: { content: string }) => {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(comment),
      });
      const data = await readJson<{
        comment: { id: string; authorName: string; content: string; createdAt: string };
      }>(response);
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

  const updateProfile = useCallback(
    async (payload: { username: string; nickname: string; roomNumber: string }) => {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ user: CommunityUser }>(response);
      setCurrentUser(data.user);
      await refresh();
      return data.user;
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

  const markNotificationsRead = useCallback(
    async (ids?: string[]) => {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      const data = await readJson<{ ok: boolean; count: number }>(response);
      await refresh();
      return data.count ?? 0;
    },
    [refresh],
  );

  const value = useMemo<CommunityStore>(
    () => ({
      posts,
      polls,
      neighborSkills,
      serviceTickets,
      notifications,
      unreadNotificationCount,
      currentUser,
      hydrated,
      refresh,
      markNotificationsRead,
      addPost,
      updatePost,
      updateRequestStatus,
      deletePost,
      addPoll,
      updatePoll,
      deletePoll,
      votePoll,
      addServiceTicket,
      updateServiceTicket,
      deleteServiceTicket,
      addNeighborSkill,
      updateNeighborSkill,
      addComment,
      updateComment,
      toggleFavorite,
      reportPost,
      updateProfile,
      login,
      register,
      logout,
    }),
    [
      addComment,
      updateComment,
      addPoll,
      addPost,
      addServiceTicket,
      deletePoll,
      deleteServiceTicket,
      currentUser,
      deletePost,
      hydrated,
      login,
      logout,
      markNotificationsRead,
      notifications,
      polls,
      posts,
      refresh,
      register,
      reportPost,
      serviceTickets,
      toggleFavorite,
      unreadNotificationCount,
      updateComment,
      updatePoll,
      updateProfile,
      updateRequestStatus,
      updateServiceTicket,
      updatePost,
      votePoll,
    ],
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
