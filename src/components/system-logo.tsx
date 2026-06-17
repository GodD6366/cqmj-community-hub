import { cn } from "@heroui/react";
import Image from "next/image";
import { getCommunityName } from "@/lib/community-brand";

const communityName = getCommunityName();
const systemLogoSrc = "/brand/system-logo.png";

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
      <div className={cn("app-logo-mark overflow-hidden", markClassName)}>
        <Image
          src={systemLogoSrc}
          alt={`${communityName} logo`}
          width={96}
          height={96}
          sizes="64px"
          loading="eager"
          className="h-full w-full object-cover"
        />
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
