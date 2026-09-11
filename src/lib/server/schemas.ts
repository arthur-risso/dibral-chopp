import "server-only";
import { z } from "zod";
import { STATUS_RESERVA } from "@/lib/types";
import { isMondayISO, isValidISODate } from "@/lib/week";

/**
 * Validação de tudo que chega pela API. Campos desconhecidos são
 * descartados pelo zod, então o navegador não consegue gravar colunas
 * que a rota não esperava (id, criado_em, sincronizado_em…).
 *
 * Os limites de texto batem com as constraints de
 * supabase/migrations/005_seguranca.sql.
 */
export const TEXT_LIMITS = {
  nome: 150,
  codigo: 50,
  whatsapp: 40,
  setor: 100,
  cidade: 100,
  arquivoNome: 255,
} as const;

const MAX_ITENS_LOTE = 5000;

export const MSG_CODIGO_DUPLICADO = "Já existe um cliente com esse código principal.";

const uuid = (label: string) => z.uuid(`${label} inválido.`);

const isoDate = z.string("Data inválida.").refine(isValidISODate, "Data inválida.");
const mondayISO = isoDate.refine(isMondayISO, "A semana deve começar em uma segunda-feira.");

function integer(label: string, min: number, max: number, minMessage?: string) {
  return z
    .number(`${label} deve ser um número.`)
    .int(`${label} deve ser um número inteiro.`)
    .min(min, minMessage ?? `${label} deve ser no mínimo ${min}.`)
    .max(max, `${label} deve ser no máximo ${max}.`);
}

/** Texto opcional: apara espaços e transforma "" em null. */
function optionalText(label: string, max: number) {
  return z
    .string(`${label} inválido.`)
    .trim()
    .max(max, `${label} deve ter no máximo ${max} caracteres.`)
    .nullable()
    .transform((v) => v || null)
    .optional();
}

function body<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape, "Requisição inválida.");
}

const hasFields = (obj: object) => Object.keys(obj).length > 0;

export const idParamsSchema = z.object({ id: uuid("ID") });

// ---------------------------------------------------------------
// Login
// ---------------------------------------------------------------

export const loginSchema = body({
  password: z.string("Informe a senha.").min(1, "Informe a senha.").max(256, "Senha inválida."),
});

// ---------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------

const clienteFields = {
  nome: optionalText("Nome", TEXT_LIMITS.nome),
  codigo_principal: z
    .string("Código principal é obrigatório.")
    .trim()
    .min(1, "Código principal é obrigatório.")
    .max(TEXT_LIMITS.codigo, `Código principal deve ter no máximo ${TEXT_LIMITS.codigo} caracteres.`),
  codigo_secundario: optionalText("Código secundário", TEXT_LIMITS.codigo),
  whatsapp: optionalText("WhatsApp", TEXT_LIMITS.whatsapp),
  setor: optionalText("Setor", TEXT_LIMITS.setor),
  cidade: optionalText("Cidade", TEXT_LIMITS.cidade),
  ativo: z.boolean("Status do cliente inválido.").optional(),
};

export const clienteCriarSchema = body(clienteFields);

export const clienteAtualizarSchema = body(clienteFields).partial().refine(hasFields, "Nada para atualizar.");

export const importarClientesSchema = body({
  clientes: z
    .array(
      z.object(
        {
          ...clienteFields,
          // Linhas sem código são descartadas pela rota, não recusadas
          codigo_principal: z
            .string("Código principal inválido.")
            .trim()
            .max(TEXT_LIMITS.codigo, `Código principal deve ter no máximo ${TEXT_LIMITS.codigo} caracteres.`),
          ativo: z.undefined().optional(),
        },
        "Linha de cliente inválida."
      ),
      "Nenhum cliente para importar."
    )
    .min(1, "Nenhum cliente para importar.")
    .max(MAX_ITENS_LOTE, `Importe no máximo ${MAX_ITENS_LOTE} clientes por vez.`),
});

// ---------------------------------------------------------------
// Produtos e estoque
// ---------------------------------------------------------------

export const estoqueAtualizarSchema = body({
  produto_id: uuid("Produto"),
  quantidade_atual: integer("Quantidade", 0, 100_000, "Quantidade não pode ser negativa."),
});

export const produtoAtualizarSchema = body({
  estoque_minimo: integer("Estoque mínimo", 0, 10_000, "Estoque mínimo não pode ser negativo."),
});

// ---------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------

const quantidadeReserva = integer("Quantidade", 1, 10_000, "Quantidade deve ser maior que zero.");

export const reservasQuerySchema = z.object({ semana: mondayISO.optional() });

export const reservaSalvarSchema = body({
  cliente_id: uuid("Cliente"),
  produto_id: uuid("Produto"),
  quantidade: quantidadeReserva,
  semana_referencia: mondayISO,
});

export const reservaAtualizarSchema = body({
  quantidade: quantidadeReserva.optional(),
  status: z.enum(STATUS_RESERVA, "Status inválido.").optional(),
}).refine(hasFields, "Nada para atualizar.");

// ---------------------------------------------------------------
// Fechamento
// ---------------------------------------------------------------

export const fechamentoCriarSchema = body({
  data: isoDate,
  arquivo_nome: z
    .string("Nome do arquivo inválido.")
    .trim()
    .transform((v) => v.slice(0, TEXT_LIMITS.arquivoNome) || null)
    .nullish(),
  total_linhas: integer("Total de linhas", 0, 10_000_000).optional(),
  linhas_reconhecidas: integer("Linhas reconhecidas", 0, 10_000_000).optional(),
  vendas: z
    .array(
      z.object(
        {
          cliente_id: uuid("Cliente"),
          produto_id: uuid("Produto"),
          quantidade_litros: z
            .number("Quantidade de litros inválida.")
            .positive("Quantidade de litros deve ser maior que zero.")
            .max(1_000_000, "Quantidade de litros muito alta."),
        },
        "Venda inválida."
      ),
      "Nenhuma venda enviada."
    )
    .min(1, "Não encontrei nenhuma linha de chopp reconhecida (cliente e produto cadastrados) nesse arquivo.")
    .max(MAX_ITENS_LOTE, `Envie no máximo ${MAX_ITENS_LOTE} vendas por fechamento.`),
});
