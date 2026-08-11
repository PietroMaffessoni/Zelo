/**
 * Tipos de domínio do Zelo — espelham as tabelas do Supabase.
 * Mantidos manualmente em sincronia com supabase/setup.sql.
 */

export type Papel = 'morador' | 'sindico' | 'admin' | 'porteiro' | 'conselheiro' | 'zelador';
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

export type TipoLancamento = 'boleto' | 'despesa';
export type CategoriaFinanceira =
  | 'taxa_condominial'
  | 'fundo_reserva'
  | 'multa'
  | 'agua'
  | 'luz'
  | 'manutencao'
  | 'servicos'
  | 'outros';
export type StatusFinanceiro = 'pendente' | 'pago' | 'atrasado' | 'cancelado';

export type CategoriaDocumento = 'convencao' | 'regimento_interno' | 'ata' | 'edital' | 'financeiro' | 'outros';

export type TipoVistoria = 'entrada' | 'saida';
export type ItemVistoria = { item: string; ok: boolean; observacao?: string };

export type AssembleiaStatus = 'convocada' | 'em_andamento' | 'encerrada' | 'cancelada';

export type TipoEvento = 'evento' | 'assembleia' | 'manutencao' | 'obra' | 'reuniao' | 'lazer' | 'outro';

/** Categorias clássicas de equipamento — só para ícone/checklist sugerido, já
 *  que o campo `categoria` do equipamento é texto livre. */
export type CategoriaEquipamento =
  | 'elevador'
  | 'bomba'
  | 'gerador'
  | 'portao'
  | 'incendio'
  | 'piscina'
  | 'jardim'
  | 'eletrica'
  | 'hidraulica'
  | 'outros';

export type TipoInfracao = 'advertencia' | 'multa';
export type StatusInfracao = 'aplicada' | 'contestada' | 'anulada' | 'confirmada' | 'paga';

export type StatusProposta = 'sugerida' | 'aprovada' | 'recusada' | 'arquivada';

export type Condominio = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  endereco: string | null;
  cnpj: string | null;
  // Administradora que efetua os pagamentos (Caminho A: o Zelo substitui o
  // Imodolo e convive com a administradora). Colunas não sensíveis, legíveis por
  // membros (setup.sql seção 8.4).
  administradora?: string | null;
  administradora_contato?: string | null;
  // Só vêm preenchidos para quem é gestor daquele condomínio (buscados à parte
  // via RPC obter_codigos_condominio — o select geral de condominios não expõe
  // essas colunas de código, ver setup.sql seção 7.10 e 8.2).
  codigo_convite?: string;
  codigo_portaria?: string | null;
  codigo_zelador?: string | null;
  criado_por: string | null;
  created_at: string;
};

export type PreferenciasNotificacao = {
  comunicados: boolean;
  chamados: boolean;
  encomendas: boolean;
  reservas: boolean;
  assembleias: boolean;
};

export type Profile = {
  id: string;
  nome_completo: string | null;
  telefone: string | null;
  email: string | null;
  avatar_url: string | null;
  preferencias_notificacao: PreferenciasNotificacao;
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
  // Ficha cadastral (PII): só o próprio morador e o gestor leem — vivem na
  // membership justamente por isso (setup.sql seção 8.1).
  cpf: string | null;
  rg: string | null;
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
  taxa_uso: number;
  limite_mensal_por_unidade: number | null;
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
  taxa_cobrada: number | null;
  lancamento_id: string | null;
  comprovante_path: string | null;
  created_at: string;
  area?: AreaComum | null;
  morador?: Profile | null;
  unidade?: Unidade | null;
};

