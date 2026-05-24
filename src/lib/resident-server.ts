import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import type {
  AdminPollSummary,
  NotificationItem,
  NotificationType,
  PollDraft,
  PollSummary,
  PollUpdateDraft,
  ServiceTicketDraft,
  ServiceTicketStatus,
  ServiceTicketSummary,
} from "./types";
import { serviceTicketCategoryMeta } from "./types";
import { getBuildingFromRoomNumber } from "./access-control";
import { normalizeText } from "./utils";

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizePollOptions(options: string[]) {
  return Array.from(
    new Set(
      options
        .map((option) => normalizeText(option))
        .filter(Boolean),
    ),
  );
}

function mapPoll(
  poll: {
    id: string;
    title: string;
    description: string;
    authorName: string;
    authorId?: string | null;
    status: "active" | "closed";
    endsAt: Date | null;
    createdAt: Date;
    totalVotes: number;
    options: Array<{ id: string; label: string; voteCount: number }>;
  },
  selectedOptionId: string | null,
  viewerId: string | null,
): PollSummary {
  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    authorName: poll.authorName,
    status: poll.status,
    endsAt: toIsoString(poll.endsAt),
    createdAt: poll.createdAt.toISOString(),
    totalVotes: poll.totalVotes,
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      voteCount: option.voteCount,
    })),
    hasVoted: Boolean(selectedOptionId),
    selectedOptionId,
    isMine: Boolean(viewerId && poll.authorId && poll.authorId === viewerId),
  };
}

function mapServiceTicket(
  ticket: {
    id: string;
    title: string;
    description: string;
    category: keyof typeof serviceTicketCategoryMeta;
    status: "open" | "processing" | "resolved";
    authorName: string;
    roomNumber: string | null;
    assigneeNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt: Date | null;
    authorId: string | null;
  },
  viewerId: string | null,
): ServiceTicketSummary {
  const isMine = Boolean(viewerId && ticket.authorId === viewerId);

  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
    status: ticket.status,
    authorName: ticket.authorName,
    roomNumber: isMine ? ticket.roomNumber ?? "" : "",
    assigneeNote: ticket.assigneeNote,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: toIsoString(ticket.resolvedAt),
    isMine,
  };
}

function mapNotification(notification: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  createdAt: Date;
  readAt: Date | null;
}): NotificationItem {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    createdAt: notification.createdAt.toISOString(),
    readAt: toIsoString(notification.readAt),
  };
}

export async function closeExpiredPolls(client: Prisma.TransactionClient | typeof prisma = prisma) {
  await client.poll.updateMany({
    where: {
      status: "active",
      endsAt: {
        lt: new Date(),
      },
    },
    data: {
      status: "closed",
    },
  });
}

export async function createNotificationRecord(
  client: Prisma.TransactionClient | typeof prisma,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    href?: string | null;
    readAt?: Date | null;
  },
) {
  return client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      readAt: input.readAt ?? null,
    },
  });
}

