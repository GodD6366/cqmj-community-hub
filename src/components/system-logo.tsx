import { cn } from "@heroui/react";
import { getCommunityName } from "@/lib/community-brand";

const communityName = getCommunityName();

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
      <div className={cn("app-logo-mark", markClassName)}>
        <span className="relative text-lg font-bold">邻</span>
      </div>
      {showLabel ? (
        <div className="min-w-0">
          <div className="section-kicker">{communityName}</div>
          <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">居民共创协作平台</div>
        </div>
      ) : null}
    </div>
  );
}
