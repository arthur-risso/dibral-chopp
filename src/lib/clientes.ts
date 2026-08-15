import type { Cliente } from "@/lib/types";

/** Nome de exibição do cliente: usa o nome se houver, senão o código principal. */
export function nomeExibicao(c: Pick<Cliente, "nome" | "codigo_principal">): string {
  const nome = c.nome?.trim();
  return nome ? nome : c.codigo_principal;
}
