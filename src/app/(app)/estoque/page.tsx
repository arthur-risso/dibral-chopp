"use client";

import { useEffect, useMemo, useState } from "react";
import BarrilGauge from "@/components/BarrilGauge";
import { brandColor } from "@/lib/brandColors";
import type { ProdutoComEstoque } from "@/lib/types";

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [valorEdicao, setValorEdicao] = useState("");
  const [editandoMinimoId, setEditandoMinimoId] = useState<string | null>(null);
  const [valorMinimo, setValorMinimo] = useState("");

  // Lançamento rápido no topo da página
  const [lancarProdutoId, setLancarProdutoId] = useState("");
  const [lancarQuantidade, setLancarQuantidade] = useState("");
  const [lancando, setLancando] = useState(false);
  const [erroLancamento, setErroLancamento] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/estoque");
    const body = await res.json();
    setProdutos(body.produtos || []);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const maxEstoque = useMemo(
    () => Math.max(...produtos.map((p) => p.quantidade_atual), 10),
    [produtos]
  );
  const baixoCount = produtos.filter((p) => p.quantidade_atual < p.estoque_minimo).length;

  async function lancarEstoque() {
    if (!lancarProdutoId || lancarQuantidade === "") {
      setErroLancamento("Selecione o chopp e a quantidade disponível.");
      return;
    }
    const valor = Number(lancarQuantidade);
    if (Number.isNaN(valor) || valor < 0) {
      setErroLancamento("Quantidade inválida.");
      return;
    }
    setLancando(true);
    setErroLancamento(null);
    try {
      await fetch("/api/estoque", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: lancarProdutoId, quantidade_atual: valor }),
      });
      setLancarProdutoId("");
      setLancarQuantidade("");
      carregar();
    } finally {
      setLancando(false);
    }
  }

  function iniciarEdicao(p: ProdutoComEstoque) {
    setEditandoId(p.id);
    setValorEdicao(String(p.quantidade_atual));
  }

  async function salvarQuantidade(p: ProdutoComEstoque) {
    const valor = Number(valorEdicao);
    if (Number.isNaN(valor) || valor < 0) {
      setEditandoId(null);
      return;
    }
    await fetch("/api/estoque", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto_id: p.id, quantidade_atual: valor }),
    });
    setEditandoId(null);
    carregar();
  }

  function iniciarEdicaoMinimo(p: ProdutoComEstoque) {
    setEditandoMinimoId(p.id);
    setValorMinimo(String(p.estoque_minimo));
  }

  async function salvarMinimo(p: ProdutoComEstoque) {
    const valor = Number(valorMinimo);
    if (Number.isNaN(valor) || valor < 0) {
      setEditandoMinimoId(null);
      return;
    }
    await fetch(`/api/produtos/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estoque_minimo: valor }),
    });
    setEditandoMinimoId(null);
    carregar();
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-text">Estoque</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {loading
            ? "Carregando…"
            : baixoCount > 0
            ? `${baixoCount} chopp${baixoCount > 1 ? "s" : ""} abaixo do mínimo definido`
            : "Todos os chopps dentro do nível mínimo"}
        </p>
      </header>

      {/* Lançamento manual de estoque */}
      <div className="rounded-xl border border-border bg-surface p-4 mb-6">
        <p className="text-xs text-text-muted mb-3">Lançar estoque disponível</p>
        <div className="flex flex-wrap gap-2.5">
          <select
            value={lancarProdutoId}
            onChange={(e) => setLancarProdutoId(e.target.value)}
            className="flex-1 min-w-[180px] rounded-lg bg-bg border border-border px-3 py-2 text-sm text-text"
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
            min={0}
            value={lancarQuantidade}
            onChange={(e) => setLancarQuantidade(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lancarEstoque()}
            placeholder="Quantidade disponível"
            className="w-48 rounded-lg bg-bg border border-border px-3 py-2 text-sm text-text placeholder:text-text-faint"
          />
          <button
            onClick={lancarEstoque}
            disabled={lancando}
            className="rounded-lg bg-amber text-[#1a1408] font-medium px-4 py-2 text-sm hover:bg-amber-strong disabled:opacity-50"
          >
            {lancando ? "Lançando…" : "Lançar"}
          </button>
        </div>
        {erroLancamento && <p className="text-sm text-danger mt-2">{erroLancamento}</p>}
        <p className="text-xs text-text-faint mt-2">
          Isso substitui a quantidade atual desse chopp pelo valor informado.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-text-faint">Carregando…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {produtos.map((p) => {
            const baixo = p.quantidade_atual < p.estoque_minimo;
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 flex flex-col items-center gap-3 ${
                  baixo ? "border-danger/40 bg-[var(--danger-bg)]" : "border-border bg-surface"
                }`}
              >
                <div className="text-center">
                  <p className="text-sm text-text font-medium leading-tight">{p.nome}</p>
                  <p className="text-xs text-text-faint mt-0.5">{p.volume_litros}L</p>
                </div>

                <BarrilGauge
                  quantidade={p.quantidade_atual}
                  max={maxEstoque}
                  baixo={baixo}
                  color={brandColor(p.nome, p.marca)}
                />

                {editandoId === p.id ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      autoFocus
                      type="number"
                      min={0}
                      value={valorEdicao}
                      onChange={(e) => setValorEdicao(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && salvarQuantidade(p)}
                      className="w-full rounded-md bg-bg border border-border px-2 py-1 text-sm text-center font-[family-name:var(--font-mono)]"
                    />
                    <button
                      onClick={() => salvarQuantidade(p)}
                      className="text-ok text-xs shrink-0"
                      aria-label="Salvar"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => iniciarEdicao(p)}
                    className="text-xs text-amber hover:text-amber-strong"
                  >
                    Ajustar barris
                  </button>
                )}

                <div className="w-full pt-2 border-t border-border-subtle text-center">
                  {editandoMinimoId === p.id ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[11px] text-text-faint">mín.</span>
                      <input
                        autoFocus
                        type="number"
                        min={0}
                        value={valorMinimo}
                        onChange={(e) => setValorMinimo(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && salvarMinimo(p)}
                        className="w-14 rounded-md bg-bg border border-border px-1.5 py-0.5 text-xs text-center font-[family-name:var(--font-mono)]"
                      />
                      <button onClick={() => salvarMinimo(p)} className="text-ok text-xs">
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => iniciarEdicaoMinimo(p)}
                      className="text-[11px] text-text-faint hover:text-text-muted"
                    >
                      Alerta abaixo de{" "}
                      <span className="font-[family-name:var(--font-mono)]">{p.estoque_minimo}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
