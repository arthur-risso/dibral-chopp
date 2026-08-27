"use client";

import { useEffect, useRef, useState } from "react";
import { formatDateBR } from "@/lib/week";
import { brandColor } from "@/lib/brandColors";
import type { ResumoFechamento, Fechamento } from "@/lib/types";

type FechamentoComTotal = Fechamento & { total_barris: number };

export default function FechamentoPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoFechamento | null>(null);

  const [historico, setHistorico] = useState<FechamentoComTotal[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  async function carregarHistorico() {
    setCarregandoHistorico(true);
    const res = await fetch("/api/fechamento");
    const body = await res.json();
    setHistorico(body.fechamentos || []);
    setCarregandoHistorico(false);
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function processar() {
    if (!arquivo) {
      setErro("Selecione o arquivo CSV exportado do Promax.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      const res = await fetch("/api/fechamento", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setErro(body.error || "Não foi possível processar o arquivo.");
        return;
      }
      setResumo(body.resumo);
      setSelecionadoId(body.resumo.fechamento.id);
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      carregarHistorico();
    } finally {
      setEnviando(false);
    }
  }

  async function verFechamento(id: string) {
    setSelecionadoId(id);
    const res = await fetch(`/api/fechamento/${id}`);
    const body = await res.json();
    if (res.ok) setResumo(body.resumo);
  }

  async function excluirFechamento(f: FechamentoComTotal) {
    if (!confirm(`Excluir o fechamento de ${formatDateBR(f.data)}? Essa ação não pode ser desfeita.`)) return;
    await fetch(`/api/fechamento/${f.id}`, { method: "DELETE" });
    if (selecionadoId === f.id) {
      setResumo(null);
      setSelecionadoId(null);
    }
    carregarHistorico();
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-text">Fechamento</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Importe o CSV de pedidos do dia exportado do Promax para conferir o que foi vendido
        </p>
      </header>

      {/* Upload */}
      <div className="rounded-xl border border-border bg-surface p-4 mb-6">
        <p className="text-xs text-text-muted mb-3">Novo fechamento</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={(e) => setArquivo(e.target.files?.[0] || null)}
            className="flex-1 min-w-[220px] text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-bg-elevated file:px-3 file:py-2 file:text-sm file:text-text hover:file:bg-surface-hover file:cursor-pointer"
          />
          <button
            onClick={processar}
            disabled={enviando || !arquivo}
            className="rounded-lg bg-amber text-[#1a1408] font-medium px-4 py-2 text-sm hover:bg-amber-strong disabled:opacity-50"
          >
            {enviando ? "Processando…" : "Processar fechamento"}
          </button>
        </div>
        {erro && <p className="text-sm text-danger mt-2">{erro}</p>}
      </div>

      {/* Resumo */}
      {resumo && (
        <div className="rounded-xl border border-border bg-surface p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <p className="text-sm text-text-muted">Fechamento de</p>
              <p className="font-[family-name:var(--font-display)] text-xl text-text">
                {formatDateBR(resumo.fechamento.data)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">Total vendido</p>
              <p className="font-[family-name:var(--font-mono)] text-2xl text-amber">
                {resumo.total_barris} <span className="text-sm text-text-faint">barris</span>
              </p>
            </div>
          </div>

          <p className="text-xs text-text-faint mb-4">
            {resumo.fechamento.linhas_reconhecidas} de {resumo.fechamento.total_linhas} linhas do arquivo
            reconhecidas como chopp de clientes cadastrados
            {resumo.linhas_ignoradas > 0 && ` (${resumo.linhas_ignoradas} ignoradas)`}.
          </p>

          {resumo.por_produto.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-text-muted mb-2">Por chopp</p>
              <ul className="space-y-1.5">
                {resumo.por_produto.map((p, i) => (
                  <li key={p.produto_id} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-text-muted">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: brandColor(p.produto_nome, p.marca) }}
                      />
                      {p.produto_nome}
                      {i === 0 && (
                        <span className="ml-1 text-[10px] text-amber-strong">mais vendido</span>
                      )}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-text">{p.barris}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs text-text-muted mb-2">
              Alertas {resumo.alertas.length === 0 && <span className="text-ok">— nenhum</span>}
            </p>
            {resumo.alertas.length > 0 && (
              <ul className="space-y-2">
                {resumo.alertas.map((a, i) => (
                  <li
                    key={i}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      a.tipo === "sem_reserva"
                        ? "bg-[var(--danger-bg)] text-danger"
                        : "bg-[var(--warn-bg)] text-warn"
                    }`}
                  >
                    {a.tipo === "sem_reserva" ? (
                      <>
                        <strong>{a.cliente_nome}</strong> comprou {a.produto_nome} sem ter reservado
                        nada dessa semana.
                      </>
                    ) : (
                      <>
                        <strong>{a.cliente_nome}</strong> já pegou {a.quantidade_vendida_semana}{" "}
                        {a.produto_nome} nessa semana, mas reservou só {a.quantidade_reservada}.
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div>
        <p className="text-xs text-text-muted mb-3">Histórico de fechamentos</p>
        {carregandoHistorico ? (
          <p className="text-sm text-text-faint">Carregando…</p>
        ) : historico.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center">
            <p className="text-text-muted text-sm">Nenhum fechamento importado ainda.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-elevated text-text-faint text-left">
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Arquivo</th>
                  <th className="px-4 py-2.5 font-medium text-right">Barris</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((f) => (
                  <tr
                    key={f.id}
                    className={`border-t border-border-subtle hover:bg-surface/40 ${
                      selecionadoId === f.id ? "bg-surface/50" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-text">{formatDateBR(f.data)}</td>
                    <td className="px-4 py-2.5 text-text-muted hidden sm:table-cell truncate max-w-[220px]">
                      {f.arquivo_nome || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] text-text">
                      {f.total_barris}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => verFechamento(f.id)}
                          className="text-xs text-amber hover:text-amber-strong"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => excluirFechamento(f)}
                          className="text-xs text-text-faint hover:text-danger"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
