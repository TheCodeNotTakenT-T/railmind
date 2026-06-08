import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDelay(minutes: number): string {
  if (minutes <= 0) return "On time";
  return `+${minutes} min`;
}

export function getStatusColor(status: 'on_time' | 'delayed' | 'critical'): string {
  switch (status) {
    case 'on_time':
      return "text-railmind-green";
    case 'delayed':
      return "text-railmind-yellow";
    case 'critical':
      return "text-railmind-red";
  }
}

export function getSeverityBadgeClass(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'low':
      return "bg-railmind-muted text-railmind-subtext";
    case 'medium':
      return "bg-railmind-yellow/20 text-railmind-yellow";
    case 'high':
      return "bg-railmind-orange/20 text-railmind-orange";
    case 'critical':
      return "bg-railmind-red/20 text-railmind-red animate-pulse-critical";
  }
}

