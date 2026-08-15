"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
      const from = params.get("from") || "/";
      router.push(from);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 3h9l-1 4h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1L6 3Z"
                stroke="var(--amber)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path d="M5 12h11" stroke="var(--amber)" strokeWidth="1.4" />
            </svg>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-text">
            Dibral · Gestão de Chopp
          </h1>
          <p className="text-sm text-text-muted mt-1">Acesso restrito</p>
        </div>

        {needsConfig && (
          <div className="mb-4 rounded-lg border border-warn/40 bg-[var(--warn-bg)] px-4 py-3 text-sm text-warn">
            A variável <code className="font-[family-name:var(--font-mono)]">APP_PASSWORD</code> ainda
            não foi configurada no servidor.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-xl p-6 space-y-4"
        >
          <div>
            <label htmlFor="password" className="block text-sm text-text-muted mb-1.5">
              Senha de acesso
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-bg-elevated border border-border px-3 py-2.5 text-text placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-amber text-[#1a1408] font-medium py-2.5 transition hover:bg-amber-strong disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
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
