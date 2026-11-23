"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS as NAV, logout } from "@/lib/navigation";
import { IconMenu } from "@/components/icons";

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handleLogout = logout;

  const atual = NAV.find((n) => n.href === pathname)?.label || "Painel";

  return (
    <div className="md:hidden sticky top-0 z-30 bg-green text-white">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 h-12 font-semibold"
      >
        <span className="font-display text-xl">{atual}</span>
        <IconMenu />
      </button>
      {open && (
        <nav className="rail-nav border-t border-white/20 px-3 py-2" aria-label="Principal">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <button onClick={handleLogout}>Sair</button>
        </nav>
      )}
    </div>
  );
}