export type VistoriaReserva = {
  id: string;
  reserva_id: string;
  condominio_id: string;
  tipo: TipoVistoria;
  itens: ItemVistoria[];
  fotos: string[];
  respondida_por: string | null;
  created_at: string;
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
  retirado_por_id: string | null;
  assinatura_confirmada: boolean;
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

export type LancamentoFinanceiro = {
  id: string;
  condominio_id: string;
  unidade_id: string | null;
  tipo: TipoLancamento;
  categoria: CategoriaFinanceira;
  descricao: string;
  valor: number;
  vencimento: string;
  competencia: string | null;
  status: StatusFinanceiro;
  pago_em: string | null;
  anexo_path: string | null;
  observacao: string | null;
  // Caminho A: momento em que a despesa foi enviada à administradora para pagar
  // (null = ainda não enviada). Só faz sentido para tipo 'despesa'.
  enviado_administradora_em: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  unidade?: Unidade | null;
};

export type Documento = {
  id: string;
  condominio_id: string;
  categoria: CategoriaDocumento;
  titulo: string;
  descricao: string | null;
  arquivo_path: string;
  arquivo_nome: string | null;
  tamanho_bytes: number | null;
  publicado_por: string | null;
  created_at: string;
};

export type Assembleia = {
  id: string;
  condominio_id: string;
  titulo: string;
  descricao: string | null;
  data_hora: string;
  local: string | null;
  link_online: string | null;
  quorum_minimo_unidades: number | null;
  status: AssembleiaStatus;
  ata_documento_id: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type AssembleiaPauta = {
  id: string;
  assembleia_id: string;
  condominio_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  permite_votacao: boolean;
  encerrada: boolean;
  created_at: string;
  opcoes?: AssembleiaOpcao[];
};

export type AssembleiaOpcao = {
  id: string;
  pauta_id: string;
  texto: string;
  ordem: number;
  votos?: number;
};

export type AssembleiaVoto = {
  id: string;
  pauta_id: string;
  opcao_id: string;
  condominio_id: string;
  unidade_id: string;
  user_id: string;
  created_at: string;
};

export type Evento = {
  id: string;
  condominio_id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoEvento;
  inicio: string;
  fim: string | null;
  local: string | null;
  criado_por: string | null;
  created_at: string;
};

export type Equipamento = {
  id: string;
  condominio_id: string;
  nome: string;
  /** Escrita pelo síndico ao cadastrar (texto livre). Quando o termo bate com
   *  uma [CategoriaEquipamento] conhecida, ganha ícone e checklist próprios. */
  categoria: string;
  localizacao: string | null;
  periodicidade_dias: number | null;
  ultima_manutencao: string | null;
  proxima_manutencao: string | null;
  fornecedor: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

export type Manutencao = {
  id: string;
  condominio_id: string;
  equipamento_id: string;
  descricao: string;
  custo: number | null;
  realizada_em: string;
  responsavel: string | null;
  registrado_por: string | null;
  itens: ItemVistoria[];
  created_at: string;
};

export type Infracao = {
  id: string;
  condominio_id: string;
  unidade_id: string | null;
  tipo: TipoInfracao;
  /** Escrito pelo síndico ao aplicar (texto livre, não é mais uma lista fixa). */
  motivo: string;
  descricao: string;
  valor: number | null;
  status: StatusInfracao;
  contestacao: string | null;
  contestada_em: string | null;
  resposta_gestor: string | null;
  lancamento_id: string | null;
  aplicada_por: string | null;
  created_at: string;
  updated_at: string;
  unidade?: Unidade | null;
};

export type PropostaPauta = {
  id: string;
  condominio_id: string;
  autor_id: string;
  unidade_id: string | null;
  titulo: string;
  descricao: string;
  status: StatusProposta;
  assembleia_id: string | null;
  resposta_gestor: string | null;
  created_at: string;
  updated_at: string;
  autor?: Profile | null;
  apoios?: number;
  apoiada?: boolean;
};

export type UnidadeDetalhe = Unidade & {
  moradores: Membership[];
  dependentes: Dependente[];
  pets: Pet[];
};

export const isGestor = (papel?: Papel | null) =>
  papel === 'sindico' || papel === 'admin';

/** Conselho fiscal: enxerga a gestão (financeiro, infrações, manutenção) sem poder alterar. */
export const isConselho = (papel?: Papel | null) =>
  papel === 'sindico' || papel === 'admin' || papel === 'conselheiro';

/** Zelador: equipe operacional de manutenção e chamados (não é gestão). */
export const isZelador = (papel?: Papel | null) => papel === 'zelador';

/** Quem pode registrar manutenção e operar a agenda de manutenção: gestor ou zelador. */
export const podeManutencao = (papel?: Papel | null) => isGestor(papel) || isZelador(papel);

/** Enxerga a agenda de manutenção (leitura): conselho ou zelador. */
export const veManutencao = (papel?: Papel | null) => isConselho(papel) || isZelador(papel);

/** "atrasado" efetivo de uma infração/valor não se aplica; helper de rótulo de próxima manutenção. */
export function manutencaoVencida(proxima?: string | null): boolean {
  if (!proxima) return false;
  return proxima < new Date().toISOString().slice(0, 10);
}

/** Status "atrasado" é calculado na hora de exibir, não confiado ao valor gravado (que só o gestor força manualmente). */
export function statusFinanceiroEfetivo(l: Pick<LancamentoFinanceiro, 'status' | 'vencimento'>): StatusFinanceiro {
  if (l.status === 'pendente' && l.vencimento < new Date().toISOString().slice(0, 10)) return 'atrasado';
  return l.status;
}
