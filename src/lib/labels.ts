import type { Tone } from '@/constants/theme';
import type {
  AchadoStatus,
  AssembleiaStatus,
  CategoriaDocumento,
  CategoriaEquipamento,
  CategoriaFinanceira,
  ChamadoCategoria,
  ChamadoStatus,
  EncomendaStatus,
  EspeciePet,
  Papel,
  Prioridade,
  ReservaStatus,
  SolicitacaoCategoria,
  SolicitacaoStatus,
  StatusFinanceiro,
  StatusInfracao,
  StatusProposta,
  TipoEvento,
  TipoInfracao,
  TipoVeiculo,
  TipoVistoria,
  Vinculo,
  VisitanteStatus,
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
  conselheiro: 'Conselheiro',
  zelador: 'Zelador',
};

export const vinculoLabel: Meta<Vinculo> = {
  proprietario: { label: 'Proprietário', tone: 'primary' },
  inquilino: { label: 'Inquilino', tone: 'info' },
  dependente: { label: 'Dependente', tone: 'neutral' },
};

export const especiePetLabel: Meta<EspeciePet> = {
  cachorro: { label: 'Cachorro', tone: 'primary', icon: 'paw-outline' },
  gato: { label: 'Gato', tone: 'warning', icon: 'paw-outline' },
  outro: { label: 'Outro', tone: 'neutral', icon: 'paw-outline' },
};

export const visitanteStatus: Meta<VisitanteStatus> = {
  ativa: { label: 'Ativa', tone: 'info' },
  utilizada: { label: 'Utilizada', tone: 'success' },
  expirada: { label: 'Expirada', tone: 'neutral' },
  cancelada: { label: 'Cancelada', tone: 'danger' },
};

export const encomendaStatus: Meta<EncomendaStatus> = {
  aguardando_retirada: { label: 'Aguardando retirada', tone: 'warning' },
  retirada: { label: 'Retirada', tone: 'success' },
};

export const tipoVeiculoLabel: Meta<TipoVeiculo> = {
  carro: { label: 'Carro', tone: 'primary', icon: 'car-outline' },
  moto: { label: 'Moto', tone: 'info', icon: 'bicycle-outline' },
  outro: { label: 'Outro', tone: 'neutral', icon: 'ellipsis-horizontal-outline' },
};

export const statusFinanceiro: Meta<StatusFinanceiro> = {
  pendente: { label: 'Pendente', tone: 'warning' },
  pago: { label: 'Pago', tone: 'success' },
  atrasado: { label: 'Atrasado', tone: 'danger' },
  cancelado: { label: 'Cancelado', tone: 'neutral' },
};

export const categoriaFinanceira: Meta<CategoriaFinanceira> = {
  taxa_condominial: { label: 'Taxa condominial', tone: 'primary', icon: 'home-outline' },
  fundo_reserva: { label: 'Fundo de reserva', tone: 'info', icon: 'shield-outline' },
  multa: { label: 'Multa', tone: 'danger', icon: 'alert-circle-outline' },
  agua: { label: 'Água', tone: 'info', icon: 'water-outline' },
  luz: { label: 'Luz', tone: 'warning', icon: 'flash-outline' },
  manutencao: { label: 'Manutenção', tone: 'primary', icon: 'construct-outline' },
  servicos: { label: 'Serviços', tone: 'success', icon: 'briefcase-outline' },
  outros: { label: 'Outros', tone: 'neutral', icon: 'ellipsis-horizontal-outline' },
};

export const categoriaDocumento: Meta<CategoriaDocumento> = {
  convencao: { label: 'Convenção', tone: 'primary', icon: 'document-text-outline' },
  regimento_interno: { label: 'Regimento interno', tone: 'info', icon: 'book-outline' },
  ata: { label: 'Ata', tone: 'success', icon: 'clipboard-outline' },
  edital: { label: 'Edital', tone: 'warning', icon: 'megaphone-outline' },
  financeiro: { label: 'Financeiro', tone: 'primary', icon: 'cash-outline' },
  outros: { label: 'Outros', tone: 'neutral', icon: 'ellipsis-horizontal-outline' },
};

export const tipoVistoriaLabel: Meta<TipoVistoria> = {
  entrada: { label: 'Vistoria de entrada', tone: 'info', icon: 'log-in-outline' },
  saida: { label: 'Vistoria de saída', tone: 'primary', icon: 'log-out-outline' },
};

