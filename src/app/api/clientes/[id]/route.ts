import { HttpError, json, parseBody, parseWith, route } from "@/lib/server/http";
import { dbError, getDb } from "@/lib/server/db";
import { MSG_CODIGO_DUPLICADO, clienteAtualizarSchema, idParamsSchema } from "@/lib/server/schemas";

export const PUT = route<{ id: string }>(async (req, params) => {
  const { id } = parseWith(idParamsSchema, params);
  const update = await parseBody(req, clienteAtualizarSchema);

  const { data, error } = await getDb()
    .from("clientes")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw dbError(error, { unique: MSG_CODIGO_DUPLICADO, notFound: "Cliente não encontrado." });
  return json({ cliente: data });
});

export const DELETE = route<{ id: string }>(async (_req, params) => {
  const { id } = parseWith(idParamsSchema, params);

  const { data, error } = await getDb().from("clientes").delete().eq("id", id).select("id");
  if (error) throw dbError(error);
  if (data.length === 0) throw new HttpError(404, "Cliente não encontrado.");
  return json({ ok: true });
});
