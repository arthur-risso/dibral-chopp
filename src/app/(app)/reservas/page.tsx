"use client";

import { useEffect, useMemo, useState } from "react";
import { getMondayISO, addWeeksISO, formatWeekLabel, isCurrentWeek } from "@/lib/week";
import { brandColor } from "@/lib/brandColors";
import { nomeExibicao } from "@/lib/clientes";
import type { Cliente, Produto, ReservaComRelacoes, StatusReserva } from "@/lib/types";

type ReservaLinha = ReservaComRelacoes & { produto_ordem?: number };

const STATUS_LABEL: Record<StatusReserva, string> = {
  reservado: "Reservado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function ReservasPage() {
  const [semana, setSemana] = useState(getMondayISO());
  const [reservas, setReservas] = useState<ReservaLinha[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  const [clienteId, setClienteId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarBase() {
    const [rc, rp] = await Promise.all([
      fetch("/api/clientes?ativos=1"),
      fetch("/api/produtos"),
    ]);
    const [bc, bp] = await Promise.all([rc.json(), rp.json()]);
    setClientes(bc.clientes || []);
    setProdutos(bp.produtos || []);
  }

  async function carregarReservas() {
    setLoading(true);
    const res = await fetch(`/api/reservas?semana=${semana}`);
    const body = await res.json();
    setReservas(body.reservas || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    carregarReservas();
  }, [semana]);

  const totalPorProduto = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reservas) {
      if (r.status === "cancelado") continue;
      map.set(r.produto_nome, (map.get(r.produto_nome) || 0) + r.quantidade);
    }
    return Array.from(map.entries());
  }, [reservas]);

  const reservasOrdenadas = useMemo(() => {
    return [...reservas].sort((a, b) => a.cliente_nome.localeCompare(b.cliente_nome));
  }, [reservas]);

  async function adicionar() {
    if (!clienteId || !produtoId || !quantidade) {
      setErro("Selecione cliente, produto e quantidade.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          produto_id: produtoId,
          quantidade: Number(quantidade),
          semana_referencia: semana,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErro(body.error || "Não foi possível reservar.");
        return;
      }
      setQuantidade("");
      carregarReservas();
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(r: ReservaLinha, status: StatusReserva) {
    await fetch(`/api/reservas/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    carregarReservas();
  }

  async function excluir(r: ReservaLinha) {
    if (!confirm(`Excluir a reserva de ${r.produto_nome} de ${r.cliente_nome}?`)) return;
    await fetch(`/api/reservas/${r.id}`, { method: "DELETE" });
    carregarReservas();
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-text">Reservas</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Lançamentos feitos a partir das respostas do WhatsApp de segunda-feira
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface px-1.5 py-1.5">
          <button
            onClick={() => setSemana(addWeeksISO(semana, -1))}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-hover"
            aria-label="Semana anterior"
          >
            <ChevronLeft />
          </button>
          <span className="px-2 text-sm font-[family-name:var(--font-mono)] text-text min-w-[132px] text-center">
            {formatWeekLabel(semana)}
            {isCurrentWeek(semana) && (
              <span className="ml-1.5 text-amber text-xs">· atual</span>
            )}
          </span>
          <button
            onClick={() => setSemana(addWeeksISO(semana, 1))}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-hover"
            aria-label="Próxima semana"
          >
            <ChevronRight />
          </button>
        </div>
      </header>

      {/* Lançamento rápido */}
      <div className="rounded-xl border border-border bg-surface p-4 mb-6">
        <p className="text-xs text-text-muted mb-3">Nova reserva para esta semana</p>
        <div className="flex flex-wrap gap-2.5">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="input flex-1 min-w-[160px]"
          >
            <option value="">Cliente…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {nomeExibicao(c)}
              </option>
            ))}
          </select>
          <select
            value={produtoId}
            onChange={(e) => setProdutoId(e.target.value)}
            className="input flex-1 min-w-[160px]"
          >
            <option value="">Chopp…</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="Qtd."
            className="input w-24"
          />
          <button
            onClick={adicionar}
            disabled={salvando}
            className="rounded-lg bg-amber text-[#1a1408] font-medium px-4 py-2 text-sm hover:bg-amber-strong disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
        {erro && <p className="text-sm text-danger mt-2">{erro}</p>}
      </div>

      {/* Resumo por produto */}
      {totalPorProduto.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {totalPorProduto.map(([nome, total]) => (
            <span
              key={nome}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs text-text-muted"
            >
              {nome}
              <span className="font-[family-name:var(--font-mono)] text-text">{total}</span>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-text-faint">Carregando…</p>
      ) : reservasOrdenadas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-text-muted text-sm">Nenhuma reserva lançada para esta semana ainda.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-elevated text-text-faint text-left">
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Chopp</th>
                <th className="px-4 py-2.5 font-medium text-right">Qtd.</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {reservasOrdenadas.map((r) => (
                <tr key={r.id} className="border-t border-border-subtle hover:bg-surface/40">
                  <td className="px-4 py-2.5 text-text">{r.cliente_nome}</td>
                  <td className="px-4 py-2.5 text-text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: brandColor(r.produto_nome, r.produto_marca) }}
                      />
                      {r.produto_nome}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] text-text">
                    {r.quantidade}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={r.status as StatusReserva} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.status !== "entregue" && (
                        <button
                          onClick={() => mudarStatus(r, "entregue")}
                          className="text-xs text-ok hover:underline"
                        >
                          Entregue
                        </button>
                      )}
                      {r.status !== "cancelado" && (
                        <button
                          onClick={() => mudarStatus(r, "cancelado")}
                          className="text-xs text-text-faint hover:text-danger hover:underline"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        onClick={() => excluir(r)}
                        className="text-text-faint hover:text-danger p-1 rounded-md"
                        title="Excluir"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx global>{`
        .input {
          border-radius: 0.5rem;
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
          color: var(--text);
        }
        .input:focus-visible {
          outline: 2px solid var(--amber);
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusReserva }) {
  const styles: Record<StatusReserva, string> = {
    reservado: "bg-[var(--warn-bg)] text-warn",
    entregue: "bg-[var(--ok-bg)] text-ok",
    cancelado: "bg-surface text-text-faint",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function ChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
