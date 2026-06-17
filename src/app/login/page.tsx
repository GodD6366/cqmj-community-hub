import { Suspense } from "react";
import { Spinner, Card } from "@heroui/react";
import { LoginClient } from "@/components/login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="flex items-center gap-3 p-8 text-sm text-muted-foreground">
            <Spinner size="sm" />
            加载中
          </Card>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
