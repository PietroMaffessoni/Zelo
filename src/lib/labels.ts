import type { Tone } from '@/constants/theme';
import type {
  AchadoStatus,
  ChamadoCategoria,
  ChamadoStatus,
  Papel,
  Prioridade,
  ReservaStatus,
  SolicitacaoCategoria,
  SolicitacaoStatus,
} from '@/lib/types';

type Meta<T extends string> = Record<T, { label: string; tone: Tone; icon?: string }>;

export const chamadoStatus: Meta<ChamadoStatus> = {
  aberto: { label: 'Aberto', tone: 'info' },
  em_andamento: { label: 'Em andamento', tone: 'warning' },
  resolvido: { label: 'Resolvido', tone: 'success' },
  cancelado: { label: 'Cancelado', tone: 'neutral' },
};

export const prioridade: Meta<Prioridade> = {
  baixa: { label: 'Baixa', tone: 'neutral' },
  media: { label: 'Média', tone: 'warning' },
  alta: { label: 'Alta', tone: 'danger' },
};

export const chamadoCategoria: Meta<ChamadoCategoria> = {
  manutencao: { label: 'Manutenção', tone: 'primary', icon: 'construct-outline' },
  limpeza: { label: 'Limpeza', tone: 'info', icon: 'sparkles-outline' },
  seguranca: { label: 'Segurança', tone: 'danger', icon: 'shield-checkmark-outline' },
  barulho: { label: 'Barulho', tone: 'warning', icon: 'volume-high-outline' },
  reclamacao: { label: 'Reclamação', tone: 'danger', icon: 'alert-circle-outline' },
  sugestao: { label: 'Sugestão', tone: 'success', icon: 'bulb-outline' },
  outros: { label: 'Outros', tone: 'neutral', icon: 'ellipsis-horizontal-outline' },
};

export const reservaStatus: Meta<ReservaStatus> = {
  pendente: { label: 'Pendente', tone: 'warning' },
  aprovada: { label: 'Aprovada', tone: 'success' },
  rejeitada: { label: 'Rejeitada', tone: 'danger' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
};

export const solicitacaoStatus: Meta<SolicitacaoStatus> = {
  aberta: { label: 'Aberta', tone: 'info' },
  em_analise: { label: 'Em análise', tone: 'warning' },
  concluida: { label: 'Concluída', tone: 'success' },
  recusada: { label: 'Recusada', tone: 'danger' },
};

export const solicitacaoCategoria: Meta<SolicitacaoCategoria> = {
  boleto: { label: '2ª via de boleto', tone: 'primary', icon: 'barcode-outline' },
  documento: { label: 'Documentos', tone: 'info', icon: 'document-text-outline' },
  autorizacao: { label: 'Autorização', tone: 'success', icon: 'checkmark-circle-outline' },
  mudanca: { label: 'Mudança', tone: 'warning', icon: 'cube-outline' },
  financeiro: { label: 'Financeiro', tone: 'primary', icon: 'card-outline' },
  outros: { label: 'Outros', tone: 'neutral', icon: 'ellipsis-horizontal-outline' },
};

export const achadoStatus: Meta<AchadoStatus> = {
  guardado: { label: 'Guardado', tone: 'warning' },
  devolvido: { label: 'Devolvido', tone: 'success' },
};

export const papelLabel: Record<Papel, string> = {
  morador: 'Morador',
  sindico: 'Síndico',
  admin: 'Administrador',
  porteiro: 'Portaria',
};

/** Utilitário para transformar um mapa de metadados em opções de seleção. */
export function opcoes<T extends string>(meta: Record<T, { label: string }>) {
  return (Object.keys(meta) as T[]).map((value) => ({ value, label: meta[value].label }));
}
