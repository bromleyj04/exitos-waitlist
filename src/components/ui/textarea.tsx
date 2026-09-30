import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full appearance-none rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-inner-soft outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring",
        className,
      )}
      {...props}
    />
  );
}
