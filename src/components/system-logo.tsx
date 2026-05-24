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
      <div className={cn("relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.1rem] border border-[rgba(57,245,143,0.24)] bg-[linear-gradient(135deg,rgba(57,245,143,0.18),rgba(72,201,255,0.12))] text-[var(--primary)] shadow-[0_0_24px_rgba(57,245,143,0.16)]", markClassName)}>
        <span className="absolute inset-[3px] rounded-[0.95rem] border border-[rgba(255,255,255,0.04)] bg-[rgba(5,14,12,0.92)]" />
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
