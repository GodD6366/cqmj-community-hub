import Link from "next/link";
import { Card } from "@heroui/react";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="app-panel-strong flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <SearchX className="h-10 w-10" />
        </div>
        <div>
          <Card.Title className="justify-center text-2xl">页面不存在</Card.Title>
          <Card.Description className="mt-2">
            你访问的页面可能已被移除或链接有误。
          </Card.Description>
        </div>
        <div className="flex gap-3">
          <Link
            href="/"
            className="app-action border border-border bg-white/80 px-4 text-sm text-foreground hover:bg-muted/50"
          >
            返回首页
          </Link>
        </div>
      </Card>
    </div>
  );
}
