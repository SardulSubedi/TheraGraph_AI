import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-pulse rounded bg-border/60 ${className}`}
      {...props}
    />
  );
}
