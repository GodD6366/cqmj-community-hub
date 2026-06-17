import { Card, Skeleton } from "@heroui/react";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <Skeleton className="h-12 w-3/4 rounded-xl" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
        <Card className="app-panel space-y-3 p-6">
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-5/6 rounded-lg" />
          <Skeleton className="h-4 w-4/6 rounded-lg" />
        </Card>
        <Card className="app-panel space-y-3 p-6">
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4 rounded-lg" />
        </Card>
        <Card className="app-panel space-y-3 p-6">
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-5/6 rounded-lg" />
        </Card>
      </div>
    </div>
  );
}
