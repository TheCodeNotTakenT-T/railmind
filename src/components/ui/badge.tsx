import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-[#3b82f6] text-white hover:bg-[#3b82f6]/80 border-transparent",
    secondary: "bg-railmind-muted text-railmind-subtext hover:bg-railmind-muted/80 border-transparent",
    destructive: "bg-railmind-red/25 text-railmind-red border-transparent",
    success: "bg-railmind-green/25 text-railmind-green border-transparent",
    outline: "text-white border-railmind-border bg-transparent",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
