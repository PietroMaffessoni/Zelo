-- ==========================================================================
-- 0007 — RETENCAO DE DADOS (LGPD)
-- ==========================================================================
--
-- Prazos de retencao dos dados de portaria e a rotina de expurgo.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 14. RETENÇÃO DE DADOS OPERACIONAIS (LGPD art. 15 e 16)
-- ============================================================================
--
-- Registro de visitante, foto de encomenda e foto de chamado ficavam para
-- sempre. A LGPD manda eliminar o dado pessoal quando acaba a finalidade que
-- justificou coletá-lo (art. 15, I) — e a finalidade de "quem entrou no prédio
-- na terça-feira" se esgota em semanas, não em anos. Guardar indefinidamente
-- não é só irregular: é acumular passivo, porque cada mês a mais é mais gente
-- exposta se a base vazar.
--
-- Os prazos abaixo seguem o que o mercado pratica em portaria (30 a 90 dias) e
-- ficam configuráveis por condomínio, porque a convenção de cada um pode exigir
-- diferente. Zero = não expurgar, para quem tiver obrigação de guardar mais.
--
-- O QUE NÃO EXPIRA: nada que seja ato de gestão ou prova de prestação de contas
-- — lançamento financeiro, assembleia, ata, infração, auditoria. Esses têm base
-- legal própria (art. 16, I) e apagá-los prejudicaria o condomínio inteiro.

alter table public.condominios
  add column if not exists retencao_visitantes_dias int not null default 90,
  add column if not exists retencao_encomendas_dias int not null default 180;

comment on column public.condominios.retencao_visitantes_dias is
  'Dias para manter registros de entrada de visitante. 0 = nunca expurgar.';
comment on column public.condominios.retencao_encomendas_dias is
  'Dias para manter encomendas já retiradas. 0 = nunca expurgar.';

/*
  Expurgo. Idempotente e seguro para rodar quantas vezes quiser.

  Só toca no que já cumpriu sua função: visita que já aconteceu e encomenda que
  já foi retirada. Encomenda aguardando retirada nunca é apagada, por mais
  antiga que seja — ela ainda está fisicamente na portaria.

  Agendamento: `select cron.schedule('zelo-expurgo', '0 4 * * *',
  $$select public.expurgar_dados_antigos()$$);` com a extensão pg_cron ativa, ou
  uma chamada diária por Edge Function. Sem agendador, a função existe e pode
  ser chamada à mão — o que já é melhor do que não haver política nenhuma.
*/
create or replace function public.expurgar_dados_antigos()
returns table (tabela text, removidos bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_visitantes bigint := 0;
  v_registros bigint := 0;
  v_encomendas bigint := 0;
begin
  with apagados as (
    delete from public.registros_visitantes r
    using public.condominios c
    where c.id = r.condominio_id
      and c.retencao_visitantes_dias > 0
      and r.entrada < now() - make_interval(days => c.retencao_visitantes_dias)
    returning 1
  ) select count(*) into v_registros from apagados;

  -- Autorização vencida há mais tempo que a retenção: o visitante nem chegou a
  -- entrar, e o nome dele não tem por que continuar ali.
  with apagados as (
    delete from public.visitantes_autorizados v
    using public.condominios c
    where c.id = v.condominio_id
      and c.retencao_visitantes_dias > 0
      and coalesce(v.data_fim, v.data_inicio) < now() - make_interval(days => c.retencao_visitantes_dias)
    returning 1
  ) select count(*) into v_visitantes from apagados;

  with apagados as (
    delete from public.encomendas e
    using public.condominios c
    where c.id = e.condominio_id
      and c.retencao_encomendas_dias > 0
      and e.status = 'retirada'
      and e.created_at < now() - make_interval(days => c.retencao_encomendas_dias)
    returning 1
  ) select count(*) into v_encomendas from apagados;

  return query
    select 'registros_visitantes'::text, v_registros
    union all select 'visitantes_autorizados'::text, v_visitantes
    union all select 'encomendas'::text, v_encomendas;
end;
$$;

-- Só o serviço agenda o expurgo; nenhum usuário apaga em massa pela API.
revoke all on function public.expurgar_dados_antigos() from public, anon, authenticated;
