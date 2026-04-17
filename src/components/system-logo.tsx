import Image from "next/image";
import { cn } from "@heroui/react";

export function SystemLogo({
  className,
  markClassName,
  showLabel = true,
}: {
  className?: string;
  markClassName?: string;
  showLabel?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        alt="邻里圈 Logo"
        className={cn("h-14 w-14 shrink-0", markClassName)}
        height={56}
        src="/community-hub-logo.svg"
        width={56}
      />
      {showLabel ? (
        <div className="min-w-0">
          <div className="section-kicker text-[rgba(18,18,18,0.58)]">Community Hub</div>
        </div>
      ) : null}
    </div>
  );
}
