import type { ItemCidade } from "@/lib/types";

export function montarMensagemPedidosChopp(porCidade: ItemCidade[]): string {
  const linhas: string[] = ["⚠️⚠️⚠️", "PEDIDOS DE CHOPP"];
  for (const item of porCidade) {
    linhas.push(item.cidade);
    for (const codigo of item.codigos) linhas.push(codigo);
  }
  linhas.push("⚠️⚠️⚠️");
  return linhas.join("\n");
}
