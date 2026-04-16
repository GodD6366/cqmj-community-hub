
import { PostDetailClient } from "../../../components/post-detail-client";

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;
  return <PostDetailClient postId={id} />;
}
