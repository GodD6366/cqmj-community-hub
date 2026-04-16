"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PostEditor } from "./post-editor";
import { useCommunityPosts } from "./community-provider";
import type { PostDraft } from "../lib/types";

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
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-4">
        {!currentUser ? (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-800 shadow-sm">
            你还没有登录。要先 <Link href="/login" className="font-semibold underline underline-offset-4">登录或注册</Link>，才能发布帖子。
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorMessage}
          </div>
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
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            登录后即可发布需求、闲置和交流内容。
          </div>
        )}
      </div>
    </main>
  );
}
