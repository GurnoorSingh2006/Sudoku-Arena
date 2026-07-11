import React from "react";

export function TextSkeleton({ className = "h-4 w-24" }: { className?: string }) {
  return (
    <div className={`shimmer-loading rounded ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 space-y-4">
      <div className="flex items-center gap-3">
        <div className="shimmer-loading w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <TextSkeleton className="h-4 w-24" />
          <TextSkeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <TextSkeleton className="h-3 w-full" />
        <TextSkeleton className="h-3 w-5/6" />
      </div>
      <div className="shimmer-loading h-10 w-full rounded-xl mt-4" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3 bg-white/45 dark:bg-slate-900/10 border border-slate-200/40 dark:border-slate-850 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="shimmer-loading w-9 h-9 rounded-lg" />
            <TextSkeleton className="h-4 w-28" />
          </div>
          <TextSkeleton className="h-6 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-4 mb-8 items-end justify-center pt-8">
        <div className="flex flex-col items-center gap-2">
          <div className="shimmer-loading w-12 h-12 rounded-full" />
          <div className="shimmer-loading w-16 h-16 rounded-t-xl" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="shimmer-loading w-14 h-14 rounded-full" />
          <div className="shimmer-loading w-16 h-24 rounded-t-xl" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="shimmer-loading w-12 h-12 rounded-full" />
          <div className="shimmer-loading w-16 h-12 rounded-t-xl" />
        </div>
      </div>
      <ListSkeleton count={4} />
    </div>
  );
}
