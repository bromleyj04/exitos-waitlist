import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full appearance-none rounded-[var(--radius)] border border-border bg-surface px-4 text-sm text-foreground shadow-inner-soft outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring",
        className,
      )}
      {...props}
    />
  );
}
