-- ==========================================================================
-- 0005 — PAGINACAO
-- ==========================================================================
--
-- Coluna gerada de destaque dos comunicados e indices das listas paginadas.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 12. PAGINAÇÃO
-- ============================================================================
--
-- As listas passaram a vir em páginas (`range`). Isso quebra qualquer ordenação
-- feita no cliente: ordenar depois de receber só ordena DENTRO da página, e um
-- comunicado fixado que caísse na página 3 apareceria abaixo de um aviso comum
-- da página 1.
--
-- O destaque dos comunicados era calculado em JS (`grupoComunicado`: fixado +
-- urgente > fixado > urgente > demais). Vira coluna gerada, para o mesmo
-- critério poder ir no ORDER BY do servidor. Coluna gerada e não trigger porque
-- é função pura das outras duas colunas — não há como ficar dessincronizada.
alter table public.comunicados
  add column if not exists ordem_destaque int
  generated always as (
    case
      when fixado and prioridade = 'alta' then 0
      when fixado then 1
      when prioridade = 'alta' then 2
      else 3
    end
  ) stored;

create index if not exists idx_comunicados_destaque
  on public.comunicados(condominio_id, ordem_destaque, created_at desc);

-- Índices para as demais listas paginadas: sem eles, um `range` no fim de uma
-- tabela grande ainda varre tudo o que vem antes.
create index if not exists idx_infracoes_cond on public.infracoes(condominio_id, created_at desc);
create index if not exists idx_propostas_cond on public.propostas_pauta(condominio_id, created_at desc);
create index if not exists idx_eventos_cond on public.eventos(condominio_id, inicio);
