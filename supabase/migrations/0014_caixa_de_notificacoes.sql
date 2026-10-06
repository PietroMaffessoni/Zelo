-- ==========================================================================
-- 0014 — CAIXA DE NOTIFICACOES
-- ==========================================================================
--
-- O app ganhou uma aba "Notificacoes". Ate aqui o aviso existia so no momento
-- em que chegava: a `push_fila` guarda quem recebeu o que, mas e lida apenas
-- pela Edge Function e e apagada depois de entregue. Quem dispensou o aviso da
-- tela, ou estava sem push (Expo Go, permissao negada), nao tinha como rever.
--
-- `notificacoes` e uma linha por pessoa por aviso, escrita no MESMO ponto em
-- que a fila e escrita (`enfileirar_push`). Assim a caixa e o push nunca
-- divergem: os mesmos gatilhos, os mesmos destinatarios, as mesmas
-- preferencias de quem desligou um tipo de aviso.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

create table if not exists public.notificacoes (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  condominio_id uuid references public.condominios(id) on delete cascade,
  titulo text not null,
  corpo text not null default '',
  -- Mesmo formato do `dados` do push: `{ "rota": "/chamados/<id>" }`. O toque na
  -- linha leva para o mesmo lugar que o toque na notificacao do sistema.
  dados jsonb not null default '{}'::jsonb,
  lida_em timestamptz,
  criado_em timestamptz not null default now()
);

-- A consulta da tela e sempre "as minhas, deste condominio, mais novas primeiro";
-- a do contador e "as minhas nao lidas". Um indice para cada.
create index if not exists idx_notificacoes_caixa
  on public.notificacoes (user_id, condominio_id, criado_em desc);
create index if not exists idx_notificacoes_nao_lidas
  on public.notificacoes (user_id, condominio_id)
  where lida_em is null;

alter table public.notificacoes enable row level security;

-- Cada um ve e marca so as proprias. Ninguem insere pela API: quem escreve e o
-- `enfileirar_push`, que roda como dono da funcao.
drop policy if exists notificacoes_select on public.notificacoes;
create policy notificacoes_select on public.notificacoes for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists notificacoes_update on public.notificacoes;
create policy notificacoes_update on public.notificacoes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists notificacoes_delete on public.notificacoes;
create policy notificacoes_delete on public.notificacoes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Atualizar, so a marca de leitura: sem isto a policy deixaria a pessoa
-- reescrever o titulo do proprio aviso, o que nao serve a nada.
revoke insert, update on public.notificacoes from authenticated;
grant select, delete on public.notificacoes to authenticated;
grant update (lida_em) on public.notificacoes to authenticated;

-- Tempo real: o contador da aba sobe no instante em que o aviso chega, sem
-- esperar a pessoa trocar de tela. A RLS vale tambem para o tempo real.
do $bloco$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificacoes'
     ) then
    alter publication supabase_realtime add table public.notificacoes;
  end if;
end
$bloco$;

-- ----------------------------------------------------------------------------
-- Escrita junto com a fila
-- ----------------------------------------------------------------------------

create or replace function public.enfileirar_push(
  p_cond uuid,
  p_destinatarios uuid[],
  p_titulo text,
  p_corpo text,
  p_dados jsonb
) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if p_destinatarios is null or array_length(p_destinatarios, 1) is null then return; end if;

  -- A caixa primeiro: ela e o registro que fica. O push e a entrega imediata,
  -- e pode falhar sem que a pessoa perca o aviso.
  insert into public.notificacoes (user_id, condominio_id, titulo, corpo, dados)
  select d, p_cond, p_titulo, left(coalesce(p_corpo, ''), 240), coalesce(p_dados, '{}'::jsonb)
  from unnest(p_destinatarios) as d;

  insert into public.push_fila (condominio_id, destinatarios, titulo, corpo, dados)
  values (p_cond, p_destinatarios, p_titulo, left(coalesce(p_corpo, ''), 240), coalesce(p_dados, '{}'::jsonb));

  perform public.cutucar_push();
end;
$fn$;

revoke all on function public.enfileirar_push(uuid, uuid[], text, text, jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Faxina
-- ----------------------------------------------------------------------------
--
-- Aviso velho e dado pessoal sem finalidade (mesma logica da 0007). Noventa
-- dias cobrem "o que chegou no mes passado" com folga. Entra na faxina diaria
-- que ja existe (`zelo-push-faxina`, 0009), entao nao precisa de agendamento
-- novo.

create or replace function public.limpar_push_antigo()
returns bigint language plpgsql security definer set search_path = public as $fn$
declare v_removidos bigint;
begin
  with apagados as (
    delete from public.push_fila
    where (enviado_em is not null and enviado_em < now() - interval '7 days')
       or (tentativas >= 5 and criado_em < now() - interval '7 days')
    returning 1
  ) select count(*) into v_removidos from apagados;

  delete from public.notificacoes where criado_em < now() - interval '90 days';

  return v_removidos;
end;
$fn$;

revoke all on function public.limpar_push_antigo() from public, anon, authenticated;
