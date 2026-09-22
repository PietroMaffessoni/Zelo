/**
 * Unidades, moradores, dependentes e pets.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';

import type {
  Dependente,
  EspeciePet,
  Membership,
  Pet,
  Unidade,
  UnidadeDetalhe,
  Vinculo,
} from '@/lib/types';

// --------------------------------------------------------- Moradores e unidades

/** Pedidos de acesso ainda não aprovados pelo síndico (entrar_condominio cria como 'pendente'). */
export async function listarMembershipsPendentes(condominioId: string): Promise<Membership[]> {
  return unwrap(
    await supabase
      .from('memberships')
      .select('*, profile:profiles(*), unidade:unidades(*)')
      .eq('condominio_id', condominioId)
      .eq('status', 'pendente')
      .order('created_at', { ascending: true }),
  ) as Membership[];
}

export async function aprovarMembership(membershipId: string) {
  await supabase.from('memberships').update({ status: 'ativo' }).eq('id', membershipId);
}

export async function recusarMembership(membershipId: string) {
  await supabase.from('memberships').delete().eq('id', membershipId);
}

export async function listarUnidades(condominioId: string): Promise<Unidade[]> {
  return unwrap(
    await supabase
      .from('unidades')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('bloco', { ascending: true })
      .order('numero', { ascending: true }),
  ) as Unidade[];
}

export async function getUnidade(id: string): Promise<UnidadeDetalhe> {
  const [unidadeRes, moradoresRes, dependentesRes, petsRes] = await Promise.all([
    supabase.from('unidades').select('*').eq('id', id).single(),
    supabase
      .from('memberships')
      // O contato vem aninhado dentro do perfil: mora em `perfis_contato`, com RLS
      // própria — se o leitor não for o síndico nem da mesma unidade, volta nulo.
      .select('*, profile:profiles(*, contato:perfis_contato(*))')
      .eq('unidade_id', id)
      .eq('status', 'ativo')
      .order('created_at', { ascending: true }),
    supabase.from('dependentes').select('*').eq('unidade_id', id).order('nome'),
    supabase.from('pets').select('*').eq('unidade_id', id).order('nome'),
  ]);
  const unidade = unwrap(unidadeRes) as Unidade;
  return {
    ...unidade,
    moradores: unwrap(moradoresRes) as Membership[],
    dependentes: unwrap(dependentesRes) as Dependente[],
    pets: unwrap(petsRes) as Pet[],
  };
}

export async function criarUnidade(input: {
  condominio_id: string;
  bloco?: string | null;
  numero: string;
  fracao_ideal?: number | null;
  observacoes?: string | null;
}): Promise<Unidade> {
  return unwrap(await supabase.from('unidades').insert(input).select('*').single());
}

export async function atualizarVinculoMorador(membershipId: string, vinculo: Vinculo) {
  await supabase.from('memberships').update({ vinculo }).eq('id', membershipId);
}

/** Promove/rebaixa um morador entre 'morador' e 'conselheiro' (só o gestor, via RLS). */
export async function atualizarPapelMorador(membershipId: string, papel: 'morador' | 'conselheiro') {
  await supabase.from('memberships').update({ papel }).eq('id', membershipId);
}

/** Atualiza a ficha cadastral (CPF/RG) de um morador — só o gestor, via RLS de memberships. */
export async function atualizarDadosCadastrais(
  membershipId: string,
  dados: { cpf?: string | null; rg?: string | null },
) {
  await supabase.from('memberships').update(dados).eq('id', membershipId);
}

/** Todos os moradores ativos do condomínio (para a busca rápida do síndico). */
export async function listarMoradores(condominioId: string): Promise<Membership[]> {
  return unwrap(
    await supabase
      .from('memberships')
      // O síndico busca morador por e-mail — o dado mora em `perfis_contato`.
      .select('*, profile:profiles(*, contato:perfis_contato(*)), unidade:unidades(*)')
      .eq('condominio_id', condominioId)
      .eq('status', 'ativo')
      .order('created_at', { ascending: true }),
  ) as Membership[];
}

export async function removerMoradorDaUnidade(membershipId: string) {
  await supabase.from('memberships').update({ status: 'inativo' }).eq('id', membershipId);
}

export async function criarDependente(input: {
  condominio_id: string;
  unidade_id: string;
  nome: string;
  parentesco?: string | null;
  data_nascimento?: string | null;
}): Promise<Dependente> {
  return unwrap(await supabase.from('dependentes').insert(input).select('*').single());
}

export async function removerDependente(id: string) {
  await supabase.from('dependentes').delete().eq('id', id);
}

export async function criarPet(input: {
  condominio_id: string;
  unidade_id: string;
  nome: string;
  especie?: EspeciePet;
  raca?: string | null;
  foto_url?: string | null;
  observacoes?: string | null;
}): Promise<Pet> {
  return unwrap(await supabase.from('pets').insert(input).select('*').single());
}

export async function removerPet(id: string) {
  await supabase.from('pets').delete().eq('id', id);
}