export const assembleiaStatus: Meta<AssembleiaStatus> = {
  convocada: { label: 'Convocada', tone: 'info' },
  em_andamento: { label: 'Em andamento', tone: 'warning' },
  encerrada: { label: 'Encerrada', tone: 'success' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
};

export const tipoEventoLabel: Meta<TipoEvento> = {
  evento: { label: 'Evento', tone: 'primary', icon: 'sparkles-outline' },
  assembleia: { label: 'Assembleia', tone: 'info', icon: 'podium-outline' },
  manutencao: { label: 'Manutenção', tone: 'warning', icon: 'construct-outline' },
  obra: { label: 'Obra', tone: 'danger', icon: 'hammer-outline' },
  reuniao: { label: 'Reunião', tone: 'info', icon: 'people-outline' },
  lazer: { label: 'Lazer', tone: 'success', icon: 'balloon-outline' },
  outro: { label: 'Outro', tone: 'neutral', icon: 'ellipse-outline' },
};

/**
 * Categorias conhecidas de equipamento. A categoria em si virou texto livre (o
 * síndico escreve o que quiser ao cadastrar) — este mapa só existe para dar
 * ícone/cor e checklist às categorias clássicas quando o texto bate com uma
 * delas. Use [metaEquipamento] e [checklistDaCategoria], nunca o mapa direto.
 */
export const categoriaEquipamento: Meta<CategoriaEquipamento> = {
  elevador: { label: 'Elevador', tone: 'primary', icon: 'swap-vertical-outline' },
  bomba: { label: 'Bomba d’água', tone: 'info', icon: 'water-outline' },
  gerador: { label: 'Gerador', tone: 'warning', icon: 'flash-outline' },
  portao: { label: 'Portão', tone: 'primary', icon: 'enter-outline' },
  incendio: { label: 'Combate a incêndio', tone: 'danger', icon: 'flame-outline' },
  piscina: { label: 'Piscina', tone: 'info', icon: 'water-outline' },
  jardim: { label: 'Jardim', tone: 'success', icon: 'leaf-outline' },
  eletrica: { label: 'Elétrica', tone: 'warning', icon: 'bulb-outline' },
  hidraulica: { label: 'Hidráulica', tone: 'info', icon: 'water-outline' },
  outros: { label: 'Outros', tone: 'neutral', icon: 'construct-outline' },
};

export const tipoInfracaoLabel: Meta<TipoInfracao> = {
  advertencia: { label: 'Advertência', tone: 'warning', icon: 'alert-circle-outline' },
  multa: { label: 'Multa', tone: 'danger', icon: 'cash-outline' },
};

export const statusInfracao: Meta<StatusInfracao> = {
  aplicada: { label: 'Aplicada', tone: 'warning' },
  contestada: { label: 'Contestada', tone: 'info' },
  anulada: { label: 'Anulada', tone: 'neutral' },
  confirmada: { label: 'Confirmada', tone: 'danger' },
  paga: { label: 'Paga', tone: 'success' },
};

export const statusProposta: Meta<StatusProposta> = {
  sugerida: { label: 'Sugerida', tone: 'info' },
  aprovada: { label: 'Aprovada', tone: 'success' },
  recusada: { label: 'Recusada', tone: 'danger' },
  arquivada: { label: 'Arquivada', tone: 'neutral' },
};

/**
 * Roteiro de verificação sugerido por tipo de equipamento — vira o checklist
 * exibido ao registrar uma manutenção (o zelador/síndico marca cada item como ok).
 * Categorias sem template caem no registro livre (só descrição).
 */
export const checklistManutencao: Partial<Record<CategoriaEquipamento, string[]>> = {
  incendio: [
    'Extintores no prazo de validade',
    'Manômetros na faixa verde',
    'Sinalização e acesso desobstruídos',
    'Mangueiras e hidrantes íntegros',
    'Luzes de emergência funcionando',
  ],
  hidraulica: [
    'Caixa d’água limpa e tampada',
    'Sem vazamentos aparentes',
    'Nível e boia funcionando',
    'Registros e válvulas operando',
  ],
  bomba: [
    'Bomba liga e desliga corretamente',
    'Sem ruído ou vibração anormal',
    'Sem vazamentos',
    'Painel elétrico sem alarmes',
  ],
  piscina: [
    'pH e cloro dentro do padrão',
    'Água limpa e transparente',
    'Bomba e filtro operando',
    'Bordas e ralos íntegros',
  ],
  elevador: [
    'Nivelamento nos andares',
    'Portas abrindo/fechando bem',
    'Botoeiras e iluminação ok',
    'Interfone/alarme funcionando',
  ],
  gerador: [
    'Nível de combustível ok',
    'Partida automática testada',
    'Bateria carregada',
    'Sem vazamentos',
  ],
};

/** Minúsculas, sem acento e sem pontuação — só para comparar termos. */
function normalizar(txt: string): string {
  return txt.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

/** Casa a categoria escrita à mão com uma das conhecidas: "Incêndio", "incendio"
 *  e "INCENDIO" caem todas em `incendio`. Devolve null quando é termo próprio. */
function chaveEquipamento(categoria: string): CategoriaEquipamento | null {
  const alvo = normalizar(categoria);
  if (!alvo) return null;
  const chaves = Object.keys(categoriaEquipamento) as CategoriaEquipamento[];
  return chaves.find((k) => k === alvo || normalizar(categoriaEquipamento[k].label) === alvo) ?? null;
}

/** Rótulo/ícone/cor da categoria de um equipamento. Categoria escrita à mão
 *  aparece como o síndico digitou, com ícone genérico de manutenção. */
export function metaEquipamento(categoria: string): { label: string; tone: Tone; icon: string } {
  const chave = chaveEquipamento(categoria);
  const meta = chave ? categoriaEquipamento[chave] : null;
  return {
    label: meta ? meta.label : categoria.trim() || 'Equipamento',
    tone: meta ? meta.tone : 'neutral',
    icon: meta?.icon ?? 'construct-outline',
  };
}

/** Checklist sugerido para a categoria escrita — vazio quando não reconhece. */
export function checklistDaCategoria(categoria: string): string[] {
  const chave = chaveEquipamento(categoria);
  return (chave && checklistManutencao[chave]) || [];
}

/** Utilitário para transformar um mapa de metadados em opções de seleção. */
export function opcoes<T extends string>(meta: Record<T, { label: string }>) {
  return (Object.keys(meta) as T[]).map((value) => ({ value, label: meta[value].label }));
}
