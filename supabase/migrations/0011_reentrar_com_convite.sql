-- ==========================================================================
-- 0011 — REENTRAR COM CODIGO DE CONVITE DEPOIS DE REMOVIDO
-- ==========================================================================
--
-- Quem ja tinha sido removido de um condominio (vinculo 'inativo') e digitava o
-- codigo de convite de novo recebia o proprio registro inativo de volta: sem
-- erro, sem pedido ao sindico, e a tela de boas-vindas continuava igual. Agora
-- o registro vira um pedido 'pendente', como o de qualquer morador novo — o
-- sindico continua sendo quem aprova, entao nao ha atalho para quem foi
-- removido de proposito.
--
-- Depende da 0010 (`_pode_recuperar_condominio`).
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

create or replace function public.entrar_condominio(
  p_codigo text, p_bloco text default null, p_numero text default null, p_vinculo text default 'proprietario'
) returns public.memberships
language plpgsql security definer set search_path = public as $$
declare
  v_cond public.condominios;
  v_unidade_id uuid;
  v_membership public.memberships;
  v_vinculo text;
begin
  if (select auth.uid()) is null then raise exception 'Não autenticado'; end if;

  select * into v_cond from public.condominios where codigo_convite = upper(trim(p_codigo));
  if v_cond.id is null then raise exception 'Código de convite inválido'; end if;

  select * into v_membership from public.memberships
    where condominio_id = v_cond.id and user_id = (select auth.uid());
  -- Ativo ou pendente: nada a fazer. Inativo (removido) cai para baixo e vira um
  -- pedido novo — antes voltava o registro inativo e a tela não mudava nada.
  if v_membership.id is not null and v_membership.status <> 'inativo' then
    return v_membership;
  end if;

  -- Ex-síndico de um condomínio sem gestor tem o caminho próprio (0010). Virar
  -- 'pendente' aqui apagaria o papel e o deixaria esperando uma aprovação que
  -- ninguém pode dar.
  if v_membership.id is not null
     and public._pode_recuperar_condominio(v_cond.id, (select auth.uid())) then
    raise exception 'Você era síndico deste condomínio. Use o botão "Entrar em %" na tela inicial.', v_cond.nome
      using errcode = 'P0001';
  end if;

  v_vinculo := case when p_vinculo in ('proprietario','inquilino','dependente') then p_vinculo else 'proprietario' end;

  if coalesce(trim(p_numero), '') <> '' then
    -- Reaproveita a unidade se bloco/número já existirem (evita duplicidade).
    select id into v_unidade_id from public.unidades
      where condominio_id = v_cond.id
        and coalesce(bloco, '') = coalesce(nullif(trim(p_bloco), ''), '')
        and numero = trim(p_numero);
    if v_unidade_id is null then
      insert into public.unidades (condominio_id, bloco, numero)
      values (v_cond.id, nullif(trim(p_bloco), ''), trim(p_numero))
      returning id into v_unidade_id;
    end if;
  end if;

  -- Entra como 'pendente': o morador só reivindica a unidade/vínculo, quem confirma
  -- que ele de fato mora ali é o síndico (tela de Moradores e unidades aprova/recusa).
  insert into public.memberships (condominio_id, user_id, unidade_id, papel, status, vinculo)
  values (v_cond.id, (select auth.uid()), v_unidade_id, 'morador', 'pendente', v_vinculo)
  on conflict (condominio_id, user_id) do update
    set unidade_id = excluded.unidade_id, papel = 'morador', status = 'pendente', vinculo = excluded.vinculo
  returning * into v_membership;

  return v_membership;
end;
$$;

grant execute on function public.entrar_condominio(text, text, text, text) to authenticated;
