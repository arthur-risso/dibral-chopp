import { json, parseBody, route } from "@/lib/server/http";
import { dbError, fetchAll, getDb } from "@/lib/server/db";
import { MSG_CODIGO_DUPLICADO, clienteCriarSchema } from "@/lib/server/schemas";
import type { Cliente } from "@/lib/types";

export const GET = route(async (req) => {
  const apenasAtivos = req.nextUrl.searchParams.get("ativos") === "1";
  const db = getDb();

  const clientes = await fetchAll<Cliente>((from, to) => {
    let query = db.from("clientes").select("*");
    if (apenasAtivos) query = query.eq("ativo", true);
    return query
      .order("nome", { ascending: true, nullsFirst: false })
      .order("codigo_principal", { ascending: true })
      .range(from, to);
  });

  return json({ clientes });
});

export const POST = route(async (req) => {
  const cliente = await parseBody(req, clienteCriarSchema);

  const { data, error } = await getDb()
    .from("clientes")
    .insert({ ...cliente, ativo: cliente.ativo ?? true })
    .select()
    .single();

  if (error) throw dbError(error, { unique: MSG_CODIGO_DUPLICADO });
  return json({ cliente: data }, 201);
});
