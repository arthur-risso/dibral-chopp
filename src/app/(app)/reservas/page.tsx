"use client";

import { useEffect, useMemo, useState } from "react";
import { getMondayISO, addWeeksISO, formatWeekLabel, isCurrentWeek } from "@/lib/week";
import { brandColor } from "@/lib/brandColors";
import { nomeExibicao } from "@/lib/clientes";
import type { Cliente, Produto, ReservaComRelacoes, StatusReserva, CelulaReserva } from "@/lib/types";

const PROXIMO_STATUS: Record<StatusReserva, StatusReserva> = {
  reservado: "entregue",
  entregue: "cancelado",
  cancelado: "reservado",
};

const STATUS_CLASSE: Record<StatusReserva, string> = {
  reservado: "bg-[var(--warn-bg)] text-warn",
  entregue: "bg-[var(--ok-bg)] text-ok",
  cancelado: "bg-surface text-text-faint line-through",
};

function cellKey(clienteId: string, produtoId: string) {
  return `${clienteId}__${produtoId}`;
}

export default function ReservasPage() {
  const [semana, setSemana] = useState(getMondayISO());
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [celulas, setCelulas] = useState<Map<string, CelulaReserva>>(new Map());
  const [valores, setValores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<"codigo" | "nome">("codigo");

  async function carregarBase() {
    const [rc, rp] = await Promise.all([fetch("/api/clientes?ativos=1"), fetch("/api/produtos")]);
    const [bc, bp] = await Promise.all([rc.json(), rp.json()]);
    setClientes(bc.clientes || []);
    setProdutos(bp.produtos || []);
  }

  async function carregarReservas() {
    setLoading(true);
    const res = await fetch(`/api/reservas?semana=${semana}`);
    const body = await res.json();
    const lista: ReservaComRelacoes[] = body.reservas || [];

    const novasCelulas = new Map<string, CelulaReserva>();
    const novosValores: Record<string, string> = {};
    for (const r of lista) {
      const key = cellKey(r.cliente_id, r.produto_id);
      novasCelulas.set(key, { id: r.id, quantidade: r.quantidade, status: r.status as StatusReserva });
      novosValores[key] = String(r.quantidade);
    }
    setCelulas(novasCelulas);
    setValores(novosValores);
    setLoading(false);
  }

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    carregarReservas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semana]);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    const lista = !termo
      ? clientes
      : clientes.filter(
          (c) =>
            c.codigo_principal.toLowerCase().includes(termo) ||
            (c.codigo_secundario || "").toLowerCase().includes(termo) ||
            (c.nome || "").toLowerCase().includes(termo) ||
            (c.setor || "").toLowerCase().includes(termo) ||
            (c.cidade || "").toLowerCase().includes(termo)
        );

    return [...lista].sort((a, b) =>
      ordenarPor === "codigo"
        ? a.codigo_principal.localeCompare(b.codigo_principal, "pt-BR", { numeric: true })
        : nomeExibicao(a).localeCompare(nomeExibicao(b), "pt-BR")
    );
  }, [clientes, busca, ordenarPor]);

  const totalPorProduto = useMemo(() => {
    return produtos.map((p) => {
      let total = 0;
      for (const c of clientes) {
        const cel = celulas.get(cellKey(c.id, p.id));
        if (cel && cel.status !== "cancelado") total += cel.quantidade;
      }
      return total;
    });
  }, [produtos, clientes, celulas]);

  function onChangeValor(clienteId: string, produtoId: string, texto: string) {
    const key = cellKey(clienteId, produtoId);
    setValores((prev) => ({ ...prev, [key]: texto }));
  }

  async function commitCelula(clienteId: string, produtoId: string) {
    const key = cellKey(clienteId, produtoId);
    const atual = celulas.get(key);
    const texto = (valores[key] ?? "").trim();

    if (texto === "") {
      if (atual) {
        await fetch(`/api/reservas/${atual.id}`, { method: "DELETE" });
        setCelulas((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }
      return;
    }

    const valor = Number(texto);
    if (Number.isNaN(valor) || valor <= 0) {
      setValores((prev) => ({ ...prev, [key]: atual ? String(atual.quantidade) : "" }));
      return;
    }
    if (atual && atual.quantidade === valor) return;

    const res = await fetch("/api/reservas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: clienteId,
        produto_id: produtoId,
        quantidade: valor,
        semana_referencia: semana,
      }),
    });
    const body = await res.json();
    if (res.ok) {
      setCelulas((prev) => {
        const next = new Map(prev);
        next.set(key, { id: body.reserva.id, quantidade: body.reserva.quantidade, status: body.reserva.status });
        return next;
      });
      setValores((prev) => ({ ...prev, [key]: String(body.reserva.quantidade) }));
    } else {
      setValores((prev) => ({ ...prev, [key]: atual ? String(atual.quantidade) : "" }));
    }
  }

  async function alternarStatus(clienteId: string, produtoId: string) {
    const key = cellKey(clienteId, produtoId);
    const atual = celulas.get(key);
    if (!atual) return;
    const novoStatus = PROXIMO_STATUS[atual.status];
    await fetch(`/api/reservas/${atual.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    setCelulas((prev) => {
      const next = new Map(prev);
      next.set(key, { ...atual, status: novoStatus });
      return next;
    });
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-text">Reservas</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Uma linha por cliente — preencha a quantidade de cada chopp direto na célula
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
            {isCurrentWeek(semana) && <span className="ml-1.5 text-amber text-xs">· atual</span>}
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

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por código, nome, setor ou cidade…"
          className="w-full max-w-sm rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        />
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <span className="px-1.5 text-xs text-text-faint">Ordenar por</span>
          <button
            onClick={() => setOrdenarPor("codigo")}
            className={`rounded-md px-2.5 py-1 text-xs ${
              ordenarPor === "codigo" ? "bg-amber text-[#1a1408] font-medium" : "text-text-muted hover:text-text"
            }`}
          >
            Código
          </button>
          <button
            onClick={() => setOrdenarPor("nome")}
            className={`rounded-md px-2.5 py-1 text-xs ${
              ordenarPor === "nome" ? "bg-amber text-[#1a1408] font-medium" : "text-text-muted hover:text-text"
            }`}
          >
            Nome
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-text-faint">Carregando…</p>
      ) : clientes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-text-muted text-sm">
            Nenhum cliente ativo cadastrado ainda — cadastre clientes para lançar reservas.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-auto max-h-[70vh]">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-bg-elevated text-text-faint text-left font-medium px-4 py-2.5 border-b border-r border-border-subtle w-56 min-w-[14rem]">
                  Cliente
                </th>
                {produtos.map((p) => (
                  <th
                    key={p.id}
                    className="sticky top-0 z-10 bg-bg-elevated text-text-faint font-medium px-2 py-2.5 border-b border-border-subtle w-28 min-w-[7rem] text-center"
                  >
                    <span className="inline-flex items-center gap-1.5 justify-center">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: brandColor(p.nome, p.marca) }}
                      />
                      <span className="leading-tight">{p.nome}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c) => (
                <tr key={c.id} className="hover:bg-surface/40">
                  <td className="sticky left-0 z-10 bg-bg border-r border-b border-border-subtle px-4 py-2 w-56 min-w-[14rem]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-text text-sm">{nomeExibicao(c)}</span>
                      {c.nome && (
                        <span className="text-[11px] text-text-faint font-[family-name:var(--font-mono)]">
                          {c.codigo_principal}
                        </span>
                      )}
                    </div>
                    {(c.setor || c.cidade) && (
                      <div className="text-[11px] text-text-faint">
                        {[c.setor, c.cidade].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  {produtos.map((p) => {
                    const key = cellKey(c.id, p.id);
                    const celula = celulas.get(key);
                    return (
                      <td
                        key={p.id}
                        className="border-b border-border-subtle px-1.5 py-1.5 text-center align-middle"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={valores[key] ?? ""}
                            onChange={(e) => onChangeValor(c.id, p.id, e.target.value)}
                            onBlur={() => commitCelula(c.id, p.id)}
                            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                            className="w-16 rounded-md bg-bg-elevated border border-border px-1.5 py-1 text-center text-sm font-[family-name:var(--font-mono)] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                          />
                          {celula && (
                            <button
                              onClick={() => alternarStatus(c.id, p.id)}
                              className={`rounded-full px-1.5 py-0.5 text-[9px] leading-tight ${STATUS_CLASSE[celula.status]}`}
                              title="Clique para mudar o status"
                            >
                              {celula.status}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky left-0 bottom-0 z-10 bg-bg-elevated border-r border-t border-border-subtle px-4 py-2.5 text-xs text-text-muted font-medium">
                  Total na semana
                </td>
                {produtos.map((p, i) => (
                  <td
                    key={p.id}
                    className="bg-bg-elevated border-t border-border-subtle px-2 py-2.5 text-center text-sm font-[family-name:var(--font-mono)] text-amber-strong"
                  >
                    {totalPorProduto[i]}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-text-faint mt-3">
        Deixe a célula vazia para remover a reserva. Clique na etiqueta abaixo do número para
        alternar entre reservado → entregue → cancelado.
      </p>
    </div>
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
