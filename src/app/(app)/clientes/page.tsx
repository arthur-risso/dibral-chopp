"use client";

import { useEffect, useState, useMemo } from "react";
import Modal from "@/components/Modal";
import { nomeExibicao } from "@/lib/clientes";
import type { Cliente } from "@/lib/types";

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

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/clientes");
    const body = await res.json();
    setClientes(body.clientes || []);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

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
      const url = editando ? `/api/clientes/${editando.id}` : "/api/clientes";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setErro(body.error || "Não foi possível salvar.");
        return;
      }
      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(c: Cliente) {
    await fetch(`/api/clientes/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !c.ativo }),
    });
    carregar();
  }

  async function excluir(c: Cliente) {
    if (!confirm(`Excluir ${nomeExibicao(c)}? Isso também remove todas as reservas dele.`)) return;
    await fetch(`/api/clientes/${c.id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-text">Clientes</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {clientes.filter((c) => c.ativo).length} clientes ativos
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="rounded-lg bg-amber text-[#1a1408] font-medium px-4 py-2 text-sm hover:bg-amber-strong transition"
        >
          + Novo cliente
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código…"
          className="flex-1 min-w-[200px] rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        />
        <label className="flex items-center gap-2 text-sm text-text-muted whitespace-nowrap">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
            className="accent-[var(--amber)]"
          />
          Mostrar inativos
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-text-faint">Carregando…</p>
      ) : listaFiltrada.length === 0 ? (
        <EmptyState busca={busca} onNovo={abrirNovo} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-elevated text-text-faint text-left">
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Setor / Cidade</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Código secundário</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">WhatsApp</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((c) => (
                <tr key={c.id} className="border-t border-border-subtle hover:bg-surface/40">
                  <td className="px-4 py-2.5 text-text">
                    <div>{nomeExibicao(c)}</div>
                    <div className="text-xs text-text-faint font-[family-name:var(--font-mono)]">
                      {c.codigo_principal}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-text-muted hidden lg:table-cell">
                    {c.setor || c.cidade ? [c.setor, c.cidade].filter(Boolean).join(" · ") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted hidden sm:table-cell font-[family-name:var(--font-mono)]">
                    {c.codigo_secundario || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted hidden md:table-cell font-[family-name:var(--font-mono)]">
                    {c.whatsapp || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                        c.ativo ? "bg-[var(--ok-bg)] text-ok" : "bg-surface text-text-faint"
                      }`}
                    >
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => abrirEdicao(c)}
                        className="text-text-faint hover:text-amber p-1.5 rounded-md"
                        title="Editar"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => alternarAtivo(c)}
                        className="text-text-faint hover:text-text p-1.5 rounded-md"
                        title={c.ativo ? "Desativar" : "Ativar"}
                      >
                        <PowerIcon />
                      </button>
                      <button
                        onClick={() => excluir(c)}
                        className="text-text-faint hover:text-danger p-1.5 rounded-md"
                        title="Excluir"
                      >
                        <TrashIcon />
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
          <div className="space-y-3">
            <Field label="Nome (opcional)">
              <input
                autoFocus
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código principal *">
                <input
                  value={form.codigo_principal}
                  onChange={(e) => setForm({ ...form, codigo_principal: e.target.value })}
                  className="input font-[family-name:var(--font-mono)]"
                />
              </Field>
              <Field label="Código secundário">
                <input
                  value={form.codigo_secundario}
                  onChange={(e) => setForm({ ...form, codigo_secundario: e.target.value })}
                  className="input font-[family-name:var(--font-mono)]"
                />
              </Field>
            </div>
            <Field label="Celular / WhatsApp (opcional)">
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="(00) 00000-0000"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Setor (opcional)">
                <input
                  value={form.setor}
                  onChange={(e) => setForm({ ...form, setor: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Cidade (opcional)">
                <input
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="input"
                />
              </Field>
            </div>

            {erro && <p className="text-sm text-danger">{erro}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalAberto(false)}
                className="rounded-lg px-4 py-2 text-sm text-text-muted hover:text-text"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="rounded-lg bg-amber text-[#1a1408] font-medium px-4 py-2 text-sm hover:bg-amber-strong disabled:opacity-50"
              >
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
          color: var(--text);
        }
        .input:focus-visible {
          outline: 2px solid var(--amber);
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ busca, onNovo }: { busca: string; onNovo: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-12 text-center">
      <p className="text-text-muted text-sm">
        {busca ? `Nenhum cliente encontrado para "${busca}".` : "Nenhum cliente cadastrado ainda."}
      </p>
      {!busca && (
        <button onClick={onNovo} className="mt-3 text-sm text-amber hover:text-amber-strong">
          Cadastrar o primeiro cliente
        </button>
      )}
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PowerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M18.4 6.6a8 8 0 1 1-12.8 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
