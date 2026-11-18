"use client";

import { IconBusca, IconEditar, IconPower, IconLixeira } from "@/components/icons";
import FilePicker from "@/components/FilePicker";
import { useEffect, useState, useMemo, useRef } from "react";
import Modal from "@/components/Modal";
import { nomeExibicao } from "@/lib/clientes";
import { parseClientesCsv, decodificarTextoAutomatico, type LinhaImportacao } from "@/lib/clienteImportParser";
import type { Cliente } from "@/lib/types";
import { api, errorMessage } from "@/lib/apiClient";

type FormState = {
  nome: string;
  codigo_principal: string;
  codigo_secundario: string;
  whatsapp: string;
  setor: string;
  cidade: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  codigo_principal: "",
  codigo_secundario: "",
  whatsapp: "",
  setor: "",
  cidade: "",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [importAberto, setImportAberto] = useState(false);
  const [linhasImportacao, setLinhasImportacao] = useState<LinhaImportacao[]>([]);
  const [nomeArquivoImportacao, setNomeArquivoImportacao] = useState<string | null>(null);
  const [erroImportacao, setErroImportacao] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacao, setResultadoImportacao] = useState<{ importados: number; ignorados: number } | null>(
    null
  );
  const inputImportacaoRef = useRef<HTMLInputElement>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let ativo = true;
    api
      .get<{ clientes: Cliente[] }>("/api/clientes")
      .then((body) => {
        if (ativo) setClientes(body.clientes);
      })
      .catch((e) => {
        if (ativo) setErroLista(errorMessage(e));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [versao]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase();
    return clientes
      .filter((c) => mostrarInativos || c.ativo)
      .filter(
        (c) =>
          (c.nome || "").toLowerCase().includes(termo) ||
          c.codigo_principal.toLowerCase().includes(termo) ||
          (c.codigo_secundario || "").toLowerCase().includes(termo) ||
          (c.setor || "").toLowerCase().includes(termo) ||
          (c.cidade || "").toLowerCase().includes(termo)
      );
  }, [clientes, busca, mostrarInativos]);

  function abrirNovo() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(c: Cliente) {
    setEditando(c);
    setForm({
      nome: c.nome || "",
      codigo_principal: c.codigo_principal,
      codigo_secundario: c.codigo_secundario || "",
      whatsapp: c.whatsapp || "",
      setor: c.setor || "",
      cidade: c.cidade || "",
    });
    setErro(null);
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.codigo_principal.trim()) {
      setErro("Informe o código principal do cliente.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      if (editando) await api.put(`/api/clientes/${editando.id}`, form);
      else await api.post("/api/clientes", form);
      setModalAberto(false);
      recarregar();
    } catch (e) {
      setErro(errorMessage(e));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(c: Cliente) {
    try {
      await api.put(`/api/clientes/${c.id}`, { ativo: !c.ativo });
      setErroLista(null);
      recarregar();
    } catch (e) {
      setErroLista(errorMessage(e));
    }
  }

  async function excluir(c: Cliente) {
    if (!confirm(`Excluir ${nomeExibicao(c)}? Isso também remove todas as reservas dele.`)) return;
    try {
      await api.delete(`/api/clientes/${c.id}`);
      setErroLista(null);
      recarregar();
    } catch (e) {
      setErroLista(errorMessage(e));
    }
  }

  function abrirImportacao() {
    setLinhasImportacao([]);
    setNomeArquivoImportacao(null);
    setErroImportacao(null);
    setResultadoImportacao(null);
    setImportAberto(true);
  }

  async function selecionarArquivoImportacao(file: File) {
    setErroImportacao(null);
    setResultadoImportacao(null);
    setNomeArquivoImportacao(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const texto = decodificarTextoAutomatico(buffer);
      const linhas = parseClientesCsv(texto);
      if (linhas.length === 0) {
        setErroImportacao("Não encontrei nenhuma linha nesse arquivo.");
        setLinhasImportacao([]);
        return;
      }
      setLinhasImportacao(linhas);
    } catch {
      setErroImportacao("Não consegui ler esse arquivo. Confirme que é um CSV.");
    }
  }

  async function confirmarImportacao() {
    const validas = linhasImportacao.filter((l) => !l.erro);
    if (validas.length === 0) return;
    setImportando(true);
    setErroImportacao(null);
    try {
      const body = await api.post<{ importados: number; ignorados: number }>("/api/clientes/importar", {
        clientes: validas.map((l) => ({
          nome: l.nome,
          codigo_principal: l.codigo_principal,
          codigo_secundario: l.codigo_secundario,
          whatsapp: l.whatsapp,
          setor: l.setor,
          cidade: l.cidade,
        })),
      });
      setResultadoImportacao({ importados: body.importados, ignorados: body.ignorados });
      setLinhasImportacao([]);
      if (inputImportacaoRef.current) inputImportacaoRef.current.value = "";
      recarregar();
    } catch (e) {
      setErroImportacao(errorMessage(e));
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="page-narrow">
      <header className="page-head">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-sub">{clientes.filter((c) => c.ativo).length} clientes ativos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={abrirImportacao} className="btn">
            Importar planilha
          </button>
          <button onClick={abrirNovo} className="btn btn-primary">
            Novo cliente
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">
            <IconBusca />
          </span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código, nome, setor ou cidade"
            aria-label="Buscar cliente"
            className="input"
            style={{ paddingLeft: 38 }}
          />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
          />
          Mostrar inativos
        </label>
      </div>

      {erroLista && (
        <p className="aviso aviso-danger mb-4" role="alert">
          {erroLista}
        </p>
      )}
      {loading ? (
        <p className="text-ink-2">Carregando…</p>
      ) : listaFiltrada.length === 0 ? (
        <EmptyState busca={busca} onNovo={abrirNovo} />
      ) : (
        <div className="panel overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Setor / Cidade</th>
                <th>Código secundário</th>
                <th>WhatsApp</th>
                <th>Situação</th>
                <th className="r">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((c) => (
                <tr key={c.id} style={c.ativo ? undefined : { opacity: 0.72 }}>
                  <td>
                    <span className="font-display text-[19px] font-bold" style={{ color: "var(--green-2)" }}>
                      {c.codigo_principal}
                    </span>
                  </td>
                  <td className={c.nome ? "font-semibold" : "sem-nome"}>{c.nome || "Sem nome"}</td>
                  <td className="text-ink-2">
                    {c.setor || c.cidade ? [c.setor, c.cidade].filter(Boolean).join(" · ") : "—"}
                  </td>
                  <td className="text-ink-2">{c.codigo_secundario || "—"}</td>
                  <td className="text-ink-2">{c.whatsapp || "—"}</td>
                  <td>
                    <span className={`tag ${c.ativo ? "tag-ok" : ""}`}>{c.ativo ? "Ativo" : "Inativo"}</span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => abrirEdicao(c)} className="icon-btn" title="Editar" aria-label="Editar">
                        <IconEditar />
                      </button>
                      <button
                        onClick={() => alternarAtivo(c)}
                        className="icon-btn"
                        title={c.ativo ? "Desativar" : "Ativar"}
                        aria-label={c.ativo ? "Desativar" : "Ativar"}
                      >
                        <IconPower />
                      </button>
                      <button
                        onClick={() => excluir(c)}
                        className="icon-btn danger"
                        title="Excluir"
                        aria-label="Excluir"
                      >
                        <IconLixeira />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <Modal title={editando ? "Editar cliente" : "Novo cliente"} onClose={() => setModalAberto(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código principal *">
                <input
                  autoFocus
                  value={form.codigo_principal}
                  onChange={(e) => setForm({ ...form, codigo_principal: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Código secundário">
                <input
                  value={form.codigo_secundario}
                  onChange={(e) => setForm({ ...form, codigo_secundario: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Nome">
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Celular / WhatsApp">
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="(00) 00000-0000"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Setor">
                <input
                  value={form.setor}
                  onChange={(e) => setForm({ ...form, setor: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Cidade">
                <input
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="input"
                />
              </Field>
            </div>

            {erro && (
              <p className="aviso aviso-danger" role="alert">
                {erro}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setModalAberto(false)} className="btn btn-quiet">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando} className="btn btn-primary">
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {importAberto && (
        <Modal title="Importar clientes em massa" onClose={() => setImportAberto(false)} wide>
          <div className="space-y-4">
            <div className="aviso" style={{ background: "var(--porcelain)" }}>
              <a href="/modelo-clientes.xlsx" download className="link-btn">
                Baixar modelo (.xlsx)
              </a>
              . Preencha no Excel, depois salve como <b>CSV</b> (Arquivo → Salvar como → CSV) e envie o
              CSV aqui embaixo.
            </div>

            <FilePicker
              inputRef={inputImportacaoRef}
              label="Arquivo CSV de clientes"
              onChange={(file) => {
                if (file) selecionarArquivoImportacao(file);
              }}
            />

            {erroImportacao && (
              <p className="aviso aviso-danger" role="alert">
                {erroImportacao}
              </p>
            )}

            {resultadoImportacao && (
              <p className="aviso aviso-ok">
                {resultadoImportacao.importados} cliente(s) importado(s)
                {resultadoImportacao.ignorados > 0 &&
                  `, ${resultadoImportacao.ignorados} ignorado(s) por já existir código igual`}
                .
              </p>
            )}

            {linhasImportacao.length > 0 && (
              <>
                <p className="text-ink-2 text-sm">
                  {nomeArquivoImportacao}: {linhasImportacao.filter((l) => !l.erro).length} válida(s) de{" "}
                  {linhasImportacao.length} linha(s)
                </p>
                <div className="panel overflow-auto" style={{ maxHeight: 260 }}>
                  <table className="tbl" style={{ fontSize: 14 }}>
                    <thead>
                      <tr>
                        <th style={{ position: "sticky", top: 0 }}>Linha</th>
                        <th style={{ position: "sticky", top: 0 }}>Cliente</th>
                        <th style={{ position: "sticky", top: 0 }}>Código</th>
                        <th style={{ position: "sticky", top: 0 }}>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhasImportacao.map((l) => (
                        <tr key={l.linha}>
                          <td className="text-ink-2">{l.linha}</td>
                          <td>{l.nome || "—"}</td>
                          <td className="font-semibold">{l.codigo_principal || "—"}</td>
                          <td>
                            {l.erro ? (
                              <span className="tag tag-danger">{l.erro}</span>
                            ) : (
                              <span className="tag tag-ok">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setImportAberto(false)} className="btn btn-quiet">
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarImportacao}
                    disabled={importando || linhasImportacao.every((l) => l.erro)}
                    className="btn btn-primary"
                  >
                    {importando
                      ? "Importando…"
                      : `Importar ${linhasImportacao.filter((l) => !l.erro).length} cliente(s)`}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ busca, onNovo }: { busca: string; onNovo: () => void }) {
  return (
    <div className="vazio">
      <p>{busca ? `Nenhum cliente encontrado para "${busca}".` : "Nenhum cliente cadastrado ainda."}</p>
      {!busca && (
        <button onClick={onNovo} className="link-btn mt-3">
          Cadastrar o primeiro cliente
        </button>
      )}
    </div>
  );
}
