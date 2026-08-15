"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "Painel", icon: PainelIcon },
  { href: "/reservas", label: "Reservas", icon: ReservasIcon },
  { href: "/clientes", label: "Clientes", icon: ClientesIcon },
  { href: "/estoque", label: "Estoque", icon: EstoqueIcon },
  { href: "/sugestao", label: "Sugestão de compra", icon: SugestaoIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-border-subtle bg-bg-elevated">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 3h9l-1 4h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1L6 3Z"
                stroke="var(--amber)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path d="M5 12h11" stroke="var(--amber)" strokeWidth="1.4" />
            </svg>
          </span>
          <div>
            <p className="font-[family-name:var(--font-display)] text-[15px] leading-tight text-text">
              Dibral
            </p>
            <p className="text-[11px] text-text-faint leading-tight">Gestão de Chopp</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-surface text-text"
                  : "text-text-muted hover:bg-surface/60 hover:text-text"
              }`}
            >
              <Icon active={active} />
              {item.label}
              {active && (
                <span
                  className="ml-auto h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--amber)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border-subtle">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-faint hover:text-text hover:bg-surface/60 transition"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M16 17l5-5-5-5M21 12H9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Sair
        </button>
      </div>
    </aside>
  );
}

function iconProps(active?: boolean) {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: active ? "var(--amber-strong)" : "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function PainelIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function ReservasIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3.5" y="4" width="17" height="17" rx="2" />
      <path d="M8 2.5v3M16 2.5v3M3.5 9.5h17" />
    </svg>
  );
}
function ClientesIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" />
      <path d="M16 4.5c1.7.4 3 2 3 3.9 0 1.9-1.3 3.5-3 3.9M20.5 20c0-3-1.9-5.3-4.3-5.9" />
    </svg>
  );
}
function EstoqueIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M7 2.5h8l-1 4h1.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2H8l-1-4Z" />
      <path d="M6.5 11h11" />
    </svg>
  );
}
function SugestaoIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M3 17l5-5.5 4 3L21 6" />
      <path d="M15 6h6v6" />
    </svg>
  );
}
