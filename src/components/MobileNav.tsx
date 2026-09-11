"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS, logout } from "@/lib/navigation";

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const current = NAV_ITEMS.find((n) => n.href === pathname)?.label || "Painel";

  return (
    <div className="md:hidden sticky top-0 z-20 bg-bg-elevated border-b border-border-subtle">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-sm"
      >
        <span className="flex items-center gap-2 text-text font-medium">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--amber)" }}
          />
          {current}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <nav className="border-t border-border-subtle px-2 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm ${
                pathname === item.href ? "bg-surface text-text" : "text-text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="w-full text-left rounded-lg px-3 py-2.5 text-sm text-text-faint"
          >
            Sair
          </button>
        </nav>
      )}
    </div>
  );
}
