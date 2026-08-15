"use client";

import { useEffect, useState } from "react";
import { formatWeekLabel } from "@/lib/week";
import { brandColor } from "@/lib/brandColors";
import type { SugestaoProduto } from "@/lib/types";

export default function SugestaoPage() {
  const [sugestoes, setSugestoes] = useState<SugestaoProduto[]>([]);
  const [semanasConsideradas, setSemanasConsideradas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sugestao")
      .then((r) => r.json())
      .then((body) => {
        setSugestoes(body.sugestoes || []);
        setSemanasConsideradas(body.semanas_consideradas || []);
        setLoading(false);
      });
  }, []);

  const totalPuxar = sugestoes.reduce((acc, s) => acc + s.sugestao_puxar, 0);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-text">
          Sugestão de compra
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          {semanasConsideradas.length > 0
            ? `Baseada na média das últimas ${semanasConsideradas.length} semana${
                semanasConsideradas.length > 1 ? "s" : ""
              } e nas reservas já feitas para esta semana`
            : "Ainda sem histórico de semanas anteriores — lance reservas por algumas semanas para a média ficar mais precisa"}
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-text-faint">Calculando…</p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface p-4 mb-6 flex items-center justify-between">
            <span className="text-sm text-text-muted">Total sugerido para puxar nesta semana</span>
            <span className="font-[family-name:var(--font-mono)] text-2xl text-amber">
              {totalPuxar} <span className="text-sm text-text-faint">barris</span>
            </span>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-elevated text-text-faint text-left">
                  <th className="px-4 py-2.5 font-medium">Chopp</th>
                  <th className="px-4 py-2.5 font-medium text-right">Estoque</th>
                  <th className="px-4 py-2.5 font-medium text-right hidden sm:table-cell">
                    Média/semana
                  </th>
                  <th className="px-4 py-2.5 font-medium text-right hidden sm:table-cell">
                    Reservado agora
                  </th>
                  <th className="px-4 py-2.5 font-medium text-right">Puxar</th>
                </tr>
              </thead>
              <tbody>
                {sugestoes.map((s) => (
                  <tr key={s.produto_id} className="border-t border-border-subtle">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-text">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: brandColor(s.produto_nome, s.marca) }}
                        />
                        {s.produto_nome}
                      </span>
                      {s.estoque_baixo && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-[var(--danger-bg)] text-danger px-1.5 py-0.5 text-[10px]">
                          estoque baixo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] text-text-muted">
                      {s.estoque_atual}
                    </td>
                    <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] text-text-muted hidden sm:table-cell">
                      {s.media_ultimas_semanas === null ? "—" : Math.round(s.media_ultimas_semanas)}
                    </td>
                    <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] text-text-muted hidden sm:table-cell">
                      {s.reservas_semana_atual}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-[family-name:var(--font-mono)] text-base ${
                          s.sugestao_puxar > 0 ? "text-amber-strong" : "text-text-faint"
                        }`}
                      >
                        {s.sugestao_puxar}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-text-faint mt-4 leading-relaxed max-w-2xl">
            Cálculo: para cada chopp, comparamos a média reservada nas últimas semanas com o que já
            foi reservado para a semana atual, e usamos o maior dos dois como estimativa de demanda.
            A sugestão de compra é essa estimativa menos o que já está em estoque.
          </p>
        </>
      )}
    </div>
  );
}
