-- ==========================================================================
-- 0003 — PRIVACIDADE DOS DADOS PESSOAIS
-- ==========================================================================
--
-- Fecha o voto nominal aos vizinhos, restringe dependentes e pets a unidade
-- e tira telefone e e-mail do perfil publico.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 10. PRIVACIDADE DOS DADOS PESSOAIS
--     Ajustes de RLS em tabelas cujo escopo de leitura era "qualquer membro do
--     condomínio" — amplo demais para o dado que elas guardam.
-- ============================================================================

-- 10.1 Sigilo do voto --------------------------------------------------------
--
-- `votos_select` liberava a tabela inteira para qualquer membro: o agregado que a
-- tela mostra era calculado no cliente, lendo TODAS as linhas — e cada linha traz
-- `user_id` e `unidade_id`. Na prática, qualquer morador conseguia listar em quem
-- cada unidade votou, mesmo a interface mostrando só o total.
--
-- A correção separa as duas necessidades que estavam sendo atendidas pela mesma
-- permissão:
--   - APURAÇÃO (todo mundo precisa): vira a RPC `apurar_assembleia`, que devolve
--     só a contagem por opção — nunca quem votou.
--   - VOTO NOMINAL (só quem tem razão para ver): o próprio eleitor, para o app
--     saber que a unidade dele já votou, e o gestor, que precisa dos nomes para
--     lavrar a ata. Vizinho não entra nessa lista.
drop policy if exists votos_select on public.assembleia_votos;
create policy votos_select on public.assembleia_votos for select to authenticated
  using (
    public.is_gestor(condominio_id)
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.memberships m
      where m.unidade_id = assembleia_votos.unidade_id
        and m.user_id = (select auth.uid())
        and m.status = 'ativo'
    )
  );

-- Apuração agregada. `security definer` porque precisa contar linhas que o
-- chamador não pode ler — é exatamente esse o ponto: devolve o placar sem
-- devolver os votos.
create or replace function public.apurar_assembleia(p_assembleia uuid)
returns table (pauta_id uuid, opcao_id uuid, votos bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_cond uuid;
begin
  select a.condominio_id into v_cond from public.assembleias a where a.id = p_assembleia;
  if v_cond is null then raise exception 'Assembleia não encontrada'; end if;
  if not public.is_member(v_cond) then raise exception 'Sem permissão'; end if;

  return query
    select o.pauta_id, o.id as opcao_id, count(v.id) as votos
    from public.assembleia_pautas p
    join public.assembleia_opcoes o on o.pauta_id = p.id
    left join public.assembleia_votos v on v.opcao_id = o.id
    where p.assembleia_id = p_assembleia
    group by o.pauta_id, o.id;
end;
$$;

revoke all on function public.apurar_assembleia(uuid) from public, anon;
grant execute on function public.apurar_assembleia(uuid) to authenticated;

-- 10.2 Telefone e e-mail saem do perfil público -------------------------------
--
-- `profiles_select` libera a linha inteira para quem compartilha condomínio — e
-- precisa liberar: o nome e o avatar do autor aparecem em comunicado, chamado,
-- proposta e reserva, em catorze consultas diferentes. O problema não era a
-- linha, eram DUAS COLUNAS dentro dela: com `telefone` e `email` ali, um
-- `GET /rest/v1/profiles?select=*` devolvia a agenda telefônica do prédio
-- inteiro para qualquer morador, independentemente do que a interface mostra.
--
-- Por isso o contato sai da tabela em vez de a tabela ser fechada: `profiles`
-- fica sendo o cartão público (nome + avatar) e o contato vai para uma tabela
-- própria, com RLS estreita. As consultas de nome seguem intactas; só quem
-- precisa de telefone/e-mail passa a ler `perfis_contato` — e só consegue se for
-- o dono, o síndico ou alguém da mesma unidade (cônjuge, filho, colega de
-- apartamento: quem já convive com o dado no dia a dia).
create table if not exists public.perfis_contato (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  telefone text,
  email text,
  updated_at timestamptz not null default now()
);

-- Migra o que já existe antes de derrubar as colunas. Idempotente e tolerante:
-- cada coluna é tratada por si, porque `telefone` nasce na definição da tabela
-- (seção 1) e `email` só existia se a base já tivesse rodado a 8.1 antiga —
-- então numa base nova uma existe e a outra não, e um insert que citasse as duas
-- de uma vez quebraria.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'telefone'
  ) then
    execute $mig$
      insert into public.perfis_contato (user_id, telefone)
      select p.id, p.telefone from public.profiles p where p.telefone is not null
      on conflict (user_id) do update
        set telefone = coalesce(excluded.telefone, public.perfis_contato.telefone)
    $mig$;
    alter table public.profiles drop column telefone;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) then
    execute $mig$
      insert into public.perfis_contato (user_id, email)
      select p.id, p.email from public.profiles p where p.email is not null
      on conflict (user_id) do update
        set email = coalesce(excluded.email, public.perfis_contato.email)
    $mig$;
    alter table public.profiles drop column email;
  end if;
