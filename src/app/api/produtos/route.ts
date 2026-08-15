import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("produtos")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ produtos: data });
}
