"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentProps<"div"> {
  value?: number | null;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, max ? (Number(value) / max) * 100 : 0));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value ?? undefined}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-zinc-800",
          className
        )}
        {...props}
      >
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
