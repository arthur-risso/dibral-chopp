"use client";

import { useEffect, useMemo, useState } from "react";
import { brandColor } from "@/lib/brandColors";
import type { ProdutoComEstoque } from "@/lib/types";
import { api, errorMessage } from "@/lib/apiClient";

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
  const [erro, setErro] = useState<string | null>(null);

  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let ativo = true;
    api
      .get<{ produtos: ProdutoComEstoque[] }>("/api/estoque")
      .then((body) => {
        if (ativo) setProdutos(body.produtos);
      })
      .catch((e) => {
        if (ativo) setErro(errorMessage(e));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [versao]);

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
      await api.put("/api/estoque", { produto_id: lancarProdutoId, quantidade_atual: valor });
      setLancarProdutoId("");
      setLancarQuantidade("");
      recarregar();
    } catch (e) {
      setErroLancamento(errorMessage(e));
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
    try {
      await api.put("/api/estoque", { produto_id: p.id, quantidade_atual: valor });
      setErro(null);
      recarregar();
    } catch (e) {
      setErro(errorMessage(e));
    } finally {
      setEditandoId(null);
    }
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
    try {
      await api.put(`/api/produtos/${p.id}`, { estoque_minimo: valor });
      setErro(null);
      recarregar();
    } catch (e) {
      setErro(errorMessage(e));
    } finally {
      setEditandoMinimoId(null);
    }
  }

  return (
    <div className="page-narrow">
      <header className="page-head">
        <div>
          <h1 className="page-title">Estoque</h1>
          <p className="page-sub">
            {loading
              ? "Carregando…"
              : baixoCount > 0
              ? `${baixoCount} chopp${baixoCount > 1 ? "s" : ""} abaixo do mínimo definido`
              : "Todos os chopps dentro do nível mínimo"}
          </p>
        </div>
      </header>

      {erro && (
        <p className="aviso aviso-danger mb-4" role="alert">
          {erro}
        </p>
      )}
      <section className="panel panel-pad mb-6">
        <h2 className="section-title" style={{ marginBottom: 12 }}>
          Lançar estoque disponível
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="label" htmlFor="lancar-chopp">
              Chopp
            </label>
            <select
              id="lancar-chopp"
              value={lancarProdutoId}
              onChange={(e) => setLancarProdutoId(e.target.value)}
              className="input"
            >
              <option value="">Escolha o chopp</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: 200 }}>
            <label className="label" htmlFor="lancar-qtd">
              Barris disponíveis
            </label>
            <input
              id="lancar-qtd"
              type="number"
              min={0}
              value={lancarQuantidade}
              onChange={(e) => setLancarQuantidade(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lancarEstoque()}
              className="input"
            />
          </div>
          <button onClick={lancarEstoque} disabled={lancando} className="btn btn-primary">
            {lancando ? "Lançando…" : "Lançar"}
          </button>
        </div>
        {erroLancamento && <p className="aviso aviso-danger mt-3">{erroLancamento}</p>}
        <p className="text-ink-2 text-sm mt-3">
          Isso substitui a quantidade atual desse chopp pelo valor informado.
        </p>
      </section>

      {loading ? (
        <p className="text-ink-2">Carregando…</p>
      ) : (
        <div className="panel overflow-hidden">
          <table className="tbl joint">
            <thead>
              <tr>
                <th>Chopp</th>
                <th className="r">Barris</th>
                <th style={{ width: "26%" }}>Nível (marca preta = mínimo)</th>
                <th className="r">Alerta abaixo de</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const baixo = p.quantidade_atual < p.estoque_minimo;
                const pct = Math.min((p.quantidade_atual / maxEstoque) * 100, 100);
                const pctMin = Math.min((p.estoque_minimo / maxEstoque) * 100, 100);
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <span className="brand-dot" style={{ background: brandColor(p.nome, p.marca) }} />
                        {p.nome}
                      </span>
                    </td>
                    <td className={`ncel ${baixo ? "alerta" : ""}`}>
                      {editandoId === p.id ? (
                        <span className="inline-flex items-center gap-2 justify-center">
                          <input
                            autoFocus
                            type="number"
                            min={0}
                            value={valorEdicao}
                            onChange={(e) => setValorEdicao(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && salvarQuantidade(p)}
                            aria-label={`Barris de ${p.nome}`}
                            className="input"
                            style={{ width: 84, textAlign: "center" }}
                          />
                          <button onClick={() => salvarQuantidade(p)} className="btn btn-primary btn-sm">
                            OK
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => iniciarEdicao(p)}
                          title="Clique para ajustar"
                          className={`num-btn ${baixo ? "baixo" : ""}`}
                        >
                          {p.quantidade_atual}
                        </button>
                      )}
                    </td>
                    <td>
                      <div className={`barra ${baixo ? "baixo" : ""}`}>
                        <i style={{ width: `${pct}%` }} />
                        {p.estoque_minimo > 0 && <b style={{ left: `${pctMin}%` }} />}
                      </div>
                    </td>
                    <td className="ncel">
                      {editandoMinimoId === p.id ? (
                        <span className="inline-flex items-center gap-2 justify-center">
                          <input
                            autoFocus
                            type="number"
                            min={0}
                            value={valorMinimo}
                            onChange={(e) => setValorMinimo(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && salvarMinimo(p)}
                            aria-label={`Mínimo de ${p.nome}`}
                            className="input"
                            style={{ width: 72, textAlign: "center" }}
                          />
                          <button onClick={() => salvarMinimo(p)} className="btn btn-primary btn-sm">
                            OK
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => iniciarEdicaoMinimo(p)}
                          title="Clique para ajustar"
                          className="num-btn"
                          style={{ fontSize: 17 }}
                        >
                          {p.estoque_minimo}
                        </button>
                      )}
                    </td>
                    <td>
                      {baixo ? (
                        <span className="tag tag-warn">estoque baixo</span>
                      ) : (
                        <span className="tag tag-ok">ok</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-ink-2 text-sm mt-3">
        Clique no número de barris para ajustar a quantidade, ou no número da coluna &ldquo;Alerta abaixo de&rdquo; para mudar o mínimo.
      </p>
    </div>
  );
}
