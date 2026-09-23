-- ==========================================================================
-- 0009 — PUSH DE VERDADE: FILA E GATILHOS
-- ==========================================================================
--
-- Notificação que chega com o app FECHADO. Até aqui o Zelo só tinha aviso
-- local: o celular só avisava se o app estivesse aberto na mão da pessoa.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 16. FILA DE PUSH
-- ============================================================================
--
-- Por que uma fila e não um disparo direto do gatilho:
--
-- Mandar a notificação de dentro do trigger significaria que uma falha do
-- serviço de push (fora do ar, timeout, token vencido) derrubaria o INSERT que
-- a originou — o síndico publicaria um comunicado e receberia um erro porque o
-- servidor da Expo estava lento. Coisas de importância muito diferente ficariam
-- amarradas na mesma transação.
--
-- Com a fila, o gatilho só escreve uma linha: o comunicado é salvo, sempre. O
-- envio acontece depois, por fora, e pode ser repetido sem duplicar nada. Se o
-- push falhar, perde-se um aviso; sem a fila, perder-se-ia o comunicado.
--
-- Quem drena a fila é a Edge Function `enviar-push`, chamada por dois caminhos
-- que terminam no mesmo lugar: um "toque" imediato do próprio gatilho (via
-- pg_net, assíncrono) e uma varredura de minuto em minuto pelo pg_cron. O
-- primeiro dá a latência de segundos que a pessoa espera; o segundo garante que
-- nada fique parado se o primeiro falhar.

create table if not exists public.push_fila (
  id bigserial primary key,
  condominio_id uuid references public.condominios(id) on delete cascade,
  destinatarios uuid[] not null,
  titulo text not null,
  corpo text not null,
  -- `dados` viaja junto com a notificação e diz ao app para onde navegar quando
  -- a pessoa toca nela. Sem isso o toque só abre o app na tela inicial, e o
  -- aviso vira um beco: "chegou uma encomenda" e agora procure você mesmo.
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  tentativas int not null default 0,
  erro text
);

-- Índice parcial: a consulta que importa é sempre "o que ainda não saiu", e ela
-- não pode ficar mais lenta conforme o histórico de enviados cresce.
create index if not exists idx_push_fila_pendente
  on public.push_fila (criado_em)
  where enviado_em is null;

-- A fila carrega quem recebe o quê. Ninguém lê isso pela API: sem policy
-- nenhuma, o RLS nega tudo, e só a `service_role` (que o ignora) enxerga.
alter table public.push_fila enable row level security;

comment on table public.push_fila is
  'Saída de notificações push. Escrita por gatilhos, drenada pela Edge Function enviar-push.';

-- ----------------------------------------------------------------------------
-- Quem recebe
-- ----------------------------------------------------------------------------
--
-- As três funções abaixo respeitam `preferencias_notificacao` do perfil: se a
-- pessoa desligou "encomendas" nas configurações, ela não entra na lista. O
-- `coalesce(..., true)` trata preferência ausente como ligada — quem nunca
-- mexeu nas opções espera ser avisado.

create or replace function public.destinatarios_condominio(
  p_cond uuid,
  p_excluir uuid,
  p_pref text
) returns uuid[]
language sql stable security definer set search_path = public as $fn$
  select coalesce(array_agg(m.user_id), '{}'::uuid[])
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.condominio_id = p_cond
    and m.status = 'ativo'
    and (p_excluir is null or m.user_id <> p_excluir)
    and coalesce((p.preferencias_notificacao ->> p_pref)::boolean, true);
$fn$;

create or replace function public.destinatarios_unidade(
  p_unidade uuid,
  p_pref text
) returns uuid[]
language sql stable security definer set search_path = public as $fn$
  select coalesce(array_agg(m.user_id), '{}'::uuid[])
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.unidade_id = p_unidade
    and m.status = 'ativo'
    and coalesce((p.preferencias_notificacao ->> p_pref)::boolean, true);
$fn$;

-- Uma pessoa só, se ela quiser esse tipo de aviso. Devolve array para os
-- gatilhos não precisarem tratar "um" diferente de "vários".
create or replace function public.destinatario_unico(
  p_user uuid,
  p_pref text
) returns uuid[]
language sql stable security definer set search_path = public as $fn$
  select coalesce(array_agg(p.id), '{}'::uuid[])
  from public.profiles p
  where p.id = p_user
    and coalesce((p.preferencias_notificacao ->> p_pref)::boolean, true);
$fn$;

-- ----------------------------------------------------------------------------
-- Enfileirar e cutucar
-- ----------------------------------------------------------------------------

