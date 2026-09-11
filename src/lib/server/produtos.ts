import "server-only";
import { dbError, getDb } from "./db";
import type { Estoque, Produto, ProdutoComEstoque } from "@/lib/types";

export async function listarProdutos(): Promise<Produto[]> {
  const { data, error } = await getDb().from("produtos").select("*").order("ordem", { ascending: true });
  if (error) throw dbError(error);
  return data as Produto[];
}

/** Produtos (já ordenados) com a quantidade atual em estoque de cada um. */
export async function listarProdutosComEstoque(): Promise<ProdutoComEstoque[]> {
  const [produtos, estoque] = await Promise.all([
    listarProdutos(),
    getDb().from("estoque").select("*"),
  ]);
  if (estoque.error) throw dbError(estoque.error);

  const porProduto = new Map((estoque.data as Estoque[]).map((e) => [e.produto_id, e]));
  return produtos.map((p) => {
    const e = porProduto.get(p.id);
    return {
      ...p,
      quantidade_atual: e?.quantidade_atual ?? 0,
      atualizado_em: e?.atualizado_em ?? null,
    };
  });
}
