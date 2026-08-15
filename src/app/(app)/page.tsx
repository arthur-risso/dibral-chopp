"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BarrilGauge from "@/components/BarrilGauge";
import { brandColor } from "@/lib/brandColors";
import { formatWeekLabel, getMondayISO, isCurrentWeek } from "@/lib/week";
import type { ProdutoComEstoque, ReservaComRelacoes, SugestaoProduto, Cliente } from "@/lib/types";

export default function PainelPage() {
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([]);
  const [reservas, setReservas] = useState<ReservaComRelacoes[]>([]);
  const [sugestoes, setSugestoes] = useState<SugestaoProduto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const semanaAtual = getMondayISO();

  useEffect(() => {
    async function carregar() {
      const [rEstoque, rReservas, rSugestao, rClientes] = await Promise.all([
        fetch("/api/estoque"),
        fetch(`/api/reservas?semana=${semanaAtual}`),
        fetch("/api/sugestao"),
        fetch("/api/clientes?ativos=1"),
      ]);
      const [bEstoque, bReservas, bSugestao, bClientes] = await Promise.all([
        rEstoque.json(),
        rReservas.json(),
        rSugestao.json(),
        rClientes.json(),
      ]);
      setProdutos(bEstoque.produtos || []);
      setReservas(bReservas.reservas || []);
      setSugestoes(bSugestao.sugestoes || []);
      setClientes(bClientes.clientes || []);
      setLoading(false);
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalReservadoSemana = reservas
    .filter((r) => r.status !== "cancelado")
    .reduce((acc, r) => acc + r.quantidade, 0);
  const maxEstoque = Math.max(...produtos.map((p) => p.quantidade_atual), 10);
  const baixoCount = produtos.filter((p) => p.quantidade_atual < p.estoque_minimo).length;
  const totalPuxar = sugestoes.reduce((acc, s) => acc + s.sugestao_puxar, 0);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-text">Painel</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Semana de {formatWeekLabel(semanaAtual)}
          {isCurrentWeek(semanaAtual) && " · atual"}
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-text-faint">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Clientes ativos" value={clientes.length} />
            <StatCard label="Barris reservados nesta semana" value={totalReservadoSemana} />
            <StatCard
              label="Chopps com estoque baixo"
              value={baixoCount}
              tone={baixoCount > 0 ? "danger" : "ok"}
            />
            <StatCard label="Sugestão de puxada" value={totalPuxar} tone="amber" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-text">Estoque atual</h2>
                <Link href="/estoque" className="text-xs text-amber hover:text-amber-strong">
                  ver tudo →
                </Link>
              </div>
              <div className="flex flex-wrap gap-4">
                {produtos.map((p) => (
                  <BarrilGauge
                    key={p.id}
                    quantidade={p.quantidade_atual}
                    max={maxEstoque}
                    baixo={p.quantidade_atual < p.estoque_minimo}
                    color={brandColor(p.nome, p.marca)}
                    height={72}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-text">Puxar esta semana</h2>
                <Link href="/sugestao" className="text-xs text-amber hover:text-amber-strong">
                  ver detalhes →
                </Link>
              </div>
              {sugestoes.filter((s) => s.sugestao_puxar > 0).length === 0 ? (
                <p className="text-sm text-text-faint">
                  Nenhuma sugestão de compra no momento — estoque cobre a demanda estimada.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {sugestoes
                    .filter((s) => s.sugestao_puxar > 0)
                    .sort((a, b) => b.sugestao_puxar - a.sugestao_puxar)
                    .map((s) => (
                      <li key={s.produto_id} className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1.5 text-text-muted">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: brandColor(s.produto_nome, s.marca) }}
                          />
                          {s.produto_nome}
                        </span>
                        <span className="font-[family-name:var(--font-mono)] text-amber-strong">
                          {s.sugestao_puxar}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </div>

          <div className="mt-6">
            <Link
              href="/reservas"
              className="inline-flex items-center gap-2 rounded-lg bg-amber text-[#1a1408] font-medium px-4 py-2.5 text-sm hover:bg-amber-strong transition"
            >
              Lançar reservas da semana
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "ok" | "amber";
}) {
  const toneColor =
    tone === "danger"
      ? "text-danger"
      : tone === "ok"
      ? "text-ok"
      : tone === "amber"
      ? "text-amber-strong"
      : "text-text";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-text-muted mb-1.5">{label}</p>
      <p className={`font-[family-name:var(--font-mono)] text-2xl ${toneColor}`}>{value}</p>
    </div>
  );
}
