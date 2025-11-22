"use client";

import { useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();

  return (
    <main
      className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        isOpen ? "lg:ml-64" : "lg:ml-0"
      )}
    >
      <div className="p-4 lg:p-6">{children}</div>
    </main>
  );
}

