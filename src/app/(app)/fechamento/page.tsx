"use client";

import { useEffect, useRef, useState } from "react";
import { formatDateBR } from "@/lib/week";
import { brandColor } from "@/lib/brandColors";
import { parsePromaxCsv } from "@/lib/promaxParser";
import { agregarVendasPromax } from "@/lib/fechamentoAgregacao";
import { montarMensagemPedidosChopp } from "@/lib/mensagemFechamento";
import type { ResumoFechamento, Fechamento, Produto, Cliente } from "@/lib/types";
import { api, errorMessage } from "@/lib/apiClient";

type FechamentoComTotal = Fechamento & { total_barris: number };
type ResultadoSincronizacao = {
  resumo: ResumoFechamento;
  reservas_atualizadas: number;
  reservas_criadas: number;
};

export default function FechamentoPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoFechamento | null>(null);

  const [historico, setHistorico] = useState<FechamentoComTotal[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensagemSync, setMensagemSync] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [erroHistorico, setErroHistorico] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const [versaoHistorico, setVersaoHistorico] = useState(0);
  const recarregarHistorico = () => setVersaoHistorico((v) => v + 1);

  useEffect(() => {
    let ativo = true;
    api
      .get<{ fechamentos: FechamentoComTotal[] }>("/api/fechamento")
      .then((body) => {
        if (!ativo) return;
        setHistorico(body.fechamentos);
        setErroHistorico(null);
      })
      .catch((e) => {
        if (ativo) setErroHistorico(errorMessage(e));
      })
      .finally(() => {
        if (ativo) setCarregandoHistorico(false);
      });
    return () => {
      ativo = false;
    };
  }, [versaoHistorico]);

  async function processar() {
    if (!arquivo) {
      setErro("Selecione o arquivo CSV exportado do Promax.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      // Lê e filtra o arquivo aqui no navegador — só o resultado (poucas
      // linhas de chopp já reconhecidas) é enviado ao servidor, para não
      // esbarrar no limite de tamanho de requisição da hospedagem.
      const buffer = await arquivo.arrayBuffer();
      const texto = new TextDecoder("windows-1252").decode(buffer);
      const { linhas, totalLinhas } = parsePromaxCsv(texto);

      if (totalLinhas === 0) {
        setErro("Não consegui ler nenhuma linha desse arquivo.");
        return;
      }

      const [bProdutos, bClientes] = await Promise.all([
        api.get<{ produtos: Produto[] }>("/api/produtos"),
        api.get<{ clientes: Cliente[] }>("/api/clientes"),
      ]);

      const { vendas, reconhecidas, dataDetectada } = agregarVendasPromax(
        linhas,
        bProdutos.produtos,
        bClientes.clientes
      );

      if (!dataDetectada || vendas.length === 0) {
        setErro("Não encontrei nenhuma linha de chopp reconhecida (cliente e produto cadastrados) nesse arquivo.");
        return;
      }

      const body = await api.post<{ resumo: ResumoFechamento }>("/api/fechamento", {
        data: dataDetectada,
        arquivo_nome: arquivo.name,
        total_linhas: totalLinhas,
        linhas_reconhecidas: reconhecidas,
        vendas,
      });
      setResumo(body.resumo);
      setSelecionadoId(body.resumo.fechamento.id);
      setMensagemSync(null);
      setCopiado(false);
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      recarregarHistorico();
    } catch (e) {
      setErro(errorMessage(e));
    } finally {
      setEnviando(false);
    }
  }

  async function verFechamento(id: string) {
    setSelecionadoId(id);
    setMensagemSync(null);
    setCopiado(false);
    try {
      const body = await api.get<{ resumo: ResumoFechamento }>(`/api/fechamento/${id}`);
      setResumo(body.resumo);
    } catch (e) {
      setErroHistorico(errorMessage(e));
    }
  }

  async function copiarMensagem() {
    if (!resumo) return;
    const texto = montarMensagemPedidosChopp(resumo.por_cidade);
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const area = document.createElement("textarea");
      area.value = texto;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function sincronizar() {
    if (!resumo) return;
    setSincronizando(true);
    setErro(null);
    try {
      const body = await api.post<ResultadoSincronizacao>(`/api/fechamento/${resumo.fechamento.id}/sincronizar`);
      setResumo(body.resumo);
      setMensagemSync(
        `${body.reservas_atualizadas} reserva(s) atualizada(s) e ${body.reservas_criadas} nova(s) criada(s).`
      );
      recarregarHistorico();
    } catch (e) {
      setErro(errorMessage(e));
    } finally {
      setSincronizando(false);
    }
  }

  async function excluirFechamento(f: FechamentoComTotal) {
    if (!confirm(`Excluir o fechamento de ${formatDateBR(f.data)}? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/api/fechamento/${f.id}`);
    } catch (e) {
      setErroHistorico(errorMessage(e));
      return;
    }
    if (selecionadoId === f.id) {
      setResumo(null);
      setSelecionadoId(null);
    }
    recarregarHistorico();
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

          {resumo.por_cidade.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-muted">Mensagem para o WhatsApp</p>
                <button
                  onClick={copiarMensagem}
                  className="text-xs text-amber hover:text-amber-strong inline-flex items-center gap-1"
                >
                  {copiado ? (
                    <>
                      <CheckIcon /> Copiado
                    </>
                  ) : (
                    "Copiar mensagem"
                  )}
                </button>
              </div>
              <pre className="rounded-lg bg-bg-elevated border border-border-subtle px-3 py-2.5 text-xs text-text-muted whitespace-pre-wrap font-[family-name:var(--font-mono)] leading-relaxed">
                {montarMensagemPedidosChopp(resumo.por_cidade)}
              </pre>
            </div>
          )}

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

          <div className="mt-5 pt-4 border-t border-border-subtle">
            {resumo.fechamento.sincronizado_em ? (
              <p className="text-sm text-ok flex items-center gap-1.5">
                <CheckIcon />
                Sincronizado com as reservas em{" "}
                {new Date(resumo.fechamento.sincronizado_em).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : (
              <div>
                <button
                  onClick={sincronizar}
                  disabled={sincronizando}
                  className="rounded-lg bg-amber text-[#1a1408] font-medium px-4 py-2 text-sm hover:bg-amber-strong disabled:opacity-50"
                >
                  {sincronizando ? "Sincronizando…" : "Concluir fechamento e sincronizar"}
                </button>
                <p className="text-xs text-text-faint mt-2">
                  Desconta o que foi entregue hoje das reservas da semana (marcando como entregue
                  quando zerar) e cria uma reserva já entregue para quem comprou sem ter reservado.
                </p>
              </div>
            )}
            {mensagemSync && <p className="text-xs text-text-muted mt-2">{mensagemSync}</p>}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div>
        <p className="text-xs text-text-muted mb-3">Histórico de fechamentos</p>
        {erroHistorico && <p className="text-sm text-danger mb-3">{erroHistorico}</p>}
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
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Sync</th>
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
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      {f.sincronizado_em ? (
                        <span className="inline-flex items-center rounded-full bg-[var(--ok-bg)] text-ok px-2 py-0.5 text-[11px]">
                          sincronizado
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-faint">pendente</span>
                      )}
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

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
