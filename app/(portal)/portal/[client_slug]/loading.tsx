import { Skeleton } from "@/components/ui/skeleton";

export default function PortalLoading() {
  return (
    <div className="portal-root flex flex-col flex-1 min-h-0 bg-black md:flex-row">
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-zinc-800 bg-zinc-900/50 rounded-r-2xl p-4">
        <Skeleton className="h-4 w-24 bg-zinc-800" />
        <Skeleton className="h-3 w-32 mt-2 bg-zinc-800" />
        <div className="flex-1 mt-6 space-y-2">
          <Skeleton className="h-10 w-full rounded-lg bg-zinc-800" />
          <Skeleton className="h-10 w-full rounded-lg bg-zinc-800" />
          <Skeleton className="h-10 w-full rounded-lg bg-zinc-800" />
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-0 p-6">
        <Skeleton className="h-8 w-48 mb-6 bg-zinc-800" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl bg-zinc-800" />
          <Skeleton className="h-32 w-full rounded-2xl bg-zinc-800" />
          <Skeleton className="h-20 w-3/4 rounded-2xl bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