end $$;

-- Backfill do e-mail a partir da fonte da verdade (auth.users), para os perfis
-- que já existiam antes desta seção.
insert into public.perfis_contato (user_id, email)
select u.id, u.email from auth.users u
on conflict (user_id) do update set email = excluded.email
where public.perfis_contato.email is distinct from excluded.email;

alter table public.perfis_contato enable row level security;

drop policy if exists contato_select on public.perfis_contato;
create policy contato_select on public.perfis_contato for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.memberships eu
      join public.memberships dele on dele.condominio_id = eu.condominio_id
      where eu.user_id = (select auth.uid())
        and eu.status = 'ativo'
        and dele.user_id = perfis_contato.user_id
        and dele.status = 'ativo'
        and (
          eu.papel in ('sindico', 'admin')
          or (eu.unidade_id is not null and eu.unidade_id = dele.unidade_id)
        )
    )
  );

drop policy if exists contato_write on public.perfis_contato;
create policy contato_write on public.perfis_contato for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- O cadastro passa a alimentar as duas tabelas. `security definer` já roda como
-- dono, então a RLS de perfis_contato não atrapalha o gatilho.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome_completo)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome_completo', ''))
  on conflict (id) do update set nome_completo = coalesce(excluded.nome_completo, public.profiles.nome_completo);

  insert into public.perfis_contato (user_id, telefone, email)
  values (new.id, nullif(new.raw_user_meta_data->>'telefone', ''), new.email)
  on conflict (user_id) do update
    set email = excluded.email,
        telefone = coalesce(excluded.telefone, public.perfis_contato.telefone);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém o e-mail espelhado quando o usuário o troca no Auth.
create or replace function public.sincronizar_email_contato()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.perfis_contato set email = new.email, updated_at = now() where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email on auth.users;
create trigger on_auth_user_email
  after update of email on auth.users
  for each row execute function public.sincronizar_email_contato();

-- 10.3 Dependentes e pets deixam de ser públicos no condomínio ----------------
--
-- `dependentes_select` e `pets_select` usavam só `is_member(condominio_id)`:
-- qualquer morador listava os dependentes de TODAS as unidades — e dependente,
-- na prática, é quase sempre criança. Nome de menor à disposição de duzentos
-- vizinhos não passa pelos princípios de finalidade e necessidade da LGPD, e
-- nenhuma tela do app precisava disso: quem abre a ficha de uma unidade é o
-- síndico ou alguém que mora nela.
--
-- O escopo certo já existia no próprio arquivo, em `visitantes` e `encomendas`:
-- gestor, portaria (que confere quem entra) e os moradores daquela unidade.
drop policy if exists dependentes_select on public.dependentes;
create policy dependentes_select on public.dependentes for select to authenticated
  using (
    public.is_gestor(condominio_id)
    or public.is_porteiro(condominio_id)
    or exists (
      select 1 from public.memberships m
      where m.unidade_id = dependentes.unidade_id
        and m.user_id = (select auth.uid())
        and m.status = 'ativo'
    )
  );

drop policy if exists pets_select on public.pets;
create policy pets_select on public.pets for select to authenticated
  using (
    public.is_gestor(condominio_id)
    or public.is_porteiro(condominio_id)
    or exists (
      select 1 from public.memberships m
      where m.unidade_id = pets.unidade_id
        and m.user_id = (select auth.uid())
        and m.status = 'ativo'
    )
  );
