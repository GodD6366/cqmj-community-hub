import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import type {
  NotificationItem,
  NotificationType,
  PollDraft,
  PollSummary,
  ServiceTicketDraft,
  ServiceTicketStatus,
  ServiceTicketSummary,
} from "./types";
import { serviceTicketCategoryMeta } from "./types";
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
    status: "active" | "closed";
    endsAt: Date | null;
    createdAt: Date;
    totalVotes: number;
    options: Array<{ id: string; label: string; voteCount: number }>;
  },
  selectedOptionId: string | null,
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
  return polls.map((poll) => mapPoll(poll, voteMap.get(poll.id) ?? null));
}

export async function createPollForViewer(
  viewer: { id: string; username: string },
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
        authorName: viewer.username,
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
  viewer: { id: string; username: string },
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
        body: `${viewer.username} 参与了投票`,
        href: "/neighbors",
      });
    }
  });
}

export async function listServiceTicketsForViewer(viewerId: string | null, limit = 12) {
  const tickets = await prisma.serviceTicket.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return tickets.map((ticket) => mapServiceTicket(ticket, viewerId));
}

export async function createServiceTicketForViewer(
  viewer: { id: string; username: string; roomNumber?: string },
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
        authorName: viewer.username,
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

export async function listPollsForAdmin() {
  return listPollsForViewer(null, 24);
}

export async function listServiceTicketsForAdmin() {
  return listServiceTicketsForViewer(null, 50);
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
