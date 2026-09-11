export const NAV_ITEMS = [
  { href: "/", label: "Painel" },
  { href: "/reservas", label: "Reservas" },
  { href: "/clientes", label: "Clientes" },
  { href: "/estoque", label: "Estoque" },
  { href: "/sugestao", label: "Sugestão de compra" },
  { href: "/fechamento", label: "Fechamento" },
] as const;

export type NavHref = (typeof NAV_ITEMS)[number]["href"];

/** Encerra a sessão e recarrega a página de login (limpa qualquer dado em memória). */
export async function logout() {
  try {
    await fetch("/api/logout", { method: "POST" });
  } finally {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }
}
