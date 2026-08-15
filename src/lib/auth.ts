export const SESSION_COOKIE = "dibral_session";

/**
 * Gera um hash SHA-256 em hexadecimal usando a Web Crypto API,
 * disponível tanto em rotas de API (Node.js) quanto no middleware (Edge).
 */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Token esperado no cookie de sessão: um hash derivado da senha do app.
 * Como a senha nunca sai do servidor, o cookie funciona como uma prova
 * de que o valor correto foi apresentado no /login, sem precisar de
 * uma tabela de sessões.
 */
export async function getExpectedSessionToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return sha256Hex(`dibral-chopp-v1:${password}`);
}
