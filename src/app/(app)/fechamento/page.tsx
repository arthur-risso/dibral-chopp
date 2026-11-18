"use client";

import { IconCheck } from "@/components/icons";
import FilePicker from "@/components/FilePicker";
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
    <div className="page-narrow">
      <header className="page-head">
        <div>
          <h1 className="page-title">Fechamento</h1>
          <p className="page-sub">Importe o CSV de pedidos do dia exportado do Promax para conferir o que foi vendido</p>
        </div>
      </header>

      <section className="panel panel-pad mb-7">
        <h2 className="section-title" style={{ marginBottom: 12 }}>
          Novo fechamento
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <FilePicker
            inputRef={inputRef}
            label="Arquivo CSV do Promax"
            onChange={setArquivo}
            className="flex-1 min-w-[260px]"
          />
          <button onClick={processar} disabled={enviando || !arquivo} className="btn btn-primary">
            {enviando ? "Processando…" : "Processar fechamento"}
          </button>
        </div>
        {erro && (
          <p className="aviso aviso-danger mt-3" role="alert">
            {erro}
          </p>
        )}
      </section>

      {resumo && (
        <section className="mb-9">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <h2 className="font-display text-[30px] font-bold leading-none">
              Fechamento de {formatDateBR(resumo.fechamento.data)}
            </h2>
            <div className="text-right">
              <p className="text-sm font-semibold text-ink-2">Total vendido</p>
              <p className="font-display text-[38px] font-bold leading-none">
                {resumo.total_barris} <span className="text-lg font-semibold text-ink-2">barris</span>
              </p>
            </div>
          </div>
          <p className="text-ink-2 text-sm mb-4">
            {resumo.fechamento.linhas_reconhecidas} de {resumo.fechamento.total_linhas} linhas do arquivo
            reconhecidas como chopp de clientes cadastrados
            {resumo.linhas_ignoradas > 0 && ` (${resumo.linhas_ignoradas} ignoradas)`}.
          </p>

          <div className="grid xl:grid-cols-[1fr_1fr] gap-6 items-start">
            <div className="space-y-6">
              <div>
                <h3 className="section-title">
                  Alertas{" "}
                  {resumo.alertas.length === 0 && <span className="tag tag-ok align-middle ml-1">nenhum</span>}
                </h3>
                {resumo.alertas.length > 0 && (
                  <ul className="space-y-2">
                    {resumo.alertas.map((a, i) => (
                      <li
                        key={i}
                        className={`aviso ${a.tipo === "sem_reserva" ? "aviso-danger" : "aviso-warn"}`}
                      >
                        {a.tipo === "sem_reserva" ? (
                          <>
                            <strong>{a.cliente_nome}</strong> comprou {a.produto_nome} sem ter reservado
                            nada dessa semana.{" "}
                            {resumo.fechamento.sincronizado_em
                              ? "Já foi lançado como entregue."
                              : "Ao concluir o fechamento, será lançado como entregue."}
                          </>
                        ) : (
                          <>
                            <strong>{a.cliente_nome}</strong> já pegou {a.quantidade_vendida_semana}{" "}
                            {a.produto_nome} nessa semana, mas reservou só {a.quantidade_reservada}. Confira a
                            reserva dele.
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {resumo.por_produto.length > 0 && (
                <div>
                  <h3 className="section-title">Por chopp</h3>
                  <div className="panel overflow-hidden">
                    <table className="tbl joint">
                      <tbody>
                        {resumo.por_produto.map((p, i) => (
                          <tr key={p.produto_id}>
                            <td>
                              <span className="inline-flex items-center gap-2 font-semibold">
                                <span className="brand-dot" style={{ background: brandColor(p.produto_nome, p.marca) }} />
                                {p.produto_nome}
                              </span>
                              {i === 0 && <span className="tag tag-blue ml-2">mais vendido</span>}
                            </td>
                            <td className="ncel" style={{ width: 90 }}>
                              <span className="font-display text-xl font-bold">{p.barris}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {resumo.por_cidade.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="section-title" style={{ marginBottom: 0 }}>
                    Mensagem para o WhatsApp
                  </h3>
                  <button onClick={copiarMensagem} className="btn btn-sm">
                    {copiado ? (
                      <>
                        <IconCheck /> Copiado
                      </>
                    ) : (
                      "Copiar mensagem"
                    )}
                  </button>
                </div>
                <pre
                  className="panel panel-pad whitespace-pre-wrap"
                  style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.55 }}
                >
                  {montarMensagemPedidosChopp(resumo.por_cidade)}
                </pre>
              </div>
            )}
          </div>

          <div className="panel panel-pad mt-6" style={{ background: "var(--green-tint)", borderColor: "var(--green)" }}>
            {resumo.fechamento.sincronizado_em ? (
              <p className="font-semibold flex items-center gap-2" style={{ color: "var(--ok)" }}>
                <IconCheck />
                Sincronizado com as reservas em{" "}
                {new Date(resumo.fechamento.sincronizado_em).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <button onClick={sincronizar} disabled={sincronizando} className="btn btn-primary">
                  {sincronizando ? "Sincronizando…" : "Concluir fechamento e sincronizar"}
                </button>
                <p className="text-ink-2 text-sm flex-1 min-w-[260px]">
                  Desconta o que foi entregue hoje das reservas da semana (marcando como entregue quando
                  zerar) e cria uma reserva já entregue para quem comprou sem ter reservado.
                </p>
              </div>
            )}
            {mensagemSync && <p className="text-sm mt-3 font-semibold">{mensagemSync}</p>}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Histórico de fechamentos</h2>
        {erroHistorico && (
          <p className="aviso aviso-danger mb-3" role="alert">
            {erroHistorico}
          </p>
        )}
        {carregandoHistorico ? (
          <p className="text-ink-2">Carregando…</p>
        ) : historico.length === 0 ? (
          <div className="vazio">Nenhum fechamento importado ainda.</div>
        ) : (
          <div className="panel overflow-hidden">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Arquivo</th>
                  <th className="r">Barris</th>
                  <th>Sincronização</th>
                  <th className="r">Ações</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((f) => (
                  <tr key={f.id} className={selecionadoId === f.id ? "is-selected" : ""}>
                    <td className="font-semibold">{formatDateBR(f.data)}</td>
                    <td className="text-ink-2 truncate" style={{ maxWidth: 240 }}>
                      {f.arquivo_nome || "—"}
                    </td>
                    <td className="r">
                      <span className="font-display text-xl font-bold">{f.total_barris}</span>
                    </td>
                    <td>
                      {f.sincronizado_em ? (
                        <span className="tag tag-ok">sincronizado</span>
                      ) : (
                        <span className="tag">pendente</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-4">
                        <button onClick={() => verFechamento(f.id)} className="link-btn">
                          Ver
                        </button>
                        <button onClick={() => excluirFechamento(f)} className="link-btn danger" style={{ color: "var(--ink-3)" }}>
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
      </section>
    </div>
  );
}
