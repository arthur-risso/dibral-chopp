import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const db = supabaseAdmin();

  const { data: produtos, error: errProdutos } = await db
    .from("produtos")
    .select("*")
    .order("ordem", { ascending: true });
  if (errProdutos) return NextResponse.json({ error: errProdutos.message }, { status: 500 });

  const { data: estoque, error: errEstoque } = await db.from("estoque").select("*");
  if (errEstoque) return NextResponse.json({ error: errEstoque.message }, { status: 500 });

  const porProduto = new Map((estoque || []).map((e) => [e.produto_id, e]));

  const resultado = (produtos || []).map((p) => {
    const e = porProduto.get(p.id);
    return {
      ...p,
      quantidade_atual: e?.quantidade_atual ?? 0,
      atualizado_em: e?.atualizado_em ?? null,
    };
  });

  return NextResponse.json({ produtos: resultado });
}

export async function PUT(req: Request) {
  const db = supabaseAdmin();
  const body = await req.json();

  const { produto_id, quantidade_atual } = body;
  if (!produto_id || quantidade_atual === undefined) {
    return NextResponse.json(
      { error: "produto_id e quantidade_atual são obrigatórios." },
      { status: 400 }
    );
  }
  if (Number(quantidade_atual) < 0) {
    return NextResponse.json({ error: "Quantidade não pode ser negativa." }, { status: 400 });
  }

  const { data, error } = await db
    .from("estoque")
    .upsert(
      {
        produto_id,
        quantidade_atual: Number(quantidade_atual),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "produto_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ estoque: data });
}
