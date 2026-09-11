import { HttpError, json, parseBody, parseWith, route } from "@/lib/server/http";
import { dbError, getDb } from "@/lib/server/db";
import { idParamsSchema, reservaAtualizarSchema } from "@/lib/server/schemas";

export const PUT = route<{ id: string }>(async (req, params) => {
  const { id } = parseWith(idParamsSchema, params);
  const update = await parseBody(req, reservaAtualizarSchema);

  const { data, error } = await getDb()
    .from("reservas")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw dbError(error, { notFound: "Reserva não encontrada." });
  return json({ reserva: data });
});

export const DELETE = route<{ id: string }>(async (_req, params) => {
  const { id } = parseWith(idParamsSchema, params);

  const { data, error } = await getDb().from("reservas").delete().eq("id", id).select("id");
  if (error) throw dbError(error);
  if (data.length === 0) throw new HttpError(404, "Reserva não encontrada.");
  return json({ ok: true });
});
