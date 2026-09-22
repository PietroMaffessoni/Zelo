/**
 * Áreas comuns, reservas e as vistorias de entrada e saída.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';

// Área com taxa de uso gera a cobrança na reserva — o único cruzamento
// entre reservas e financeiro.
import { criarLancamento } from '@/lib/db/financeiro';
import type {
  AreaComum,
  ItemVistoria,
  Reserva,
  ReservaStatus,
  TipoVistoria,
  VistoriaReserva,
} from '@/lib/types';

// -------------------------------------------------------- Áreas comuns / Reservas
export async function listarAreas(condominioId: string): Promise<AreaComum[]> {
  return unwrap(
    await supabase
      .from('areas_comuns')
      .select('*')
      .eq('condominio_id', condominioId)
      .eq('ativo', true)
      .order('nome'),
  ) as AreaComum[];
}

/** Inclui áreas inativas — uso exclusivo das telas de administração. */
export async function listarAreasAdmin(condominioId: string): Promise<AreaComum[]> {
  return unwrap(
    await supabase.from('areas_comuns').select('*').eq('condominio_id', condominioId).order('nome'),
  ) as AreaComum[];
}

export async function getArea(id: string): Promise<AreaComum> {
  return unwrap(await supabase.from('areas_comuns').select('*').eq('id', id).single());
}

export async function criarArea(input: {
  condominio_id: string;
  nome: string;
  descricao?: string | null;
  capacidade?: number | null;
  requer_aprovacao: boolean;
  icone?: string;
  taxa_uso?: number;
  limite_mensal_por_unidade?: number | null;
}): Promise<AreaComum> {
  return unwrap(await supabase.from('areas_comuns').insert(input).select('*').single());
}

export async function atualizarArea(id: string, patch: Partial<AreaComum>) {
  await supabase.from('areas_comuns').update(patch).eq('id', id);
}

export async function listarReservas(condominioId: string): Promise<Reserva[]> {
  // Sem paginação de propósito: a tela só mostra reserva futura ou pendente de
  // aprovação, e paginar em ordem crescente entregaria primeiro as mais antigas
  // — exatamente as que seriam descartadas. O recorte desce para o servidor, o
  // que já limita a consulta pela natureza do dado em vez de por um `range`.
  const agora = new Date().toISOString();
  return unwrap(
    await supabase
      .from('reservas')
      .select('*, area:areas_comuns(*), morador:profiles(*), unidade:unidades(*)')
      .eq('condominio_id', condominioId)
      .or(`fim.gte.${agora},status.eq.pendente`)
      .order('inicio', { ascending: true }),
  ) as Reserva[];
}

export async function getReserva(id: string): Promise<Reserva> {
  return unwrap(
    await supabase
      .from('reservas')
      .select('*, area:areas_comuns(*), morador:profiles(*), unidade:unidades(*)')
      .eq('id', id)
      .single(),
  );
}

/**
 * Reservas ativas (pendente/aprovada) de uma área que cruzam um intervalo — usada
 * pela tela de nova reserva para mostrar os horários já ocupados (disponibilidade).
 */
export async function reservasDaArea(areaId: string, deISO: string, ateISO: string): Promise<Reserva[]> {
  return unwrap(
    await supabase
      .from('reservas')
      .select('id, inicio, fim, status')
      .eq('area_id', areaId)
      .in('status', ['pendente', 'aprovada'])
      .lt('inicio', ateISO)
      .gt('fim', deISO)
      .order('inicio', { ascending: true }),
  ) as Reserva[];
}

export async function criarReserva(input: {
  condominio_id: string;
  area_id: string;
  morador_id: string;
  unidade_id?: string | null;
  inicio: string;
  fim: string;
  observacao?: string | null;
  requer_aprovacao: boolean;
  taxa_cobrada?: number | null;
}): Promise<Reserva> {
  const { requer_aprovacao, ...resto } = input;
  const { data, error } = await supabase
    .from('reservas')
    .insert({ ...resto, status: requer_aprovacao ? 'pendente' : 'aprovada' })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23P01') throw new Error('Este horário já está reservado para esta área. Escolha outro horário.');
    throw new Error(error.message);
  }
  return data as Reserva;
}

export async function alterarStatusReserva(id: string, status: ReservaStatus, resposta?: string) {
  await supabase.from('reservas').update({ status, resposta_admin: resposta ?? null }).eq('id', id);

  // Ao aprovar uma reserva com taxa de uso, gera automaticamente o boleto correspondente.
  if (status === 'aprovada') {
    const reserva = await getReserva(id);
    if (reserva.taxa_cobrada && reserva.taxa_cobrada > 0 && !reserva.lancamento_id && reserva.unidade_id) {
      const lancamento = await criarLancamento({
        condominio_id: reserva.condominio_id,
        unidade_id: reserva.unidade_id,
        tipo: 'boleto',
        categoria: 'outros',
        descricao: `Taxa de uso — ${reserva.area?.nome ?? 'área comum'}`,
        valor: reserva.taxa_cobrada,
        vencimento: reserva.inicio.slice(0, 10),
        criado_por: reserva.morador_id,
      });
      await supabase.from('reservas').update({ lancamento_id: lancamento.id }).eq('id', id);
    }
  }
}

/** Anexa (ou substitui) o comprovante de pagamento de uma reserva. Path do bucket privado 'financeiro'. */
export async function anexarComprovanteReserva(id: string, comprovantePath: string) {
  await supabase.from('reservas').update({ comprovante_path: comprovantePath }).eq('id', id);
}

// ------------------------------------------------------------------ Vistorias
export async function listarVistorias(reservaId: string): Promise<VistoriaReserva[]> {
  return unwrap(
    await supabase.from('vistorias_reserva').select('*').eq('reserva_id', reservaId),
  ) as VistoriaReserva[];
}

export async function salvarVistoria(input: {
  reserva_id: string;
  condominio_id: string;
  tipo: TipoVistoria;
  itens: ItemVistoria[];
  fotos?: string[];
  respondida_por: string;
}): Promise<VistoriaReserva> {
  return unwrap(
    await supabase
      .from('vistorias_reserva')
      .upsert(input, { onConflict: 'reserva_id,tipo' })
      .select('*')
      .single(),
  );
}
