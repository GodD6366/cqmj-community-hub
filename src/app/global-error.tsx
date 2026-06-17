"use client";

import { useEffect } from "react";
import { Button, Card } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="min-h-dvh antialiased">
        <div className="flex min-h-dvh items-center justify-center p-4">
          <Card className="app-panel-strong flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <div>
              <Card.Title className="justify-center text-2xl">出现错误</Card.Title>
              <Card.Description className="mt-2">
                应用遇到了意外状况，请尝试刷新页面。
              </Card.Description>
            </div>
            <Button className="min-h-11 font-bold" onPress={reset} variant="secondary">
              重试
            </Button>
          </Card>
        </div>
      </body>
    </html>
  );
}
