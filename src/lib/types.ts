export type Produto = {
  id: string;
  nome: string;
  marca: string;
  volume_litros: number;
  estoque_minimo: number;
  ordem: number;
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
