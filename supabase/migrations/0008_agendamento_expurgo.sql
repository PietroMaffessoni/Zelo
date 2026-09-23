-- ==========================================================================
-- 0008 — AGENDAMENTO DO EXPURGO
-- ==========================================================================
--
-- Poe a rotina de retencao da 0007 para rodar sozinha, todo dia, via pg_cron.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 15. AGENDAMENTO DO EXPURGO (pg_cron)
-- ============================================================================
--
-- A 0007 criou `expurgar_dados_antigos()`, mas função que ninguém chama é
-- política de retenção no papel: o dado continua lá. O que transforma a regra
-- em fato é o agendador.
--
-- Por que um bloco guardado e não `create extension` direto: ativar extensão
-- exige privilégio de superusuário, que o SQL Editor tem mas uma migration
-- rodada pela CLI nem sempre tem. Ativar a extensão fica sendo um passo humano
-- de uma vez só (Dashboard → Database → Extensions → pg_cron); esta migration
-- apenas agenda, e se a extensão não estiver lá ela não quebra o resto do
-- setup — avisa e segue. Sem a guarda, reaplicar o setup.sql num projeto sem
-- pg_cron abortaria tudo que viesse depois.
--
-- Horário: 07:00 UTC = 04:00 em Brasília. De madrugada porque um DELETE em
-- massa pega lock nas linhas que remove, e às 4h não há portaria registrando
-- entrada nem morador consultando encomenda.

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice
      'pg_cron nao esta ativo: o expurgo LGPD NAO foi agendado. Ative em '
      'Database > Extensions e rode esta migration de novo.';
    return;
  end if;

  -- Desagenda antes de agendar para o horário poder mudar numa reaplicação.
  -- `cron.unschedule` estoura se o job não existe, daí o `if exists`.
  if exists (select 1 from cron.job where jobname = 'zelo-expurgo-diario') then
    perform cron.unschedule('zelo-expurgo-diario');
  end if;

  perform cron.schedule(
    'zelo-expurgo-diario',
    '0 7 * * *',
    $cron$select public.expurgar_dados_antigos()$cron$
  );

  raise notice 'Expurgo LGPD agendado para 07:00 UTC (04:00 Brasilia).';
end $$;
