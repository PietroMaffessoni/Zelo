-- ==========================================================================
-- 0002 — CONTA: EXCLUSAO E SENHA
-- ==========================================================================
--
-- Exclusao de conta (App Store 5.1.1(v) e LGPD art. 18, VI) com a regra de
-- nao deixar condominio sem sindico.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 9. CONTA DO USUÁRIO (exclusão e senha)
-- ============================================================================

-- 9.1 Exclusão de conta -------------------------------------------------------
--
-- Obrigatória pela App Store (guideline 5.1.1(v)) e pela LGPD (art. 18, VI —
-- direito à eliminação). Não basta desativar: os dados pessoais saem.
--
-- O apagamento em si é o cascade que já existe no schema: profiles.id referencia
-- auth.users(id) on delete cascade, e 12 tabelas referenciam profiles em cascade.
-- O que esta função acrescenta é a REGRA DE NEGÓCIO que o cascade não sabe: um
-- condomínio não pode ficar sem síndico. Se o usuário for o único gestor ativo de
-- algum condomínio, a exclusão é recusada com a lista dos condomínios pendentes,
-- e ele precisa promover outro síndico antes — do contrário o condomínio inteiro
-- (moradores, financeiro, documentos) ficaria sem ninguém que pudesse administrá-lo.
--
-- O que NÃO é apagado, de propósito: registros em que a autoria vira `null`
-- (on delete set null) — comunicados publicados, lançamentos financeiros, atas.
-- São atos da administração do condomínio, não dados pessoais do indivíduo, e
-- apagá-los destruiria a prestação de contas de terceiros. É a base legal de
-- "cumprimento de obrigação legal/regulatória" da LGPD (art. 16, I).
create or replace function public.excluir_minha_conta()
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := (select auth.uid());
  v_orfaos text;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;

  select string_agg(c.nome, ', ' order by c.nome) into v_orfaos
  from public.memberships m
  join public.condominios c on c.id = m.condominio_id
  where m.user_id = v_uid
    and m.status = 'ativo'
    and m.papel in ('sindico', 'admin')
    and not exists (
      select 1 from public.memberships outro
      where outro.condominio_id = m.condominio_id
        and outro.user_id <> v_uid
        and outro.status = 'ativo'
        and outro.papel in ('sindico', 'admin')
    );

  if v_orfaos is not null then
    raise exception 'Você é o único síndico de: %. Promova outro síndico antes de excluir a conta.', v_orfaos
      using errcode = 'P0001';
  end if;

  -- Cascade faz o resto (profiles e tudo que referencia profiles em cascade).
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;

-- 9.2 Retenção de dados operacionais (LGPD art. 15/16) ------------------------
-- Ver seção 10 para a rotina de expurgo.
