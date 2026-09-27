-- ==========================================================================
-- 0010 — RECUPERAR ACESSO DE SINDICO
-- ==========================================================================
--
-- Ate a correcao no app, o sindico via um "remover" na propria linha da tela
-- da unidade. Um toque inativava o vinculo dele com o condominio — o mesmo
-- registro que guarda o papel — e o predio sumia da conta. Pelo app nao havia
-- volta: reativar um vinculo exige ser gestor, que era justamente o que ele
-- tinha perdido.
--
-- Reativar o proprio vinculo NAO pode ser livre: um morador removido pelo
-- sindico entraria de novo sozinho. A regra e a mais estreita que resolve o
-- caso: so recupera quem ja foi sindico/admin ali (ou quem criou o condominio),
-- e so quando o condominio esta SEM nenhum gestor ativo. Havendo um sindico
-- ativo, e ele quem decide — e ele consegue fazer isso pelo app.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

create or replace function public._pode_recuperar_condominio(p_cond uuid, p_uid uuid)
returns boolean
language sql stable set search_path = public as $$
  select p_uid is not null
    -- ja esta ativo ali: nao ha o que recuperar
    and not exists (
      select 1 from public.memberships m
      where m.condominio_id = p_cond and m.user_id = p_uid and m.status = 'ativo'
    )
    -- foi gestor ali, ou criou o condominio
    and (
      exists (
        select 1 from public.memberships m
        where m.condominio_id = p_cond and m.user_id = p_uid
          and m.status = 'inativo' and m.papel in ('sindico', 'admin')
      )
      or exists (
        select 1 from public.condominios c
        where c.id = p_cond and c.criado_por = p_uid
      )
    )
    -- e ninguem administra o condominio hoje
    and not exists (
      select 1 from public.memberships m
      where m.condominio_id = p_cond and m.status = 'ativo' and m.papel in ('sindico', 'admin')
    );
$$;

-- Auxiliar interna: so as duas funcoes abaixo (security definer) a chamam.
revoke all on function public._pode_recuperar_condominio(uuid, uuid) from public, anon, authenticated;

create or replace function public.condominios_recuperaveis()
returns table (id uuid, nome text, cidade text, uf text)
language sql stable security definer set search_path = public as $$
  select c.id, c.nome, c.cidade, c.uf
  from public.condominios c
  where public._pode_recuperar_condominio(c.id, (select auth.uid()))
  order by c.nome;
$$;

revoke all on function public.condominios_recuperaveis() from public, anon;
grant execute on function public.condominios_recuperaveis() to authenticated;

create or replace function public.recuperar_condominio(p_cond uuid)
returns public.memberships
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_membership public.memberships;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;

  -- Serializa por condominio: dois ex-sindicos recuperando ao mesmo tempo, o
  -- segundo ja encontra o primeiro ativo e e recusado pela regra acima.
  perform 1 from public.condominios where id = p_cond for update;

  if not public._pode_recuperar_condominio(p_cond, v_uid) then
    raise exception 'Não é possível recuperar este condomínio. Peça a um síndico ativo que adicione você novamente.'
      using errcode = 'P0001';
  end if;

  insert into public.memberships (condominio_id, user_id, papel, status)
  values (p_cond, v_uid, 'sindico', 'ativo')
  on conflict (condominio_id, user_id)
    do update set papel = 'sindico', status = 'ativo'
  returning * into v_membership;

  return v_membership;
end;
$$;

revoke all on function public.recuperar_condominio(uuid) from public, anon;
grant execute on function public.recuperar_condominio(uuid) to authenticated;
