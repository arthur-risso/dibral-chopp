"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";

/**
 * Só aceita caminhos internos em "?from=" — senão um link como
 * /login?from=https://site-falso.com levaria o usuário para fora do app
 * logo depois de digitar a senha (open redirect).
 */
function destinoSeguro(from: string | null): string {
  if (!from || !from.startsWith("/") || from.startsWith("//") || from.startsWith("/\\")) return "/";
  return from;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const needsConfig = params.get("config") === "1";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Não foi possível entrar.");
        return;
      }
      router.push(destinoSeguro(params.get("from")));
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-[1fr_minmax(420px,520px)]">
      <div className="login-art hidden md:flex items-end p-10" aria-hidden>
        <div className="bg-white px-7 py-6 text-green" style={{ borderRadius: 2 }}>
          <Logo height={56} />
        </div>
      </div>

      <div className="flex items-center justify-center px-8 py-12 bg-porcelain">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8">
            <Logo />
          </div>
          <h1 className="font-display text-[34px] font-bold leading-tight">Entrar</h1>
          <p className="text-ink-2 mt-1 mb-7">Acesso restrito à equipe da Dibral.</p>

          {needsConfig && (
            <div className="aviso aviso-warn mb-5">
              A variável <strong>APP_PASSWORD</strong> ainda não foi configurada no servidor.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="label">
                Senha de acesso
              </label>
              <input
                id="password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="aviso aviso-danger" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading || !password} className="btn btn-primary w-full">
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
