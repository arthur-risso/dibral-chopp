"use client";

import { IconSeta } from "@/components/icons";
import { useEffect, useState } from "react";
import Link from "next/link";
import { brandColor } from "@/lib/brandColors";
import { formatWeekLabel, getMondayISO, isCurrentWeek } from "@/lib/week";
import type { ProdutoComEstoque, ReservaComRelacoes, SugestaoProduto, Cliente } from "@/lib/types";
import { api, errorMessage } from "@/lib/apiClient";

export default function PainelPage() {
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([]);
  const [reservas, setReservas] = useState<ReservaComRelacoes[]>([]);
  const [sugestoes, setSugestoes] = useState<SugestaoProduto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const semanaAtual = getMondayISO();

  useEffect(() => {
    async function carregar() {
      try {
        const [bEstoque, bReservas, bSugestao, bClientes] = await Promise.all([
          api.get<{ produtos: ProdutoComEstoque[] }>("/api/estoque"),
          api.get<{ reservas: ReservaComRelacoes[] }>(`/api/reservas?semana=${semanaAtual}`),
          api.get<{ sugestoes: SugestaoProduto[] }>("/api/sugestao"),
          api.get<{ clientes: Cliente[] }>("/api/clientes?ativos=1"),
        ]);
        setProdutos(bEstoque.produtos);
        setReservas(bReservas.reservas);
        setSugestoes(bSugestao.sugestoes);
        setClientes(bClientes.clientes);
      } catch (e) {
        setErro(errorMessage(e));
      } finally {
        setLoading(false);
      }
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

  const aPuxar = sugestoes.filter((s) => s.sugestao_puxar > 0).sort((a, b) => b.sugestao_puxar - a.sugestao_puxar);

  return (
    <div className="page-narrow">
      <header className="page-head">
        <div>
          <h1 className="page-title">Painel</h1>
          <p className="page-sub">
            Semana de {formatWeekLabel(semanaAtual)}
            {isCurrentWeek(semanaAtual) && " · atual"}
          </p>
        </div>
        <Link href="/reservas" className="btn btn-primary">
          Lançar reservas da semana
          <IconSeta />
        </Link>
      </header>

      {erro && (
        <p className="aviso aviso-danger mb-4" role="alert">
          {erro}
        </p>
      )}
      {loading ? (
        <p className="text-ink-2">Carregando…</p>
      ) : (
        <>
          <p className="text-[17px] mb-6">
            <b>{clientes.length}</b> clientes ativos · <b>{totalReservadoSemana}</b> barris reservados nesta semana ·{" "}
            {baixoCount > 0 ? (
              <>
                <span className="tag tag-warn" style={{ height: 26, fontSize: 14 }}>
                  {baixoCount} {baixoCount > 1 ? "chopps abaixo" : "chopp abaixo"} do mínimo
                </span>{" "}
                <Link href="/estoque" className="link-btn">
                  Ajustar estoque
                </Link>
              </>
            ) : (
              <span className="tag tag-ok" style={{ height: 26, fontSize: 14 }}>
                estoque dentro do mínimo
              </span>
            )}
          </p>

          <div className="grid xl:grid-cols-[1.5fr_1fr] gap-6 items-start">
            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="section-title">Estoque atual</h2>
                <Link href="/estoque" className="link-btn">
                  Abrir estoque
                </Link>
              </div>
              <div className="panel overflow-hidden">
                <table className="tbl joint">
                  <thead>
                    <tr>
                      <th>Chopp</th>
                      <th className="r">Barris</th>
                      <th style={{ width: "38%" }}>Nível (marca preta = mínimo)</th>
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
                            <span className="font-display text-xl font-bold" style={baixo ? { color: "var(--orange-ink)" } : undefined}>
                              {p.quantidade_atual}
                            </span>
                          </td>
                          <td>
                            <div className={`barra ${baixo ? "baixo" : ""}`}>
                              <i style={{ width: `${pct}%` }} />
                              {p.estoque_minimo > 0 && <b style={{ left: `${pctMin}%` }} />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="section-title">Puxar esta semana</h2>
                <Link href="/sugestao" className="link-btn">
                  Ver o cálculo
                </Link>
              </div>
              <div className="panel">
                {aPuxar.length === 0 ? (
                  <p className="panel-pad text-ink-2">
                    Nenhuma sugestão de compra no momento. O estoque cobre a demanda estimada.
                  </p>
                ) : (
                  <>
                    <table className="tbl joint">
                      <tbody>
                        {aPuxar.map((s) => (
                          <tr key={s.produto_id}>
                            <td>
                              <span className="inline-flex items-center gap-2 font-semibold">
                                <span className="brand-dot" style={{ background: brandColor(s.produto_nome, s.marca) }} />
                                {s.produto_nome}
                              </span>
                            </td>
                            <td className="ncel" style={{ width: 90 }}>
                              <span className="font-display text-xl font-bold">{s.sugestao_puxar}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div
                      className="flex items-center justify-between px-3.5 py-3 text-white"
                      style={{ background: "var(--green)" }}
                    >
                      <span className="font-semibold">Total a puxar</span>
                      <span className="font-display text-2xl font-bold">
                        {totalPuxar} <span className="text-base font-semibold">barris</span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
