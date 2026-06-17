import { prisma } from "./db";
import { matchSkillsForRequest } from "./skill-matcher";
import type { NeighborSkillCategory, NeighborSkillDraft, NeighborSkillSummary } from "./types";

function parseSkillTags(tags: string) {
  const parsed = JSON.parse(tags || "[]") as unknown;
  return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
}

export async function listNeighborSkillsForViewer(viewerId: string | null): Promise<NeighborSkillSummary[]> {
  const skills = await prisma.neighborSkill.findMany({
    where: { active: true },
    include: {
      user: {
        select: {
          name: true,
          roomNumber: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return skills.map((skill) => ({
    id: skill.id,
    userId: skill.userId,
    ownerName: skill.user.name,
    roomNumber: skill.user.roomNumber ?? "未知",
    building: skill.user.roomNumber ? skill.user.roomNumber.split("-")[0] : "未知",
    category: skill.category as NeighborSkillCategory,
    title: skill.title,
    description: skill.description,
    tags: parseSkillTags(skill.tags),
    availability: skill.availability,
    active: skill.active,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
    isMine: viewerId === skill.userId,
  }));
}

export async function createNeighborSkill(
  userId: string,
  draft: NeighborSkillDraft,
): Promise<string> {
  const skill = await prisma.neighborSkill.create({
    data: {
      userId,
      category: draft.category,
      title: draft.title,
      description: draft.description,
      tags: JSON.stringify(draft.tags),
      availability: draft.availability,
      active: draft.active ?? true,
    },
  });
  return skill.id;
}

export async function updateNeighborSkill(
  skillId: string,
  userId: string,
  draft: NeighborSkillDraft,
): Promise<boolean> {
  const existing = await prisma.neighborSkill.findUnique({
    where: { id: skillId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    return false;
  }

  await prisma.neighborSkill.update({
    where: { id: skillId },
    data: {
      category: draft.category,
      title: draft.title,
      description: draft.description,
      tags: JSON.stringify(draft.tags),
      availability: draft.availability,
      active: draft.active,
    },
  });

  return true;
}

export async function triggerSkillMatching(postId: string, postContent: string) {
  try {
    // 查找所有活跃技能，不包含发帖人自己的技能
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });
    
    if (!post) return;

    const availableSkills = await prisma.neighborSkill.findMany({
      where: { 
        active: true,
        ...(post.authorId ? { userId: { not: post.authorId } } : {})
      },
      select: { id: true, category: true, title: true, description: true, tags: true, userId: true },
    });

    if (availableSkills.length === 0) return;

    const parsedSkills = availableSkills.map(s => ({
      ...s,
      category: s.category as NeighborSkillCategory,
      tags: parseSkillTags(s.tags),
    }));

    const matches = await matchSkillsForRequest(postContent, parsedSkills);

    if (matches.length > 0) {
      // 先删除旧匹配
      await prisma.postSkillMatch.deleteMany({
        where: { postId }
      });

      // 插入新匹配
      await prisma.postSkillMatch.createMany({
        data: matches.map(m => {
          const matchedSkill = availableSkills.find(s => s.id === m.skillId);
          return {
            postId,
            skillId: m.skillId,
            userId: matchedSkill!.userId,
            score: Math.round(m.score * 100),
            reasons: JSON.stringify(m.reasons),
            source: m.source,
          };
        })
      });
    }
  } catch (error) {
    console.error("Failed to trigger skill matching:", error);
  }
}
