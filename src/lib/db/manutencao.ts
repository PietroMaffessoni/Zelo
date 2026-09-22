/**
 * Equipamentos e manutenção preventiva.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';

import type {
  Equipamento,
  ItemVistoria,
  Manutencao,
} from '@/lib/types';

// ---------------------------------------------------------------- Manutenção preventiva
export async function listarEquipamentos(condominioId: string): Promise<Equipamento[]> {
  return unwrap(
    await supabase
      .from('equipamentos')
      .select('*')
      .eq('condominio_id', condominioId)
      .eq('ativo', true)
      .order('proxima_manutencao', { ascending: true, nullsFirst: false }),
  ) as Equipamento[];
}

export async function getEquipamento(id: string): Promise<Equipamento> {
  return unwrap(await supabase.from('equipamentos').select('*').eq('id', id).single());
}

export async function criarEquipamento(input: {
  condominio_id: string;
  nome: string;
  categoria: string;
  localizacao?: string | null;
  periodicidade_dias?: number | null;
  proxima_manutencao?: string | null;
  fornecedor?: string | null;
  observacoes?: string | null;
}): Promise<Equipamento> {
  return unwrap(await supabase.from('equipamentos').insert(input).select('*').single());
}

export async function removerEquipamento(id: string) {
  await supabase.from('equipamentos').update({ ativo: false }).eq('id', id);
}

export async function listarManutencoes(equipamentoId: string): Promise<Manutencao[]> {
  return unwrap(
    await supabase
      .from('manutencoes')
      .select('*')
      .eq('equipamento_id', equipamentoId)
      .order('realizada_em', { ascending: false }),
  ) as Manutencao[];
}

/**
 * Registra uma manutenção e atualiza o equipamento (última + próxima manutenção,
 * calculada a partir da periodicidade). Retorna a manutenção criada.
 */
export async function registrarManutencao(input: {
  condominio_id: string;
  equipamento_id: string;
  descricao: string;
  custo?: number | null;
  realizada_em: string;
  responsavel?: string | null;
  registrado_por: string;
  itens?: ItemVistoria[];
  periodicidade_dias?: number | null;
}): Promise<Manutencao> {
  const { periodicidade_dias, itens, ...resto } = input;
  const manutencao = unwrap(
    await supabase.from('manutencoes').insert({ ...resto, itens: itens ?? [] }).select('*').single(),
  ) as Manutencao;
  const patch: Partial<Equipamento> = { ultima_manutencao: input.realizada_em };
  if (periodicidade_dias && periodicidade_dias > 0) {
    const base = new Date(input.realizada_em + 'T00:00:00');
    base.setDate(base.getDate() + periodicidade_dias);
    patch.proxima_manutencao = base.toISOString().slice(0, 10);
  }
  await supabase.from('equipamentos').update(patch).eq('id', input.equipamento_id);
  return manutencao;
}
