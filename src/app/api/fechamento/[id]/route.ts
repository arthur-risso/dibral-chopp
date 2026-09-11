import { HttpError, json, parseWith, route } from "@/lib/server/http";
import { dbError, getDb } from "@/lib/server/db";
import { calcularResumoFechamento } from "@/lib/server/fechamentoResumo";
import { idParamsSchema } from "@/lib/server/schemas";
import type { Fechamento } from "@/lib/types";

export const GET = route<{ id: string }>(async (_req, params) => {
  const { id } = parseWith(idParamsSchema, params);

  const { data: fechamento, error } = await getDb().from("fechamentos").select("*").eq("id", id).single();
  if (error) throw dbError(error, { notFound: "Fechamento não encontrado." });

  const resumo = await calcularResumoFechamento(fechamento as Fechamento);
  return json({ resumo });
});

export const DELETE = route<{ id: string }>(async (_req, params) => {
  const { id } = parseWith(idParamsSchema, params);

  const { data, error } = await getDb().from("fechamentos").delete().eq("id", id).select("id");
  if (error) throw dbError(error);
  if (data.length === 0) throw new HttpError(404, "Fechamento não encontrado.");
  return json({ ok: true });
});
