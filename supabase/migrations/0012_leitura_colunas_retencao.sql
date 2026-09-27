-- ==========================================================================
-- 0012 — LEITURA DAS COLUNAS DE RETENCAO
-- ==========================================================================
--
-- `condominios` tem permissao de leitura COLUNA A COLUNA (a 7.10 revogou o
-- select da tabela para esconder os codigos de acesso). A 0007 criou
-- `retencao_visitantes_dias` e `retencao_encomendas_dias` sem conceder a
-- leitura delas — e o app pede as duas ao carregar os condominios da conta.
--
-- Uma coluna sem permissao faz o PostgREST recusar a consulta INTEIRA, nao so
-- a coluna. O app recebia erro, tratava como "nenhum condominio" e mandava
-- todo mundo para a tela de criar/entrar, com os vinculos intactos no banco.
--
-- Regra para o futuro: coluna nova em `condominios` que o app le precisa de
-- `grant select (coluna)` na mesma migration.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

grant select (retencao_visitantes_dias, retencao_encomendas_dias) on public.condominios to authenticated;
