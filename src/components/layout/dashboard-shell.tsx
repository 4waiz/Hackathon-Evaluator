"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { cn } from "@/lib/utils";

export function DashboardShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {!collapsed && <Sidebar />}
      <div
        className={cn(
          "transition-[padding] duration-200",
          collapsed ? "pl-0" : "pl-64"
        )}
      >
        <TopNav
          userName={userName}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
