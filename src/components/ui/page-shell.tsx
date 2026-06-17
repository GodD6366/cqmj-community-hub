import type { ReactNode } from "react";
import { cn } from "@heroui/react";

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={cn("mx-auto max-w-6xl p-4 md:p-6 lg:p-8", className)}>{children}</main>;
}