/*
  Avisa a Edge Function que há trabalho. Não espera resposta: o `net.http_post`
  do pg_net é assíncrono por construção — ele enfileira a requisição e devolve
  na hora, então nada do que acontecer do outro lado atrasa o INSERT que chamou.

  Tudo aqui é dinâmico (`execute`) de propósito: sem a extensão pg_net o schema
  `net` não existe, e uma referência direta faria esta função falhar na primeira
  chamada. Assim ela só não cutuca — e o pg_cron continua varrendo a fila.
*/
create or replace function public.cutucar_push()
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_url text;
  v_key text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then return; end if;
  if to_regclass('vault.decrypted_secrets') is null then return; end if;

  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1'
    into v_url using 'zelo_functions_url';
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1'
    into v_key using 'zelo_service_role_key';
  if v_url is null or v_key is null then return; end if;

  execute 'select net.http_post(url := $1, headers := $2, body := $3)'
    using rtrim(v_url, '/') || '/enviar-push',
          jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
          '{}'::jsonb;
end;
$fn$;

create or replace function public.enfileirar_push(
  p_cond uuid,
  p_destinatarios uuid[],
  p_titulo text,
  p_corpo text,
  p_dados jsonb
) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  -- Ninguém para avisar não vira linha: fila vazia é fila que não precisa ser
  -- drenada, e é o caso comum (um morador só, preferência desligada).
  if p_destinatarios is null or array_length(p_destinatarios, 1) is null then return; end if;

  -- O corpo é cortado aqui, não na hora de enviar: iOS e Android truncam a
  -- notificação de qualquer jeito, e mandar 4 KB de comunicado no payload só
  -- gasta banda de quem vai ler três linhas.
  insert into public.push_fila (condominio_id, destinatarios, titulo, corpo, dados)
  values (p_cond, p_destinatarios, p_titulo, left(coalesce(p_corpo, ''), 240), coalesce(p_dados, '{}'::jsonb));

  perform public.cutucar_push();
end;
$fn$;

-- ----------------------------------------------------------------------------
-- Gatilhos: os mesmos quatro avisos que o app já dava com a tela aberta
-- ----------------------------------------------------------------------------
--
-- A lista veio do que o `useNotificacoesRealtime` já fazia no cliente. A
-- diferença é que agora funciona com o app fechado — e em todos os aparelhos da
-- pessoa, não só no que está na mão dela.

create or replace function public.push_comunicado()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  perform public.enfileirar_push(
    NEW.condominio_id,
    public.destinatarios_condominio(NEW.condominio_id, NEW.autor_id, 'comunicados'),
    case when NEW.prioridade = 'alta' then 'Comunicado urgente' else 'Novo comunicado' end,
    NEW.titulo,
    jsonb_build_object('rota', '/comunicados/' || NEW.id)
  );
  return NEW;
end;
$fn$;

create or replace function public.push_encomenda()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  perform public.enfileirar_push(
    NEW.condominio_id,
    public.destinatarios_unidade(NEW.unidade_id, 'encomendas'),
    'Chegou uma encomenda',
    coalesce(NEW.descricao, 'Retire na portaria'),
    jsonb_build_object('rota', '/portaria/encomendas')
  );
  return NEW;
end;
$fn$;

/*
  Chamado: avisa o autor quando o status muda, e só quando muda. Um UPDATE que
  corrige um acento no título não é notícia para ninguém.

  Quem mexeu não é avisado do próprio ato: se o autor reabre ou cancela o
  chamado dele, `auth.uid()` é ele mesmo e a notificação não sai.
*/
create or replace function public.push_chamado()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if NEW.status is not distinct from OLD.status then return NEW; end if;
  if NEW.autor_id = auth.uid() then return NEW; end if;

  perform public.enfileirar_push(
    NEW.condominio_id,
    public.destinatario_unico(NEW.autor_id, 'chamados'),
    'Seu chamado foi atualizado',
    NEW.titulo || ' · ' || replace(NEW.status, '_', ' '),
    jsonb_build_object('rota', '/chamados/' || NEW.id)
  );
  return NEW;
end;
$fn$;

create or replace function public.push_reserva()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if NEW.status is not distinct from OLD.status then return NEW; end if;
  if NEW.morador_id = auth.uid() then return NEW; end if;

  perform public.enfileirar_push(
    NEW.condominio_id,
    public.destinatario_unico(NEW.morador_id, 'reservas'),
    case NEW.status
      when 'aprovada' then 'Reserva aprovada'
      when 'rejeitada' then 'Reserva recusada'
      else 'Reserva atualizada'
    end,
    'Toque para ver os detalhes',
    jsonb_build_object('rota', '/reservas/' || NEW.id)
  );
  return NEW;