export async function listPollsForViewer(viewerId: string | null, limit = 6) {
  await closeExpiredPolls();

  const polls = await prisma.poll.findMany({
    include: {
      options: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: [{ status: "asc" }, { totalVotes: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const pollIds = polls.map((poll) => poll.id);
  const viewerVotes =
    viewerId && pollIds.length > 0
      ? await prisma.pollVote.findMany({
          where: {
            userId: viewerId,
            pollId: { in: pollIds },
          },
          select: {
            pollId: true,
            optionId: true,
          },
        })
      : [];

  const voteMap = new Map(viewerVotes.map((vote) => [vote.pollId, vote.optionId]));
  return polls.map((poll) => mapPoll(poll, voteMap.get(poll.id) ?? null, viewerId));
}

export async function createPollForViewer(
  viewer: { id: string; nickname: string },
  draft: PollDraft,
) {
  const title = normalizeText(draft.title);
  const description = normalizeText(draft.description);
  const options = normalizePollOptions(draft.options);

  if (!title || !description) {
    throw new Error("INVALID_POLL_CONTENT");
  }

  if (options.length < 2) {
    throw new Error("INVALID_POLL_OPTIONS");
  }

  const endsAt = draft.endsAt ? new Date(draft.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new Error("INVALID_POLL_ENDS_AT");
  }
  if (endsAt && endsAt.getTime() <= Date.now()) {
    throw new Error("INVALID_POLL_ENDS_AT");
  }

  return prisma.$transaction(async (tx) => {
    const poll = await tx.poll.create({
      data: {
        title,
        description,
        authorName: viewer.nickname,
        authorId: viewer.id,
        endsAt,
        options: {
          create: options.map((option, index) => ({
            label: option,
            sortOrder: index,
          })),
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    await createNotificationRecord(tx, {
      userId: viewer.id,
      type: "poll",
      title: "你发起了一个新投票",
      body: poll.title,
      href: "/neighbors",
    });

    return poll.id;
  });
}

export async function votePollForViewer(
  pollId: string,
  optionId: string,
  viewer: { id: string; nickname: string },
) {
  return prisma.$transaction(async (tx) => {
    await closeExpiredPolls(tx);

    const poll = await tx.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        title: true,
        authorId: true,
        status: true,
        endsAt: true,
      },
    });

    if (!poll) {
      throw new Error("POLL_NOT_FOUND");
    }

    if (poll.status !== "active" || (poll.endsAt && poll.endsAt.getTime() <= Date.now())) {
      throw new Error("POLL_CLOSED");
    }

    const existingVote = await tx.pollVote.findUnique({
      where: {
        pollId_userId: {
          pollId,
          userId: viewer.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingVote) {
      throw new Error("POLL_ALREADY_VOTED");
    }

    const option = await tx.pollOption.findFirst({
      where: {
        id: optionId,
        pollId,
      },
      select: {
        id: true,
        label: true,
      },
    });

    if (!option) {
      throw new Error("POLL_OPTION_NOT_FOUND");
    }

    await tx.pollVote.create({
      data: {
        pollId,
        optionId: option.id,
        userId: viewer.id,
      },
    });

    await tx.pollOption.update({
      where: {
        id: option.id,
      },
      data: {
        voteCount: {
          increment: 1,
        },
      },
    });

    await tx.poll.update({
      where: {
        id: pollId,
      },
      data: {
        totalVotes: {
          increment: 1,
        },
      },
    });

    await createNotificationRecord(tx, {
      userId: viewer.id,
      type: "poll",
      title: `你参与了投票「${poll.title}」`,
      body: `已投给：${option.label}`,
      href: "/neighbors",
    });

    if (poll.authorId && poll.authorId !== viewer.id) {
      await createNotificationRecord(tx, {
        userId: poll.authorId,
        type: "poll",
        title: `你的投票「${poll.title}」收到了新参与`,
        body: `${viewer.nickname} 参与了投票`,
        href: "/neighbors",
      });
    }
  });
}

export async function updatePollForViewer(
  pollId: string,
  viewer: { id: string; nickname: string; role?: string },
  draft: PollUpdateDraft,
) {
  const current = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      title: true,
      authorId: true,
      status: true,
    },
  });

  if (!current) {
    return { status: "not_found" as const };
  }

  if (current.authorId !== viewer.id && viewer.role !== "admin") {
    return { status: "forbidden" as const };
  }

  const title = normalizeText(draft.title);
  const description = normalizeText(draft.description);
  const options = normalizePollOptions(draft.options);
  if (!title || !description) {
    throw new Error("INVALID_POLL_CONTENT");
  }
  if (options.length < 2) {
    throw new Error("INVALID_POLL_OPTIONS");
  }

  const endsAt = draft.endsAt ? new Date(draft.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new Error("INVALID_POLL_ENDS_AT");
  }

  const nextStatus = draft.status ?? current.status;
  if (nextStatus !== "active" && nextStatus !== "closed") {
    throw new Error("INVALID_POLL_STATUS");
  }

  await prisma.$transaction(async (tx) => {
    await tx.pollOption.deleteMany({
      where: { pollId },
    });

    const updated = await tx.poll.update({
      where: { id: pollId },
      data: {
        title,
        description,
        endsAt,
        status: nextStatus,
        totalVotes: 0,
        options: {
          create: options.map((option, index) => ({
            label: option,
            sortOrder: index,
          })),
        },
        votes: {
          deleteMany: {},
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    await createNotificationRecord(tx, {
      userId: viewer.id,
      type: "poll",
      title: `你的投票「${updated.title}」已更新`,
      body: nextStatus === "closed" ? "已结束" : "内容已保存",
      href: "/neighbors",
    });
  });

  return { status: "ok" as const };
}

export async function deletePollForViewer(
  pollId: string,
  viewer: { id: string; nickname: string; role?: string },
) {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      title: true,
      authorId: true,
    },
  });

  if (!poll) {
    return { status: "not_found" as const };
  }

  if (poll.authorId !== viewer.id && viewer.role !== "admin") {
    return { status: "forbidden" as const };
  }

  await prisma.poll.delete({
    where: { id: pollId },
  });

  return { status: "ok" as const };
}

export async function listServiceTicketsForViewer(viewerId: string | null, limit = 12) {
  const tickets = await prisma.serviceTicket.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return tickets.map((ticket) => mapServiceTicket(ticket, viewerId));
}

export async function createServiceTicketForViewer(
  viewer: { id: string; nickname: string; roomNumber?: string },
  draft: ServiceTicketDraft,
) {
  const title = normalizeText(draft.title);
  const description = normalizeText(draft.description);

  if (!title || !description) {
    throw new Error("INVALID_TICKET_CONTENT");
  }

  if (!(draft.category in serviceTicketCategoryMeta)) {
    throw new Error("INVALID_TICKET_CATEGORY");
  }

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.serviceTicket.create({
      data: {
        title,
        description,
        category: draft.category,
        authorName: viewer.nickname,
        authorId: viewer.id,
        roomNumber: viewer.roomNumber ?? null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    await createNotificationRecord(tx, {
      userId: viewer.id,
      type: "ticket",
      title: "你的报修报事已提交",
      body: ticket.title,
      href: "/services",
    });

    return ticket.id;
  });
}

export async function listNotificationsForViewer(userId: string, limit = 30) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return notifications.map(mapNotification);
}

export async function countUnreadNotificationsForViewer(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function markNotificationsReadForViewer(userId: string, notificationIds?: string[]) {
  const where =
    notificationIds && notificationIds.length > 0
      ? {
          userId,
          id: { in: notificationIds },
          readAt: null,
        }
      : {
          userId,
          readAt: null,
        };

  const result = await prisma.notification.updateMany({
    where,
    data: {
      readAt: new Date(),
    },
  });

  return result.count;
}

export async function listPollsForAdmin(): Promise<AdminPollSummary[]> {
  await closeExpiredPolls();

  const polls = await prisma.poll.findMany({
    include: {
      options: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: [{ status: "asc" }, { totalVotes: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return polls.map((poll) => ({
    ...mapPoll(poll, null, null),
    authorId: poll.authorId,
    optionCount: poll.options.length,
  }));
}

export async function updatePollForAdmin(
  pollId: string,
  input: {
    title?: string;
    description?: string;
    endsAt?: Date | null;
    status?: "active" | "closed";
  },
) {
  const current = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      title: true,
      authorId: true,
      status: true,
    },
  });

  if (!current) {
    throw new Error("POLL_NOT_FOUND");
  }

  const data: Prisma.PollUpdateInput = {};
  if (input.title !== undefined) {
    const title = normalizeText(input.title);
    if (!title) throw new Error("INVALID_POLL_CONTENT");
    data.title = title;
  }
  if (input.description !== undefined) {
    const description = normalizeText(input.description);
    if (!description) throw new Error("INVALID_POLL_CONTENT");
    data.description = description;
  }
  if (input.endsAt !== undefined) {
    if (input.endsAt && Number.isNaN(input.endsAt.getTime())) {
      throw new Error("INVALID_POLL_ENDS_AT");
    }
    data.endsAt = input.endsAt;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.poll.update({
      where: { id: pollId },
      data,
      include: {
        options: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (current.authorId) {
      await createNotificationRecord(tx, {
        userId: current.authorId,
        type: "poll",
        title: `投票「${updated.title}」已由管理员更新`,
        body: updated.status === "closed" ? "该投票已被管理员结束。" : "投票信息已更新。",
        href: "/neighbors",
      });
    }

    return {
      ...mapPoll(updated, null, null),
      authorId: updated.authorId,
      optionCount: updated.options.length,
    };
  });
}

export async function deletePollForAdmin(pollId: string) {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      title: true,
      authorId: true,
    },
  });

  if (!poll) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.poll.delete({
      where: { id: pollId },
    });

    if (poll.authorId) {
      await createNotificationRecord(tx, {
        userId: poll.authorId,
        type: "poll",
        title: `投票「${poll.title}」已被管理员删除`,
        body: "该投票已从社区中移除。",
        href: "/neighbors",
      });
    }
  });

  return true;
}

export async function listServiceTicketsForAdmin() {
  return listServiceTicketsForViewer(null, 50);
}

export async function updateServiceTicketForViewer(
  ticketId: string,
  viewer: { id: string; nickname: string; roomNumber?: string; role?: string },
  draft: ServiceTicketDraft,
) {
  const current = await prisma.serviceTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      authorId: true,
      status: true,
    },
  });

  if (!current) {
    return { status: "not_found" as const };
  }

  if (current.authorId !== viewer.id && viewer.role !== "admin") {
    return { status: "forbidden" as const };
  }

  const title = normalizeText(draft.title);
  const description = normalizeText(draft.description);
  if (!title || !description) {
    throw new Error("INVALID_TICKET_CONTENT");
  }
  if (!(draft.category in serviceTicketCategoryMeta)) {
    throw new Error("INVALID_TICKET_CATEGORY");
  }

  await prisma.serviceTicket.update({
    where: { id: ticketId },
    data: {
      title,
      description,
      category: draft.category,
      roomNumber: viewer.roomNumber ?? null,
    },
  });

  return { status: "ok" as const };
}

export async function deleteServiceTicketForViewer(
  ticketId: string,
  viewer: { id: string; role?: string },
) {
  const current = await prisma.serviceTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!current) {
    return { status: "not_found" as const };
  }

  if (current.authorId !== viewer.id && viewer.role !== "admin") {
    return { status: "forbidden" as const };
  }

  await prisma.serviceTicket.delete({
    where: { id: ticketId },
  });

  return { status: "ok" as const };
}

export function canViewerSeeBuildingScopedResource(
  viewerRoomNumber: string | null | undefined,
  authorRoomNumber: string | null | undefined,
) {
  const viewerBuilding = getBuildingFromRoomNumber(viewerRoomNumber);
  const authorBuilding = getBuildingFromRoomNumber(authorRoomNumber);

  return Boolean(viewerBuilding && authorBuilding && viewerBuilding === authorBuilding);
}

export async function updateServiceTicketStatusForAdmin(
  ticketId: string,
  status: ServiceTicketStatus,
  assigneeNote?: string,
) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.serviceTicket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        title: true,
        authorId: true,
      },
    });

    if (!ticket) {
      throw new Error("TICKET_NOT_FOUND");
    }

    const note = assigneeNote ? normalizeText(assigneeNote) : null;
    const updated = await tx.serviceTicket.update({
      where: {
        id: ticketId,
      },
      data: {
        status,
        assigneeNote: note,
        resolvedAt: status === "resolved" ? new Date() : null,
      },
    });

    if (ticket.authorId) {
      await createNotificationRecord(tx, {
        userId: ticket.authorId,
        type: "ticket",
        title: `工单「${ticket.title}」状态已更新`,
        body:
          status === "resolved"
            ? "物业已将你的工单标记为已完成。"
            : status === "processing"
              ? "物业正在跟进处理你的工单。"
              : "工单已重新回到待处理列表。",
        href: "/services",
      });
    }

    return updated;
  });
}
