import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@heroui/react";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
}: EmptyStateProps) {
  return (
    <Card className="app-panel flex flex-col items-center gap-4 p-8 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : <div className="map-coordinate">暂无记录</div>}
      <div>
        <Card.Title className="app-display justify-center text-2xl">{title}</Card.Title>
        {description && (
          <Card.Description className="mt-2 leading-6">{description}</Card.Description>
        )}
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="app-action border border-border bg-white/80 px-4 text-sm text-foreground hover:bg-white"
        >
          {actionLabel}
        </Link>
      )}
    </Card>
  );
}
