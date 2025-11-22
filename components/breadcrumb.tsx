"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      className="hidden items-center gap-2 text-sm md:flex"
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-[#c3ccde]" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-[#8b96b3] transition-colors hover:text-[#059669]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-[#1c2434]">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
