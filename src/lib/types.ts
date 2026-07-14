/**
 * Tipos de domínio do CondoOS — espelham as tabelas do Supabase.
 * Mantidos manualmente em sincronia com supabase/setup.sql.
 */

export type Papel = 'morador' | 'sindico' | 'admin' | 'porteiro';
export type MembershipStatus = 'ativo' | 'pendente' | 'inativo';
export type Vinculo = 'proprietario' | 'inquilino' | 'dependente';
export type EspeciePet = 'cachorro' | 'gato' | 'outro';

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

export type VisitanteStatus = 'ativa' | 'utilizada' | 'expirada' | 'cancelada';
export type EncomendaStatus = 'aguardando_retirada' | 'retirada';
export type TipoVeiculo = 'carro' | 'moto' | 'outro';

export type Condominio = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  endereco: string | null;
  cnpj: string | null;
  codigo_convite: string;
  codigo_portaria: string | null;
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
  fracao_ideal: number | null;
  observacoes: string | null;
  created_at: string;
};

export type Membership = {
  id: string;
  condominio_id: string;
  user_id: string;
  unidade_id: string | null;
  papel: Papel;
  status: MembershipStatus;
  vinculo: Vinculo;
  created_at: string;
  // joins opcionais
  profile?: Profile | null;
  unidade?: Unidade | null;
  condominio?: Condominio | null;
};

export type Dependente = {
  id: string;
  condominio_id: string;
  unidade_id: string;
  nome: string;
  parentesco: string | null;
  data_nascimento: string | null;
  created_at: string;
};

export type Pet = {
  id: string;
  condominio_id: string;
  unidade_id: string;
  nome: string;
  especie: EspeciePet;
  raca: string | null;
  foto_url: string | null;
  observacoes: string | null;
  created_at: string;
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

export type VisitanteAutorizado = {
  id: string;
  condominio_id: string;
  unidade_id: string;
  autorizado_por: string;
  nome_visitante: string;
  documento: string | null;
  observacao: string | null;
  data_inicio: string;
  data_fim: string | null;
  status: VisitanteStatus;
  created_at: string;
  unidade?: Unidade | null;
};

export type RegistroVisitante = {
  id: string;
  condominio_id: string;
  unidade_id: string;
  autorizacao_id: string | null;
  nome_visitante: string;
  documento: string | null;
  registrado_por: string;
  entrada: string;
  saida: string | null;
  observacao: string | null;
  created_at: string;
};

export type Encomenda = {
  id: string;
  condominio_id: string;
  unidade_id: string;
  descricao: string;
  remetente: string | null;
  foto_url: string | null;
  registrado_por: string;
  status: EncomendaStatus;
  retirado_por_nome: string | null;
  retirado_em: string | null;
  created_at: string;
  unidade?: Unidade | null;
};

export type Veiculo = {
  id: string;
  condominio_id: string;
  unidade_id: string;
  proprietario_id: string | null;
  placa: string;
  modelo: string | null;
  cor: string | null;
  tipo: TipoVeiculo;
  vaga: string | null;
  created_at: string;
  unidade?: Unidade | null;
};

export type UnidadeDetalhe = Unidade & {
  moradores: Membership[];
  dependentes: Dependente[];
  pets: Pet[];
};

export const isGestor = (papel?: Papel | null) =>
  papel === 'sindico' || papel === 'admin';
