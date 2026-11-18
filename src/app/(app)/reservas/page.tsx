"use client";

import { IconEsq, IconDir, IconBusca, IconRelogio, IconCheck, IconX } from "@/components/icons";
import { useEffect, useMemo, useState } from "react";
import { getMondayISO, addWeeksISO, formatWeekLabel, isCurrentWeek } from "@/lib/week";
import { brandColor } from "@/lib/brandColors";
import { nomeExibicao } from "@/lib/clientes";
import type { Cliente, Produto, Reserva, ReservaComRelacoes, StatusReserva, CelulaReserva } from "@/lib/types";
import { api, errorMessage } from "@/lib/apiClient";

const PROXIMO_STATUS: Record<StatusReserva, StatusReserva> = {
  reservado: "entregue",
  entregue: "cancelado",
  cancelado: "reservado",
};

const STATUS_ROTULO: Record<StatusReserva, string> = {
  reservado: "Reservado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_ICONE: Record<StatusReserva, React.ReactElement> = {
  reservado: <IconRelogio />,
  entregue: <IconCheck />,
  cancelado: <IconX />,
};

function cellKey(clienteId: string, produtoId: string) {
  return `${clienteId}__${produtoId}`;
}

export default function ReservasPage() {
  const [semana, setSemana] = useState(getMondayISO());
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [celulas, setCelulas] = useState<Map<string, CelulaReserva>>(new Map());
  const [valores, setValores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<"codigo" | "nome">("codigo");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get<{ clientes: Cliente[] }>("/api/clientes?ativos=1"),
      api.get<{ produtos: Produto[] }>("/api/produtos"),
    ])
      .then(([bc, bp]) => {
        if (!ativo) return;
        setClientes(bc.clientes);
        setProdutos(bp.produtos);
      })
      .catch((e) => {
        if (ativo) setErro(errorMessage(e));
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Se a semana mudar antes da resposta chegar, a resposta antiga é
  // descartada — senão a grade mostraria (e editaria) a semana errada.
  useEffect(() => {
    let ativo = true;
    api
      .get<{ reservas: ReservaComRelacoes[] }>(`/api/reservas?semana=${semana}`)
      .then((body) => {
        if (!ativo) return;
        const novasCelulas = new Map<string, CelulaReserva>();
        const novosValores: Record<string, string> = {};
        for (const r of body.reservas) {
          const key = cellKey(r.cliente_id, r.produto_id);
          novasCelulas.set(key, { id: r.id, quantidade: r.quantidade, status: r.status });
          novosValores[key] = String(r.quantidade);
        }
        setCelulas(novasCelulas);
        setValores(novosValores);
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
  }, [semana]);

  function mudarSemana(delta: number) {
    setLoading(true);
    setSemana(addWeeksISO(semana, delta));
  }

  const clientesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    const lista = !termo
      ? clientes
      : clientes.filter(
          (c) =>
            c.codigo_principal.toLowerCase().includes(termo) ||
            (c.codigo_secundario || "").toLowerCase().includes(termo) ||
            (c.nome || "").toLowerCase().includes(termo) ||
            (c.setor || "").toLowerCase().includes(termo) ||
            (c.cidade || "").toLowerCase().includes(termo)
        );

    return [...lista].sort((a, b) =>
      ordenarPor === "codigo"
        ? a.codigo_principal.localeCompare(b.codigo_principal, "pt-BR", { numeric: true })
        : nomeExibicao(a).localeCompare(nomeExibicao(b), "pt-BR")
    );
  }, [clientes, busca, ordenarPor]);

  const totalPorProduto = useMemo(() => {
    return produtos.map((p) => {
      let total = 0;
      for (const c of clientes) {
        const cel = celulas.get(cellKey(c.id, p.id));
        if (cel && cel.status !== "cancelado") total += cel.quantidade;
      }
      return total;
    });
  }, [produtos, clientes, celulas]);

  function onChangeValor(clienteId: string, produtoId: string, texto: string) {
    const key = cellKey(clienteId, produtoId);
    setValores((prev) => ({ ...prev, [key]: texto }));
  }

  async function commitCelula(clienteId: string, produtoId: string) {
    const key = cellKey(clienteId, produtoId);
    const atual = celulas.get(key);
    const texto = (valores[key] ?? "").trim();
    const reverter = () => setValores((prev) => ({ ...prev, [key]: atual ? String(atual.quantidade) : "" }));

    if (texto === "") {
      if (atual) {
        try {
          await api.delete(`/api/reservas/${atual.id}`);
          setCelulas((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        } catch (e) {
          reverter();
          setErro(errorMessage(e));
        }
      }
      return;
    }

    const valor = Number(texto);
    if (!Number.isInteger(valor) || valor <= 0) {
      reverter();
      return;
    }
    if (atual && atual.quantidade === valor) return;

    try {
      const { reserva } = await api.put<{ reserva: Reserva }>("/api/reservas", {
        cliente_id: clienteId,
        produto_id: produtoId,
        quantidade: valor,
        semana_referencia: semana,
      });
      setCelulas((prev) => {
        const next = new Map(prev);
        next.set(key, { id: reserva.id, quantidade: reserva.quantidade, status: reserva.status });
        return next;
      });
      setValores((prev) => ({ ...prev, [key]: String(reserva.quantidade) }));
    } catch (e) {
      reverter();
      setErro(errorMessage(e));
    }
  }

  async function alternarStatus(clienteId: string, produtoId: string) {
    const key = cellKey(clienteId, produtoId);
    const atual = celulas.get(key);
    if (!atual) return;
    const novoStatus: StatusReserva = PROXIMO_STATUS[atual.status];
    try {
      await api.put(`/api/reservas/${atual.id}`, { status: novoStatus });
      setCelulas((prev) => {
        const next = new Map(prev);
        next.set(key, { ...atual, status: novoStatus });
        return next;
      });
    } catch (e) {
      setErro(errorMessage(e));
    }
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <h1 className="page-title">Reservas</h1>
          <p className="page-sub">
            {formatWeekLabel(semana)}
            {isCurrentWeek(semana) && " · semana atual"}
          </p>
        </div>
        <div className="seg" role="group" aria-label="Semana">
          <button onClick={() => mudarSemana(-1)} aria-label="Semana anterior">
            <IconEsq />
          </button>
          <button
            onClick={() => {
              if (!isCurrentWeek(semana)) {
                setLoading(true);
                setSemana(getMondayISO());
              }
            }}
            aria-pressed={isCurrentWeek(semana)}
            style={{ minWidth: 168 }}
          >
            {formatWeekLabel(semana)}
          </button>
          <button onClick={() => mudarSemana(1)} aria-label="Próxima semana">
            <IconDir />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-full max-w-md">
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
        <div className="seg" role="group" aria-label="Ordenar por">
          <span className="seg-label">Ordenar por</span>
          <button onClick={() => setOrdenarPor("codigo")} aria-pressed={ordenarPor === "codigo"}>
            Código
          </button>
          <button onClick={() => setOrdenarPor("nome")} aria-pressed={ordenarPor === "nome"}>
            Nome
          </button>
        </div>
        {!loading && clientes.length > 0 && (
          <span className="text-ink-2 text-sm ml-auto">
            {clientesFiltrados.length} de {clientes.length} clientes
          </span>
        )}
      </div>

      {erro && (
        <p className="aviso aviso-danger mb-4" role="alert">
          {erro}
        </p>
      )}

      {loading ? (
        <p className="text-ink-2">Carregando…</p>
      ) : clientes.length === 0 ? (
        <div className="vazio">
          Nenhum cliente ativo cadastrado ainda. Cadastre clientes para lançar reservas.
        </div>
      ) : (
        <div className="grade-wrap">
          <table className="grade">
            <thead>
              <tr>
                <th className="col-fixa sticky-cod">Código</th>
                <th className="col-fixa sticky-nome">Cliente</th>
                {produtos.map((p) => (
                  <th key={p.id} style={{ borderTopColor: brandColor(p.nome, p.marca) }}>
                    {p.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c) => (
                <tr key={c.id}>
                  <td className="cod sticky-cod">{c.codigo_principal}</td>
                  <td className="nome sticky-nome">
                    <span className={`n ${c.nome ? "" : "sem-nome"}`}>{c.nome || "Sem nome"}</span>
                    {(c.setor || c.cidade) && (
                      <span className="loc">{[c.setor, c.cidade].filter(Boolean).join(" · ")}</span>
                    )}
                  </td>
                  {produtos.map((p) => {
                    const key = cellKey(c.id, p.id);
                    const celula = celulas.get(key);
                    return (
                      <td key={p.id} className={`cel ${celula ? `st-${celula.status}` : ""}`}>
                        <div className="cel-in">
                          <input
                            type="number"
                            min={0}
                            value={valores[key] ?? ""}
                            onChange={(e) => onChangeValor(c.id, p.id, e.target.value)}
                            onBlur={() => commitCelula(c.id, p.id)}
                            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                            aria-label={`${nomeExibicao(c)}, ${p.nome}`}
                          />
                          {celula && (
                            <button
                              className="cel-status"
                              onClick={() => alternarStatus(c.id, p.id)}
                              title={`${STATUS_ROTULO[celula.status]}. Clique para mudar.`}
                              aria-label={`Status: ${STATUS_ROTULO[celula.status]}. Clique para mudar.`}
                            >
                              {STATUS_ICONE[celula.status]}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={produtos.length + 2} className="text-center text-ink-2" style={{ padding: 28 }}>
                    Nenhum cliente encontrado para &ldquo;{busca}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky-cod">Total</td>
                <td className="sticky-nome">na semana</td>
                {produtos.map((p, i) => (
                  <td key={p.id}>{totalPorProduto[i]}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="legenda">
        <span>Deixe a célula vazia para remover a reserva.</span>
        <span>
          Botão no canto da célula muda o status:
        </span>
        <span style={{ color: "var(--blue)" }}>
          <IconRelogio /> <b className="text-ink">reservado</b>
        </span>
        <span style={{ color: "var(--ok)" }}>
          <IconCheck /> <b className="text-ink">entregue</b>
        </span>
        <span style={{ color: "var(--ink-3)" }}>
          <IconX /> <b className="text-ink">cancelado</b>
        </span>
      </div>
    </div>
  );
}
