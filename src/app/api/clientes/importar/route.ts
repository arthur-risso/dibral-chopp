import { HttpError, json, parseBody, route } from "@/lib/server/http";
import { dbError, getDb } from "@/lib/server/db";
import { importarClientesSchema } from "@/lib/server/schemas";

export const POST = route(async (req) => {
  const { clientes } = await parseBody(req, importarClientesSchema);

  // Descarta linhas sem código e códigos repetidos dentro do próprio arquivo
  const codigosVistos = new Set<string>();
  const linhas = [];
  for (const c of clientes) {
    if (!c.codigo_principal || codigosVistos.has(c.codigo_principal)) continue;
    codigosVistos.add(c.codigo_principal);
    linhas.push({ ...c, ativo: true });
  }

  if (linhas.length === 0) throw new HttpError(400, "Nenhum cliente válido para importar.");

  // Clientes cujo código principal já existe são ignorados (não sobrescreve
  // cadastros existentes) em vez de travar a importação inteira.
  const { data, error } = await getDb()
    .from("clientes")
    .upsert(linhas, { onConflict: "codigo_principal", ignoreDuplicates: true })
    .select("id");

  if (error) throw dbError(error);

  const importados = data.length;
  return json({
    total: linhas.length,
    importados,
    ignorados: linhas.length - importados,
  });
});
