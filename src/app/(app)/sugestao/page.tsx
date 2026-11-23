"use client";

import { useEffect, useState } from "react";
import { brandColor } from "@/lib/brandColors";
import type { SugestaoProduto } from "@/lib/types";
import { api, errorMessage } from "@/lib/apiClient";

export default function SugestaoPage() {
  const [sugestoes, setSugestoes] = useState<SugestaoProduto[]>([]);
  const [semanasConsideradas, setSemanasConsideradas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ sugestoes: SugestaoProduto[]; semanas_consideradas: string[] }>("/api/sugestao")
      .then((body) => {
        setSugestoes(body.sugestoes);
        setSemanasConsideradas(body.semanas_consideradas);
      })
      .catch((e) => setErro(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const totalPuxar = sugestoes.reduce((acc, s) => acc + s.sugestao_puxar, 0);

  return (
    <div className="page-narrow">
      <header className="page-head">
        <div>
          <h1 className="page-title">Sugestão de compra</h1>
          <p className="page-sub">
            {semanasConsideradas.length > 0
              ? `Baseada na média das últimas ${semanasConsideradas.length} semana${
                  semanasConsideradas.length > 1 ? "s" : ""
                } e nas reservas já feitas para esta semana`
              : "Ainda sem histórico de semanas anteriores. Lance reservas por algumas semanas para a média ficar mais precisa"}
          </p>
        </div>
        {!loading && (
          <div className="text-right">
            <p className="text-sm font-semibold text-ink-2">Total para puxar nesta semana</p>
            <p className="font-display text-[38px] font-bold leading-none">
              {totalPuxar} <span className="text-lg font-semibold text-ink-2">barris</span>
            </p>
          </div>
        )}
      </header>

      {erro && (
        <p className="aviso aviso-danger mb-4" role="alert">
          {erro}
        </p>
      )}
      {loading ? (
        <p className="text-ink-2">Calculando…</p>
      ) : (
        <>
          <div className="panel overflow-hidden">
            <table className="tbl joint">
              <thead>
                <tr>
                  <th>Chopp</th>
                  <th className="r">Estoque</th>
                  <th className="r">Média por semana</th>
                  <th className="r">Reservado agora</th>
                  <th className="r">Puxar</th>
                </tr>
              </thead>
              <tbody>
                {sugestoes.map((s) => (
                  <tr key={s.produto_id}>
                    <td>
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <span className="brand-dot" style={{ background: brandColor(s.produto_nome, s.marca) }} />
                        {s.produto_nome}
                      </span>
                      {s.estoque_baixo && <span className="tag tag-warn ml-2">estoque baixo</span>}
                    </td>
                    <td className="r">{s.estoque_atual}</td>
                    <td className="r">
                      {s.media_ultimas_semanas === null ? "—" : Math.round(s.media_ultimas_semanas)}
                    </td>
                    <td className="r">{s.reservas_semana_atual}</td>
                    <td className="ncel">
                      <span
                        className="font-display text-2xl font-bold"
                        style={{ color: s.sugestao_puxar > 0 ? "var(--green)" : "var(--ink-3)" }}
                      >
                        {s.sugestao_puxar}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-ink-2 mt-5 max-w-2xl text-[14.5px]">
            Como o cálculo é feito: para cada chopp, comparamos a média reservada nas últimas semanas
            com o que já foi reservado para a semana atual, e usamos o maior dos dois como estimativa
            de demanda. A sugestão de compra é essa estimativa menos o que já está em estoque.
          </p>
        </>
      )}
    </div>
  );
}
