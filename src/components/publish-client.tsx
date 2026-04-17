"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@heroui/react";
import { PostEditor } from "./post-editor";
import { useCommunityPosts } from "./community-provider";
import type { PostDraft } from "../lib/types";
import { PageShell } from "./ui";

export function PublishClient() {
  const router = useRouter();
  const { addPost, currentUser } = useCommunityPosts();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (draft: PostDraft) => {
    setErrorMessage("");
    const id = await addPost(draft);
    setSuccessMessage("发布成功，正在跳转到新帖子详情页...");
    window.setTimeout(() => {
      router.push(`/posts/${id}`);
    }, 500);
  };

  return (
    <PageShell className="max-w-6xl">
      <div className="space-y-4">
        {!currentUser ? (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>
                你还没有登录。要先 <Link href="/login?next=/publish" className="font-semibold text-[var(--primary)] underline underline-offset-4">登录或注册</Link>，才能发布帖子。
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert status="success">
            <Alert.Content>
              <Alert.Description>{successMessage}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert status="danger">
            <Alert.Content>
              <Alert.Description>{errorMessage}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {currentUser ? (
          <PostEditor
            onSubmit={async (draft) => {
              try {
                await handleSubmit(draft);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "发布失败");
              }
            }}
          />
        ) : (
          <div className="paper-panel rounded-[1.35rem] border border-dashed p-8 text-center text-sm leading-7 text-slate-600">
            登录后即可发布需求、闲置、约玩和交流内容。
          </div>
        )}
      </div>
    </PageShell>
  );
}
