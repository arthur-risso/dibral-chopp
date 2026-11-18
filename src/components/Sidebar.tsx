"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { NAV_ITEMS as NAV, logout } from "@/lib/navigation";
import {
  IconPainel,
  IconReservas,
  IconClientes,
  IconEstoque,
  IconSugestao,
  IconFechamento,
  IconSair,
} from "@/components/icons";

const ICONES: Record<string, () => React.ReactElement> = {
  "/": IconPainel,
  "/reservas": IconReservas,
  "/clientes": IconClientes,
  "/estoque": IconEstoque,
  "/sugestao": IconSugestao,
  "/fechamento": IconFechamento,
};

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = logout;

  return (
    <aside className="rail hidden md:flex">
      <div className="rail-logo">
        <Logo />
      </div>

      <nav className="rail-nav flex-1 px-3" aria-label="Principal">
        {NAV.map((item) => {
          const Icon = ICONES[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rail-nav px-3 pb-3">
        <button onClick={handleLogout}>
          <IconSair />
          Sair
        </button>
      </div>
      <div className="rail-tile" aria-hidden />
    </aside>
  );
}
