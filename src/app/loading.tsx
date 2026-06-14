import { CyberPanel } from "@/components/resident-shared";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[1rem] bg-[rgba(123,166,214,0.12)] ${className}`} />;
}

export default function Loading() {
  return (
    <main className="page-shell">
      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CyberPanel title="正在加载社区页面" kicker="加载中">
          <div className="space-y-3">
            <SkeletonBlock className="h-10 w-40" />
            <SkeletonBlock className="h-4 w-full max-w-[14rem] rounded-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        </CyberPanel>
        <CyberPanel title="内容加载中" kicker="页面骨架">
          <div className="space-y-4">
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-48 w-full" />
          </div>
        </CyberPanel>
      </section>
    </main>
  );
}