end;
$fn$;

drop trigger if exists trg_push_comunicado on public.comunicados;
create trigger trg_push_comunicado after insert on public.comunicados
  for each row execute function public.push_comunicado();

drop trigger if exists trg_push_encomenda on public.encomendas;
create trigger trg_push_encomenda after insert on public.encomendas
  for each row execute function public.push_encomenda();

drop trigger if exists trg_push_chamado on public.chamados;
create trigger trg_push_chamado after update on public.chamados
  for each row execute function public.push_chamado();

drop trigger if exists trg_push_reserva on public.reservas;
create trigger trg_push_reserva after update on public.reservas
  for each row execute function public.push_reserva();

-- ----------------------------------------------------------------------------
-- Drenagem
-- ----------------------------------------------------------------------------

/*
  Entrega um lote para a Edge Function e já marca a tentativa.

  `for update skip locked` é o que impede envio duplicado: se o toque do gatilho
  e a varredura do cron caírem ao mesmo tempo, cada um leva linhas diferentes em
  vez de os dois levarem as mesmas. Sem isso, um comunicado publicado no minuto
  cheio chegaria duas vezes no celular de todo mundo.

  `tentativas` sobe ANTES do envio, não depois. Se a função morrer no meio, a
  linha volta a ficar disponível com uma tentativa a mais — e para de ser
  tentada no quinto fracasso, em vez de virar laço infinito contra um serviço
  fora do ar.
*/
create or replace function public.reservar_push(p_limite int default 100)
returns setof public.push_fila
language sql security definer set search_path = public as $fn$
  update public.push_fila f
  set tentativas = f.tentativas + 1
  where f.id in (
    select id from public.push_fila
    where enviado_em is null and tentativas < 5
    order by criado_em
    limit p_limite
    for update skip locked
  )
  returning f.*;
$fn$;

/*
  Faxina da fila. Linha enviada não tem por que ficar: ela guarda quem recebeu o
  quê, ou seja, é dado pessoal sem finalidade depois de entregue — a mesma
  lógica da 0007. Sete dias dão margem para investigar "por que não chegou".
*/
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
  return v_removidos;
end;
$fn$;

-- Nada disso é chamado pelo app: quem drena a fila é a Edge Function, com a
-- chave de serviço. `authenticated` não precisa nem poder enumerar.
revoke all on function public.reservar_push(int) from public, anon, authenticated;
revoke all on function public.enfileirar_push(uuid, uuid[], text, text, jsonb) from public, anon, authenticated;
revoke all on function public.cutucar_push() from public, anon, authenticated;
revoke all on function public.limpar_push_antigo() from public, anon, authenticated;

-- E devolve o acesso a quem precisa dele. `revoke ... from public` tira a
-- permissao de TODOS os papeis, inclusive da `service_role`, que e justamente
-- quem a Edge Function usa: sem esta linha o revoke acima transformaria a fila
-- num deposito que ninguem esvazia.
grant execute on function public.reservar_push(int) to service_role;
grant select, update on public.push_fila to service_role;
grant select, update on public.push_tokens to service_role;

/*
  Varredura de segurança, de minuto em minuto.

  O caminho normal é o gatilho cutucar a função na hora. Este cron existe para o
  caminho anormal: pg_net fora do ar, Edge Function reiniciando, lote que morreu
  no meio. Sem ele, uma falha momentânea viraria notificação que nunca chega — e
  ninguém ficaria sabendo, porque a fila não reclama sozinha.
*/
do $bloco$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron inativo: a varredura da fila de push nao foi agendada.';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'zelo-push-varredura') then
    perform cron.unschedule('zelo-push-varredura');
  end if;

  perform cron.schedule('zelo-push-varredura', '* * * * *', 'select public.cutucar_push()');

  -- A faxina anda junto com o expurgo da 0007, dez minutos depois, pelo mesmo
  -- motivo: e dado pessoal cuja finalidade acabou. Separada do expurgo porque
  -- fracassar aqui nao pode impedir a retencao dos dados de portaria, que tem
  -- prazo legal.
  if exists (select 1 from cron.job where jobname = 'zelo-push-faxina') then
    perform cron.unschedule('zelo-push-faxina');
  end if;
  perform cron.schedule('zelo-push-faxina', '10 7 * * *', 'select public.limpar_push_antigo()');

  raise notice 'Fila de push: varredura a cada minuto e faxina diaria agendadas.';
end
$bloco$;
