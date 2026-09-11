import { json, parseBody, parseWith, route } from "@/lib/server/http";
import { dbError, getDb } from "@/lib/server/db";
import { idParamsSchema, produtoAtualizarSchema } from "@/lib/server/schemas";

export const PUT = route<{ id: string }>(async (req, params) => {
  const { id } = parseWith(idParamsSchema, params);
  const { estoque_minimo } = await parseBody(req, produtoAtualizarSchema);

  const { data, error } = await getDb()
    .from("produtos")
    .update({ estoque_minimo })
    .eq("id", id)
    .select()
    .single();

  if (error) throw dbError(error, { notFound: "Produto não encontrado." });
  return json({ produto: data });
});
