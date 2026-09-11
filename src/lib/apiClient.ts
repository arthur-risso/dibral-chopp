/** Erro de uma chamada à API, com a mensagem já pronta para mostrar na tela. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Falha de conexão. Verifique a internet e tente novamente.");
  }

  if (res.status === 401) {
    // Sessão expirou: vai para o login e depois volta para a mesma página.
    // Navegação completa de propósito, para descartar o estado da página.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?from=${encodeURIComponent(window.location.pathname)}`);
    throw new ApiError(401, "Sua sessão expirou. Entre novamente.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof data?.error === "string" && data.error ? data.error : "Não foi possível concluir a operação.";
    throw new ApiError(res.status, message);
  }
  return data as T;
}

/** Chamadas às rotas /api do próprio app. Lança ApiError em qualquer resposta de erro. */
export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  put: <T>(url: string, body: unknown) => request<T>("PUT", url, body),
  delete: <T = { ok: true }>(url: string) => request<T>("DELETE", url),
};

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Erro inesperado.";
}
