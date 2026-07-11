/**
 * Tipos de domínio do CondoOS — espelham as tabelas do Supabase.
 * Mantidos manualmente em sincronia com supabase/setup.sql.
 */

export type Papel = 'morador' | 'sindico' | 'admin' | 'porteiro';
export type MembershipStatus = 'ativo' | 'pendente' | 'inativo';

export type ChamadoStatus = 'aberto' | 'em_andamento' | 'resolvido' | 'cancelado';
export type Prioridade = 'baixa' | 'media' | 'alta';
export type ChamadoCategoria =
  | 'manutencao'
  | 'limpeza'
  | 'seguranca'
  | 'barulho'
  | 'reclamacao'
  | 'sugestao'
  | 'outros';

export type ReservaStatus = 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada';

export type SolicitacaoStatus = 'aberta' | 'em_analise' | 'concluida' | 'recusada';
export type SolicitacaoCategoria =
  | 'boleto'
  | 'documento'
  | 'autorizacao'
  | 'mudanca'
  | 'financeiro'
  | 'outros';

export type AchadoStatus = 'guardado' | 'devolvido';

export type Condominio = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  endereco: string | null;
  cnpj: string | null;
  codigo_convite: string;
  criado_por: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  nome_completo: string | null;
  telefone: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Unidade = {
  id: string;
  condominio_id: string;
  bloco: string | null;
  numero: string;
  created_at: string;
};

export type Membership = {
  id: string;
  condominio_id: string;
  user_id: string;
  unidade_id: string | null;
  papel: Papel;
  status: MembershipStatus;
  created_at: string;
  // joins opcionais
  profile?: Profile | null;
  unidade?: Unidade | null;
  condominio?: Condominio | null;
};

export type Comunicado = {
  id: string;
  condominio_id: string;
  autor_id: string | null;
  titulo: string;
  corpo: string;
  categoria: string | null;
  fixado: boolean;
  prioridade: Prioridade;
  created_at: string;
  autor?: Profile | null;
  lido?: boolean;
};

export type Chamado = {
  id: string;
  condominio_id: string;
  autor_id: string;
  unidade_id: string | null;
  categoria: ChamadoCategoria;
  titulo: string;
  descricao: string;
  status: ChamadoStatus;
  prioridade: Prioridade;
  responsavel_id: string | null;
  fotos: string[];
  created_at: string;
  updated_at: string;
  autor?: Profile | null;
  responsavel?: Profile | null;
  unidade?: Unidade | null;
};

export type ChamadoEventoTipo = 'criacao' | 'comentario' | 'status' | 'responsavel';

export type ChamadoEvento = {
  id: string;
  chamado_id: string;
  autor_id: string | null;
  tipo: ChamadoEventoTipo;
  texto: string | null;
  status_novo: ChamadoStatus | null;
  created_at: string;
  autor?: Profile | null;
};

export type AreaComum = {
  id: string;
  condominio_id: string;
  nome: string;
  descricao: string | null;
  capacidade: number | null;
  requer_aprovacao: boolean;
  hora_abertura: string | null;
  hora_fechamento: string | null;
  icone: string;
  ativo: boolean;
  created_at: string;
};

export type Reserva = {
  id: string;
  condominio_id: string;
  area_id: string;
  morador_id: string;
  unidade_id: string | null;
  inicio: string;
  fim: string;
  status: ReservaStatus;
  observacao: string | null;
  resposta_admin: string | null;
  created_at: string;
  area?: AreaComum | null;
  morador?: Profile | null;
  unidade?: Unidade | null;
};

export type AchadoPerdido = {
  id: string;
  condominio_id: string;
  registrado_por: string | null;
  titulo: string;
  descricao: string | null;
  local_encontrado: string | null;
  foto_url: string | null;
  data_encontrado: string | null;
  status: AchadoStatus;
  created_at: string;
};

export type Solicitacao = {
  id: string;
  condominio_id: string;
  morador_id: string;
  categoria: SolicitacaoCategoria;
  titulo: string;
  descricao: string;
  status: SolicitacaoStatus;
  resposta: string | null;
  created_at: string;
  updated_at: string;
  morador?: Profile | null;
};

export const isGestor = (papel?: Papel | null) =>
  papel === 'sindico' || papel === 'admin';
