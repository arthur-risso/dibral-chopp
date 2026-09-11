import { json, parseBody, parseWith, route } from "@/lib/server/http";
import { dbError, fetchAll, getDb, one, type Relation } from "@/lib/server/db";
import { reservaSalvarSchema, reservasQuerySchema } from "@/lib/server/schemas";
import { getMondayISO } from "@/lib/week";
import type { StatusReserva } from "@/lib/types";

type ReservaRow = {
  id: string;
  cliente_id: string;
  produto_id: string;
  quantidade: number;
  semana_referencia: string;
  status: StatusReserva;
  criado_em: string;
  clientes: Relation<{ nome: string | null; codigo_principal: string }>;
  produtos: Relation<{ nome: string; marca: string; ordem: number }>;
};

export const GET = route(async (req) => {
  const { semana: semanaParam } = parseWith(reservasQuerySchema, {
    semana: req.nextUrl.searchParams.get("semana") ?? undefined,
  });
  const semana = semanaParam ?? getMondayISO();
  const db = getDb();

  const rows = await fetchAll<ReservaRow>((from, to) =>
    db
      .from("reservas")
      .select(
        "id, cliente_id, produto_id, quantidade, semana_referencia, status, criado_em, clientes(nome, codigo_principal), produtos(nome, marca, ordem)"
      )
      .eq("semana_referencia", semana)
      .order("criado_em", { ascending: true })
      .order("id")
      .range(from, to)
  );

  const reservas = rows.map((r) => {
    const cliente = one(r.clientes);
    const produto = one(r.produtos);
    return {
      id: r.id,
      cliente_id: r.cliente_id,
      produto_id: r.produto_id,
      quantidade: r.quantidade,
      semana_referencia: r.semana_referencia,
      status: r.status,
      criado_em: r.criado_em,
      cliente_nome: cliente?.nome?.trim() || cliente?.codigo_principal || "—",
      produto_nome: produto?.nome || "—",
      produto_marca: produto?.marca || "",
      produto_ordem: produto?.ordem ?? 999,
    };
  });

  return json({ reservas });
});

/**
 * Usado pela grade de reservas: uma célula (cliente + produto + semana)
 * é uma reserva só. Se já existir, atualiza a quantidade sem mexer no
 * status; se não existir, cria com status "reservado".
 */
export const PUT = route(async (req) => {
  const reserva = await parseBody(req, reservaSalvarSchema);

  const { data, error } = await getDb()
    .from("reservas")
    .upsert(reserva, { onConflict: "cliente_id,produto_id,semana_referencia" })
    .select()
    .single();

  if (error) throw dbError(error, { foreignKey: "Cliente ou produto não encontrado." });
  return json({ reserva: data });
});
