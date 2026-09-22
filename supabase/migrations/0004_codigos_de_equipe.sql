-- ==========================================================================
-- 0004 — CODIGOS DE EQUIPE
-- ==========================================================================
--
-- Da validade aos codigos de portaria e zeladoria e impede que eles
-- rebaixem quem administra o condominio.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 11. CÓDIGOS DE EQUIPE (portaria e zeladoria)
-- ============================================================================
--
-- Três problemas nos RPCs de entrada por código:
--
-- 1. REBAIXAMENTO DO SÍNDICO. `entrar_como_porteiro` fazia um UPDATE cego do
--    papel: se quem digitasse o código já fosse síndico daquele condomínio —
--    testando o código que ele mesmo acabou de gerar, por exemplo — virava
--    porteiro e perdia o acesso administrativo. Pior caso: era o único síndico,
--    e o condomínio ficava sem ninguém que pudesse promover outro.
-- 2. CÓDIGO ETERNO. Não expirava. Um código combinado por WhatsApp com um
--    porteiro que saiu há dois anos continuava valendo.
-- 3. SEM RASTRO. Ninguém registrava quem entrou com ele.
--
-- O código continua sendo acesso imediato (o porteiro precisa operar no primeiro
-- dia, não esperar aprovação), mas com prazo e com registro.

alter table public.condominios add column if not exists codigo_portaria_expira_em timestamptz;
alter table public.condominios add column if not exists codigo_zelador_expira_em timestamptz;

-- Validade de um código recém-gerado. Sete dias cobre a contratação de um
-- funcionário sem deixar o código vivo indefinidamente.
create or replace function public.validade_codigo_equipe()
returns interval language sql immutable as $$ select interval '7 days' $$;

create or replace function public.gerar_codigo_portaria(p_cond uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_codigo text;
begin
  if not public.is_gestor(p_cond) then raise exception 'Sem permissão'; end if;
  loop
    v_codigo := 'P' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.condominios where codigo_portaria = v_codigo);
  end loop;
  update public.condominios
    set codigo_portaria = v_codigo,
        codigo_portaria_expira_em = now() + public.validade_codigo_equipe()
    where id = p_cond;
  return v_codigo;
end;
$$;

create or replace function public.gerar_codigo_zelador(p_cond uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_codigo text;
begin
  if not public.is_gestor(p_cond) then raise exception 'Sem permissão'; end if;
  loop
    v_codigo := 'Z' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.condominios where codigo_zelador = v_codigo);
  end loop;
  update public.condominios
    set codigo_zelador = v_codigo,
        codigo_zelador_expira_em = now() + public.validade_codigo_equipe()
    where id = p_cond;
  return v_codigo;
end;
$$;

/*
  Entrada por código de equipe, comum a portaria e zeladoria.

  `p_papel` decide qual código é conferido. A troca de papel só acontece para
  quem hoje é 'morador' — gestor e conselheiro são recusados explicitamente,
  para que o código nunca funcione como rebaixamento.
*/
create or replace function public.entrar_como_equipe(p_codigo text, p_papel text)
returns public.memberships
language plpgsql security definer set search_path = public as $$
declare
  v_cond public.condominios;
  v_membership public.memberships;
  v_expira timestamptz;
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  if p_papel not in ('porteiro', 'zelador') then raise exception 'Papel inválido'; end if;

  if p_papel = 'porteiro' then
    select * into v_cond from public.condominios where codigo_portaria = upper(trim(p_codigo));
    v_expira := v_cond.codigo_portaria_expira_em;
  else
    select * into v_cond from public.condominios where codigo_zelador = upper(trim(p_codigo));
    v_expira := v_cond.codigo_zelador_expira_em;
  end if;

  if v_cond.id is null then
    raise exception 'Código inválido.' using errcode = 'P0001';
  end if;

  -- Códigos gerados antes desta seção não têm data: seguem válidos para não
  -- derrubar quem já está em operação. Os novos sempre nascem com prazo.
  if v_expira is not null and v_expira < now() then
    raise exception 'Este código expirou. Peça um novo ao síndico.' using errcode = 'P0001';
  end if;

  select * into v_membership from public.memberships
    where condominio_id = v_cond.id and user_id = v_uid;

  if v_membership.id is not null then
    if v_membership.papel in ('sindico', 'admin', 'conselheiro') then
      raise exception 'Você administra este condomínio — usar um código de equipe removeria seu acesso. Peça a outra pessoa que entre com ele.'
        using errcode = 'P0001';
    end if;
    if v_membership.papel = p_papel and v_membership.status = 'ativo' then
      return v_membership; -- já está nesse papel
    end if;
    update public.memberships set papel = p_papel, status = 'ativo'
      where id = v_membership.id returning * into v_membership;
  else
    insert into public.memberships (condominio_id, user_id, papel, status)
    values (v_cond.id, v_uid, p_papel, 'ativo')
    returning * into v_membership;
  end if;

  return v_membership;
end;
$$;

grant execute on function public.entrar_como_equipe(text, text) to authenticated;

-- As RPCs antigas viram fachadas da nova, para não quebrar clientes em versões
-- anteriores do app que ainda as chamem.
create or replace function public.entrar_como_porteiro(p_codigo text)
returns public.memberships language sql security definer set search_path = public as $$
  select public.entrar_como_equipe(p_codigo, 'porteiro');
$$;

create or replace function public.entrar_como_zelador(p_codigo text)
returns public.memberships language sql security definer set search_path = public as $$
  select public.entrar_como_equipe(p_codigo, 'zelador');
$$;

grant execute on function public.entrar_como_porteiro(text) to authenticated;
grant execute on function public.entrar_como_zelador(text) to authenticated;

-- O gestor precisa ver até quando cada código vale, senão não sabe que expirou.
drop function if exists public.obter_codigos_condominio(uuid);
create or replace function public.obter_codigos_condominio(p_cond uuid)
returns table (
  codigo_convite text,
  codigo_portaria text,
  codigo_zelador text,
  codigo_portaria_expira_em timestamptz,
  codigo_zelador_expira_em timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_gestor(p_cond) then raise exception 'Sem permissão'; end if;
  return query select c.codigo_convite, c.codigo_portaria, c.codigo_zelador,
                      c.codigo_portaria_expira_em, c.codigo_zelador_expira_em
    from public.condominios c where c.id = p_cond;
end;
$$;
grant execute on function public.obter_codigos_condominio(uuid) to authenticated;
