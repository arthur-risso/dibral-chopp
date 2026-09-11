import { json, route } from "@/lib/server/http";
import { listarProdutos } from "@/lib/server/produtos";

export const GET = route(async () => {
  return json({ produtos: await listarProdutos() });
});
