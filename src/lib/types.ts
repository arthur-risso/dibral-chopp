export type Produto = {
  id: string;
  nome: string;
  marca: string;
  volume_litros: number;
  estoque_minimo: number;
  ordem: number;
  codigo_promax: string | null;
};

export type Estoque = {
  produto_id: string;
  quantidade_atual: number;
  atualizado_em: string;
};

export type ProdutoComEstoque = Produto & {
  quantidade_atual: number;
  atualizado_em: string | null;
};

export type Cliente = {
  id: string;
  nome: string | null;
  codigo_principal: string;
  codigo_secundario: string | null;
  whatsapp: string | null;
  setor: string | null;
  cidade: string | null;
  ativo: boolean;
  criado_em: string;
};

export type StatusReserva = "reservado" | "entregue" | "cancelado";

export type Reserva = {
  id: string;
  cliente_id: string;
  produto_id: string;
  quantidade: number;
  semana_referencia: string; // YYYY-MM-DD (sempre uma segunda-feira)
  status: StatusReserva;
  criado_em: string;
};

export type ReservaComRelacoes = Reserva & {
  cliente_nome: string;
  produto_nome: string;
  produto_marca: string;
};

export type CelulaReserva = {
  id: string;
  quantidade: number;
  status: StatusReserva;
};

export type SugestaoProduto = {
  produto_id: string;
  produto_nome: string;
  marca: string;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_baixo: boolean;
  reservas_semana_atual: number;
  media_ultimas_semanas: number | null;
  semanas_com_historico: number;
  necessidade_estimada: number;
  sugestao_puxar: number;
};

// ---------------------------------------------------------------
// Fechamento (importação do relatório diário de pedidos do Promax)
// ---------------------------------------------------------------

export type Fechamento = {
  id: string;
  data: string; // YYYY-MM-DD
  arquivo_nome: string | null;
  total_linhas: number;
  linhas_reconhecidas: number;
  criado_em: string;
};

export type AlertaFechamento = {
  tipo: "sem_reserva" | "excedeu_reserva";
  cliente_id: string;
  cliente_nome: string;
  produto_id: string;
  produto_nome: string;
  quantidade_vendida_semana: number;
  quantidade_reservada: number;
};

export type ItemResumoProduto = {
  produto_id: string;
  produto_nome: string;
  marca: string;
  barris: number;
};

export type ResumoFechamento = {
  fechamento: Fechamento;
  total_barris: number;
  por_produto: ItemResumoProduto[];
  alertas: AlertaFechamento[];
  linhas_ignoradas: number;
};
