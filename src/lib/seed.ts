import { seedPosts } from "./mock-data";
import { prisma } from "./db";

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const count = await prisma.post.count();
      if (count > 0) return;

      await prisma.$transaction(async (tx) => {
        for (const post of seedPosts) {
          await tx.post.create({
            data: {
              id: post.id,
              title: post.title,
              content: post.content,
              category: post.category,
              tags: JSON.stringify(post.tags),
              authorName: post.authorName,
              createdAt: new Date(post.createdAt),
              updatedAt: new Date(post.updatedAt),
              commentCount: post.commentCount,
              favoriteCount: post.favoriteCount,
              visibility: post.visibility,
              status: post.status,
              pinned: Boolean(post.pinned),
              featured: Boolean(post.featured),
            },
          });

          for (const comment of post.comments) {
            await tx.comment.create({
              data: {
                id: comment.id,
                postId: post.id,
                authorName: comment.authorName,
                content: comment.content,
                createdAt: new Date(comment.createdAt),
              },
            });
          }
        }
      });
    })();
  }

  return seedPromise;
}
