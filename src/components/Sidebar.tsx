"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  Bot,
  Bell,
  BarChart3,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Incidents", href: "/incidents", icon: AlertTriangle },
    { label: "Agents", href: "/agents", icon: Bot },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Metrics", href: "/metrics", icon: BarChart3 },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#0d1117] border-r border-[#1f2937] flex flex-col z-50">
      {/* Logo Section */}
      <div className="py-6 px-5 flex flex-col gap-1">
        <div className="flex items-center">
          <span className="text-white font-bold text-xl">Rail</span>
          <span className="text-[#dc2626] font-bold text-xl">Mind</span>
        </div>
        <span className="text-[#9ca3af] text-[10px] uppercase tracking-wider font-semibold">
          Operations Intelligence
        </span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname ? pathname.startsWith(item.href) : false;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer w-full border overflow-hidden ${
                isActive
                  ? "bg-railmind-red/10 text-railmind-red border-railmind-red/20 font-bold"
                  : "text-railmind-subtext border-transparent hover:bg-surface-1 hover:text-white"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-railmind-red rounded-r-full shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
              )}
              <Icon size={18} className={isActive ? "drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]" : ""} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-5 border-t border-[#1f2937] flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] inline-block animate-pulse"></span>
          <span className="text-[#9ca3af] text-xs font-medium">System Active</span>
        </div>
        <div className="flex flex-col text-[10px] text-[#374151] font-semibold tracking-wide">
          <span>RailMind v1.0</span>
          <span>FAR AWAY 2026</span>
        </div>
      </div>
    </aside>
  );
}
