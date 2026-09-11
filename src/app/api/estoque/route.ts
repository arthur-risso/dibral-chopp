import { json, parseBody, route } from "@/lib/server/http";
import { dbError, getDb } from "@/lib/server/db";
import { listarProdutosComEstoque } from "@/lib/server/produtos";
import { estoqueAtualizarSchema } from "@/lib/server/schemas";

export const GET = route(async () => {
  return json({ produtos: await listarProdutosComEstoque() });
});

export const PUT = route(async (req) => {
  const { produto_id, quantidade_atual } = await parseBody(req, estoqueAtualizarSchema);

  const { data, error } = await getDb()
    .from("estoque")
    .upsert(
      { produto_id, quantidade_atual, atualizado_em: new Date().toISOString() },
      { onConflict: "produto_id" }
    )
    .select()
    .single();

  if (error) throw dbError(error, { foreignKey: "Produto não encontrado." });
  return json({ estoque: data });
});
