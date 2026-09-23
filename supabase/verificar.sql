-- ============================================================================
-- CONFERÊNCIA DO ESQUEMA
-- ============================================================================
--
-- Rode no SQL Editor depois de aplicar o setup.sql. Uma linha por objeto que
-- as migrations 0002–0008 deveriam ter criado, com o que falta no topo.
--
-- Não altera nada: é só leitura de catálogo. Pode rodar quantas vezes quiser.
--
-- Se aparecer algum "FALTA", reaplique o setup.sql — as migrations são
-- idempotentes, rodar de novo não duplica nada.

with checagem(migration, objeto, ok) as (
  values
    ('0002', 'função excluir_minha_conta',
      (select count(*) > 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'excluir_minha_conta')),

    ('0003', 'tabela perfis_contato',
      to_regclass('public.perfis_contato') is not null),
    ('0003', 'função apurar_assembleia (voto secreto)',
      (select count(*) > 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'apurar_assembleia')),
    ('0003', 'política votos_select',
      (select count(*) > 0 from pg_policies
        where schemaname = 'public' and policyname = 'votos_select')),
    ('0003', 'política dependentes_select',
      (select count(*) > 0 from pg_policies
        where schemaname = 'public' and policyname = 'dependentes_select')),
    ('0003', 'política pets_select',
      (select count(*) > 0 from pg_policies
        where schemaname = 'public' and policyname = 'pets_select')),

    ('0004', 'coluna condominios.codigo_portaria_expira_em',
      (select count(*) > 0 from information_schema.columns
        where table_schema = 'public' and table_name = 'condominios'
          and column_name = 'codigo_portaria_expira_em')),
    ('0004', 'função entrar_como_equipe',
      (select count(*) > 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'entrar_como_equipe')),
    ('0004', 'função obter_codigos_condominio',
      (select count(*) > 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'obter_codigos_condominio')),

    ('0005', 'coluna gerada comunicados.ordem_destaque',
      (select count(*) > 0 from information_schema.columns
        where table_schema = 'public' and table_name = 'comunicados'
          and column_name = 'ordem_destaque')),
    ('0005', 'índice idx_comunicados_destaque',
      to_regclass('public.idx_comunicados_destaque') is not null),
    ('0005', 'índice idx_infracoes_cond',
      to_regclass('public.idx_infracoes_cond') is not null),
    ('0005', 'índice idx_propostas_cond',
      to_regclass('public.idx_propostas_cond') is not null),
    ('0005', 'índice idx_eventos_cond',
      to_regclass('public.idx_eventos_cond') is not null),

    ('0006', 'tabela auditoria',
      to_regclass('public.auditoria') is not null),
    ('0006', 'função registrar_auditoria',
      (select count(*) > 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'registrar_auditoria')),
    ('0006', 'gatilhos trg_auditoria nas 7 tabelas',
      (select count(*) = 7 from pg_trigger
        where tgname = 'trg_auditoria' and not tgisinternal)),

    ('0007', 'coluna condominios.retencao_visitantes_dias',
      (select count(*) > 0 from information_schema.columns
        where table_schema = 'public' and table_name = 'condominios'
          and column_name = 'retencao_visitantes_dias')),
    ('0007', 'coluna condominios.retencao_encomendas_dias',
      (select count(*) > 0 from information_schema.columns
        where table_schema = 'public' and table_name = 'condominios'
          and column_name = 'retencao_encomendas_dias')),
    ('0007', 'função expurgar_dados_antigos',
      (select count(*) > 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'expurgar_dados_antigos')),

    ('0008', 'extensão pg_cron ativa',
      (select count(*) > 0 from pg_extension where extname = 'pg_cron'))
)
select
  case when ok then 'ok' else 'FALTA' end as status,
  migration,
  objeto
from checagem
order by ok, migration, objeto;

-- ----------------------------------------------------------------------------
-- O agendamento em si só dá para consultar com pg_cron ativo — a query abaixo
-- não compila sem o schema `cron`, por isso fica separada. Rode sozinha:
--
--   select jobname, schedule, active from cron.job where jobname = 'zelo-expurgo-diario';
