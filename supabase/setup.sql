-- ============================================================================
--  CondoOS — Setup completo do banco de dados (Supabase / PostgreSQL)
--  Cole este arquivo inteiro no SQL Editor do seu projeto Supabase e execute.
--  É seguro rodar mais de uma vez (idempotente).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELAS
-- ----------------------------------------------------------------------------

create table if not exists public.condominios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text,
  uf text,
  endereco text,
  cnpj text,
  codigo_convite text not null unique,
  codigo_portaria text unique,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.condominios add column if not exists codigo_portaria text unique;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text,
  telefone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  bloco text,
  numero text not null,
  fracao_ideal numeric(8,5),
  observacoes text,
  created_at timestamptz not null default now()
);

-- Evita unidades duplicadas (mesmo bloco/número) dentro de um condomínio.
create unique index if not exists uq_unidades_cond_bloco_numero
  on public.unidades (condominio_id, coalesce(bloco, ''), numero);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unidade_id uuid references public.unidades(id) on delete set null,
  papel text not null default 'morador' check (papel in ('morador','sindico','admin','porteiro')),
  status text not null default 'ativo' check (status in ('ativo','pendente','inativo')),
  vinculo text not null default 'proprietario' check (vinculo in ('proprietario','inquilino','dependente')),
  created_at timestamptz not null default now(),
  unique (condominio_id, user_id)
);

alter table public.unidades add column if not exists fracao_ideal numeric(8,5);
alter table public.unidades add column if not exists observacoes text;
alter table public.memberships add column if not exists vinculo text
  check (vinculo in ('proprietario','inquilino','dependente')) default 'proprietario';

create table if not exists public.comunicados (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null,
  titulo text not null,
  corpo text not null,
  categoria text,
  fixado boolean not null default false,
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta')),
  created_at timestamptz not null default now()
);

create table if not exists public.comunicado_leituras (
  comunicado_id uuid not null references public.comunicados(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lido_em timestamptz not null default now(),
  primary key (comunicado_id, user_id)
);

create table if not exists public.chamados (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  autor_id uuid not null references public.profiles(id) on delete cascade,
  unidade_id uuid references public.unidades(id) on delete set null,
  categoria text not null default 'outros'
    check (categoria in ('manutencao','limpeza','seguranca','barulho','reclamacao','sugestao','outros')),
  titulo text not null,
  descricao text not null,
  status text not null default 'aberto' check (status in ('aberto','em_andamento','resolvido','cancelado')),
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta')),
  responsavel_id uuid references public.profiles(id) on delete set null,
  fotos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chamado_eventos (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null,
  tipo text not null default 'comentario' check (tipo in ('criacao','comentario','status','responsavel')),
  texto text,
  status_novo text check (status_novo in ('aberto','em_andamento','resolvido','cancelado')),
  created_at timestamptz not null default now()
);

create table if not exists public.areas_comuns (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  nome text not null,
  descricao text,
  capacidade int,
  requer_aprovacao boolean not null default true,
  hora_abertura time,
  hora_fechamento time,
  icone text not null default 'business-outline',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  area_id uuid not null references public.areas_comuns(id) on delete cascade,
  morador_id uuid not null references public.profiles(id) on delete cascade,
  unidade_id uuid references public.unidades(id) on delete set null,
  inicio timestamptz not null,
  fim timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente','aprovada','rejeitada','cancelada')),
  observacao text,
  resposta_admin text,
  created_at timestamptz not null default now()
);

create table if not exists public.achados_perdidos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  registrado_por uuid references public.profiles(id) on delete set null,
  titulo text not null,
  descricao text,
  local_encontrado text,
  foto_url text,
  data_encontrado date,
  status text not null default 'guardado' check (status in ('guardado','devolvido')),
  created_at timestamptz not null default now()
);

create table if not exists public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  morador_id uuid not null references public.profiles(id) on delete cascade,
  categoria text not null default 'outros'
    check (categoria in ('boleto','documento','autorizacao','mudanca','financeiro','outros')),
  titulo text not null,
  descricao text not null,
  status text not null default 'aberta' check (status in ('aberta','em_analise','concluida','recusada')),
  resposta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dependentes (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  nome text not null,
  parentesco text,
  data_nascimento date,
  created_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  nome text not null,
  especie text not null default 'cachorro' check (especie in ('cachorro','gato','outro')),
  raca text,
  foto_url text,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.visitantes_autorizados (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  autorizado_por uuid not null references public.profiles(id) on delete cascade,
  nome_visitante text not null,
  documento text,
  observacao text,
  data_inicio date not null,
  data_fim date,
  status text not null default 'ativa' check (status in ('ativa','utilizada','expirada','cancelada')),
  created_at timestamptz not null default now()
);

create table if not exists public.registros_visitantes (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  autorizacao_id uuid references public.visitantes_autorizados(id) on delete set null,
  nome_visitante text not null,
  documento text,
  registrado_por uuid not null references public.profiles(id) on delete cascade,
  entrada timestamptz not null default now(),
  saida timestamptz,
  observacao text,
  created_at timestamptz not null default now()
);

create table if not exists public.encomendas (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  descricao text not null,
  remetente text,
  foto_url text,
  registrado_por uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'aguardando_retirada' check (status in ('aguardando_retirada','retirada')),
  retirado_por_nome text,
  retirado_em timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.veiculos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  proprietario_id uuid references public.profiles(id) on delete set null,
  placa text not null,
  modelo text,
  cor text,
  tipo text not null default 'carro' check (tipo in ('carro','moto','outro')),
  vaga text,
  created_at timestamptz not null default now()
);

-- Índices úteis
create index if not exists idx_memberships_user on public.memberships(user_id);
create index if not exists idx_memberships_cond on public.memberships(condominio_id);
create index if not exists idx_dependentes_unidade on public.dependentes(unidade_id);
create index if not exists idx_pets_unidade on public.pets(unidade_id);
create index if not exists idx_visitantes_unidade on public.visitantes_autorizados(unidade_id, data_inicio desc);
create index if not exists idx_registros_visitantes_unidade on public.registros_visitantes(unidade_id, entrada desc);
create index if not exists idx_encomendas_unidade on public.encomendas(unidade_id, created_at desc);
create index if not exists idx_veiculos_unidade on public.veiculos(unidade_id);
create index if not exists idx_veiculos_placa on public.veiculos(condominio_id, placa);
create index if not exists idx_comunicados_cond on public.comunicados(condominio_id, created_at desc);
create index if not exists idx_chamados_cond on public.chamados(condominio_id, created_at desc);
create index if not exists idx_chamados_autor on public.chamados(autor_id);
create index if not exists idx_eventos_chamado on public.chamado_eventos(chamado_id, created_at);
create index if not exists idx_reservas_cond on public.reservas(condominio_id, inicio);
create index if not exists idx_achados_cond on public.achados_perdidos(condominio_id, created_at desc);
create index if not exists idx_solic_cond on public.solicitacoes(condominio_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. FUNÇÕES AUXILIARES (SECURITY DEFINER — evitam recursão de RLS)
-- ----------------------------------------------------------------------------

create or replace function public.is_member(cond uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.condominio_id = cond and m.user_id = auth.uid() and m.status = 'ativo'
  );
$$;

create or replace function public.is_gestor(cond uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.condominio_id = cond and m.user_id = auth.uid()
      and m.status = 'ativo' and m.papel in ('sindico','admin')
  );
$$;

create or replace function public.is_porteiro(cond uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.condominio_id = cond and m.user_id = auth.uid()
      and m.status = 'ativo' and m.papel = 'porteiro'
  );
$$;

create or replace function public.compartilha_condominio(outro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.memberships m1
    join public.memberships m2 on m1.condominio_id = m2.condominio_id
    where m1.user_id = auth.uid() and m1.status = 'ativo'
      and m2.user_id = outro and m2.status = 'ativo'
  );
$$;

-- Cria o perfil automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome_completo)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome_completo', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_chamados_updated on public.chamados;
create trigger trg_chamados_updated before update on public.chamados
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_solic_updated on public.solicitacoes;
create trigger trg_solic_updated before update on public.solicitacoes
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 3. RPCs DE ONBOARDING
-- ----------------------------------------------------------------------------

create or replace function public.criar_condominio(
  p_nome text, p_cidade text default null, p_uf text default null
) returns public.condominios
language plpgsql security definer set search_path = public as $$
declare
  v_cond public.condominios;
  v_codigo text;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome do condomínio'; end if;

  loop
    v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.condominios where codigo_convite = v_codigo);
  end loop;

  insert into public.condominios (nome, cidade, uf, codigo_convite, criado_por)
  values (trim(p_nome), nullif(trim(p_cidade), ''), nullif(upper(trim(p_uf)), ''), v_codigo, auth.uid())
  returning * into v_cond;

  insert into public.memberships (condominio_id, user_id, papel, status)
  values (v_cond.id, auth.uid(), 'sindico', 'ativo');

  -- Áreas comuns iniciais (o síndico pode editar/remover depois)
  insert into public.areas_comuns (condominio_id, nome, icone, requer_aprovacao, capacidade) values
    (v_cond.id, 'Salão de Festas', 'sparkles-outline', true, 40),
    (v_cond.id, 'Churrasqueira', 'flame-outline', true, 20),
    (v_cond.id, 'Quadra', 'basketball-outline', false, null),
    (v_cond.id, 'Academia', 'barbell-outline', false, null);

  return v_cond;
end;
$$;

-- Assinatura antiga (3 parâmetros) precisa ser removida antes de recriar com 4,
-- senão o Postgres mantém as duas versões como sobrecargas e o RPC fica ambíguo.
drop function if exists public.entrar_condominio(text, text, text);

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
  if auth.uid() is null then raise exception 'Não autenticado'; end if;

  select * into v_cond from public.condominios where codigo_convite = upper(trim(p_codigo));
  if v_cond.id is null then raise exception 'Código de convite inválido'; end if;

  select * into v_membership from public.memberships
    where condominio_id = v_cond.id and user_id = auth.uid();
  if v_membership.id is not null then
    return v_membership; -- já é membro
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

  insert into public.memberships (condominio_id, user_id, unidade_id, papel, status, vinculo)
  values (v_cond.id, auth.uid(), v_unidade_id, 'morador', 'ativo', v_vinculo)
  returning * into v_membership;

  return v_membership;
end;
$$;

-- RPC de convite de equipe (porteiro): código separado do convite de morador.
create or replace function public.gerar_codigo_portaria(p_cond uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_codigo text;
begin
  if not public.is_gestor(p_cond) then raise exception 'Sem permissão'; end if;
  loop
    v_codigo := 'P' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.condominios where codigo_portaria = v_codigo);
  end loop;
  update public.condominios set codigo_portaria = v_codigo where id = p_cond;
  return v_codigo;
end;
$$;

create or replace function public.entrar_como_porteiro(p_codigo text)
returns public.memberships
language plpgsql security definer set search_path = public as $$
declare
  v_cond public.condominios;
  v_membership public.memberships;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;

  select * into v_cond from public.condominios where codigo_portaria = upper(trim(p_codigo));
  if v_cond.id is null then raise exception 'Código de portaria inválido'; end if;

  select * into v_membership from public.memberships
    where condominio_id = v_cond.id and user_id = auth.uid();

  if v_membership.id is not null then
    update public.memberships set papel = 'porteiro', status = 'ativo'
      where id = v_membership.id returning * into v_membership;
  else
    insert into public.memberships (condominio_id, user_id, papel, status)
    values (v_cond.id, auth.uid(), 'porteiro', 'ativo')
    returning * into v_membership;
  end if;

  return v_membership;
end;
$$;

grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_gestor(uuid) to authenticated;
grant execute on function public.is_porteiro(uuid) to authenticated;
grant execute on function public.compartilha_condominio(uuid) to authenticated;
grant execute on function public.criar_condominio(text, text, text) to authenticated;
grant execute on function public.entrar_condominio(text, text, text, text) to authenticated;
grant execute on function public.gerar_codigo_portaria(uuid) to authenticated;
grant execute on function public.entrar_como_porteiro(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.condominios enable row level security;
alter table public.profiles enable row level security;
alter table public.unidades enable row level security;
alter table public.memberships enable row level security;
alter table public.comunicados enable row level security;
alter table public.comunicado_leituras enable row level security;
alter table public.chamados enable row level security;
alter table public.chamado_eventos enable row level security;
alter table public.areas_comuns enable row level security;
alter table public.reservas enable row level security;
alter table public.achados_perdidos enable row level security;
alter table public.solicitacoes enable row level security;
alter table public.dependentes enable row level security;
alter table public.pets enable row level security;
alter table public.visitantes_autorizados enable row level security;
alter table public.registros_visitantes enable row level security;
alter table public.encomendas enable row level security;
alter table public.veiculos enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.compartilha_condominio(id));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- condominios
drop policy if exists condominios_select on public.condominios;
create policy condominios_select on public.condominios for select to authenticated
  using (public.is_member(id));
drop policy if exists condominios_update on public.condominios;
create policy condominios_update on public.condominios for update to authenticated
  using (public.is_gestor(id)) with check (public.is_gestor(id));

-- unidades
drop policy if exists unidades_select on public.unidades;
create policy unidades_select on public.unidades for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists unidades_write on public.unidades;
create policy unidades_write on public.unidades for all to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));

-- memberships
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_gestor(condominio_id));
drop policy if exists memberships_insert on public.memberships;
create policy memberships_insert on public.memberships for insert to authenticated
  with check (public.is_gestor(condominio_id));
drop policy if exists memberships_update on public.memberships;
create policy memberships_update on public.memberships for update to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));
drop policy if exists memberships_delete on public.memberships;
create policy memberships_delete on public.memberships for delete to authenticated
  using (public.is_gestor(condominio_id));

-- comunicados
drop policy if exists comunicados_select on public.comunicados;
create policy comunicados_select on public.comunicados for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists comunicados_write on public.comunicados;
create policy comunicados_write on public.comunicados for all to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));

-- comunicado_leituras
drop policy if exists leituras_select on public.comunicado_leituras;
create policy leituras_select on public.comunicado_leituras for select to authenticated
  using (user_id = auth.uid());
drop policy if exists leituras_insert on public.comunicado_leituras;
create policy leituras_insert on public.comunicado_leituras for insert to authenticated
  with check (user_id = auth.uid());

-- chamados
drop policy if exists chamados_select on public.chamados;
create policy chamados_select on public.chamados for select to authenticated
  using (public.is_member(condominio_id) and (autor_id = auth.uid() or public.is_gestor(condominio_id)));
drop policy if exists chamados_insert on public.chamados;
create policy chamados_insert on public.chamados for insert to authenticated
  with check (autor_id = auth.uid() and public.is_member(condominio_id));
drop policy if exists chamados_update on public.chamados;
create policy chamados_update on public.chamados for update to authenticated
  using (autor_id = auth.uid() or public.is_gestor(condominio_id))
  with check (autor_id = auth.uid() or public.is_gestor(condominio_id));
drop policy if exists chamados_delete on public.chamados;
create policy chamados_delete on public.chamados for delete to authenticated
  using (autor_id = auth.uid() or public.is_gestor(condominio_id));

-- chamado_eventos (visíveis para quem enxerga o chamado)
drop policy if exists eventos_select on public.chamado_eventos;
create policy eventos_select on public.chamado_eventos for select to authenticated
  using (exists (
    select 1 from public.chamados c
    where c.id = chamado_id and (c.autor_id = auth.uid() or public.is_gestor(c.condominio_id))
  ));
drop policy if exists eventos_insert on public.chamado_eventos;
create policy eventos_insert on public.chamado_eventos for insert to authenticated
  with check (autor_id = auth.uid() and exists (
    select 1 from public.chamados c
    where c.id = chamado_id and (c.autor_id = auth.uid() or public.is_gestor(c.condominio_id))
  ));

-- areas_comuns
drop policy if exists areas_select on public.areas_comuns;
create policy areas_select on public.areas_comuns for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists areas_write on public.areas_comuns;
create policy areas_write on public.areas_comuns for all to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));

-- reservas
drop policy if exists reservas_select on public.reservas;
create policy reservas_select on public.reservas for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists reservas_insert on public.reservas;
create policy reservas_insert on public.reservas for insert to authenticated
  with check (morador_id = auth.uid() and public.is_member(condominio_id));
drop policy if exists reservas_update on public.reservas;
create policy reservas_update on public.reservas for update to authenticated
  using (morador_id = auth.uid() or public.is_gestor(condominio_id))
  with check (morador_id = auth.uid() or public.is_gestor(condominio_id));
drop policy if exists reservas_delete on public.reservas;
create policy reservas_delete on public.reservas for delete to authenticated
  using (morador_id = auth.uid() or public.is_gestor(condominio_id));

-- achados_perdidos
drop policy if exists achados_select on public.achados_perdidos;
create policy achados_select on public.achados_perdidos for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists achados_insert on public.achados_perdidos;
create policy achados_insert on public.achados_perdidos for insert to authenticated
  with check (registrado_por = auth.uid() and public.is_member(condominio_id));
drop policy if exists achados_update on public.achados_perdidos;
create policy achados_update on public.achados_perdidos for update to authenticated
  using (registrado_por = auth.uid() or public.is_gestor(condominio_id))
  with check (registrado_por = auth.uid() or public.is_gestor(condominio_id));
drop policy if exists achados_delete on public.achados_perdidos;
create policy achados_delete on public.achados_perdidos for delete to authenticated
  using (registrado_por = auth.uid() or public.is_gestor(condominio_id));

-- solicitacoes
drop policy if exists solic_select on public.solicitacoes;
create policy solic_select on public.solicitacoes for select to authenticated
  using (public.is_member(condominio_id) and (morador_id = auth.uid() or public.is_gestor(condominio_id)));
drop policy if exists solic_insert on public.solicitacoes;
create policy solic_insert on public.solicitacoes for insert to authenticated
  with check (morador_id = auth.uid() and public.is_member(condominio_id));
drop policy if exists solic_update on public.solicitacoes;
create policy solic_update on public.solicitacoes for update to authenticated
  using (morador_id = auth.uid() or public.is_gestor(condominio_id))
  with check (morador_id = auth.uid() or public.is_gestor(condominio_id));
drop policy if exists solic_delete on public.solicitacoes;
create policy solic_delete on public.solicitacoes for delete to authenticated
  using (morador_id = auth.uid() or public.is_gestor(condominio_id));

-- dependentes (leitura: qualquer membro do condomínio; escrita: gestor ou morador da própria unidade)
drop policy if exists dependentes_select on public.dependentes;
create policy dependentes_select on public.dependentes for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists dependentes_write on public.dependentes;
create policy dependentes_write on public.dependentes for all to authenticated
  using (
    public.is_gestor(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = dependentes.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  )
  with check (
    public.is_gestor(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = dependentes.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  );

-- pets (mesmo padrão de dependentes)
drop policy if exists pets_select on public.pets;
create policy pets_select on public.pets for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists pets_write on public.pets;
create policy pets_write on public.pets for all to authenticated
  using (
    public.is_gestor(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = pets.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  )
  with check (
    public.is_gestor(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = pets.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  );

-- visitantes_autorizados (pré-autorização feita pelo morador; visível a ele, ao gestor e à portaria)
drop policy if exists visitantes_select on public.visitantes_autorizados;
create policy visitantes_select on public.visitantes_autorizados for select to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = visitantes_autorizados.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  );
drop policy if exists visitantes_insert on public.visitantes_autorizados;
create policy visitantes_insert on public.visitantes_autorizados for insert to authenticated
  with check (
    autorizado_por = auth.uid() and exists (
      select 1 from public.memberships m
      where m.unidade_id = visitantes_autorizados.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  );
drop policy if exists visitantes_update on public.visitantes_autorizados;
create policy visitantes_update on public.visitantes_autorizados for update to authenticated
  using (autorizado_por = auth.uid() or public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  with check (autorizado_por = auth.uid() or public.is_gestor(condominio_id) or public.is_porteiro(condominio_id));
drop policy if exists visitantes_delete on public.visitantes_autorizados;
create policy visitantes_delete on public.visitantes_autorizados for delete to authenticated
  using (autorizado_por = auth.uid() or public.is_gestor(condominio_id));

-- registros_visitantes (log operacional; só gestor/portaria registram)
drop policy if exists registros_visitantes_select on public.registros_visitantes;
create policy registros_visitantes_select on public.registros_visitantes for select to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = registros_visitantes.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  );
drop policy if exists registros_visitantes_write on public.registros_visitantes;
create policy registros_visitantes_write on public.registros_visitantes for all to authenticated
  using (public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  with check (
    registrado_por = auth.uid() and (public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  );

-- encomendas (visível à unidade dona, gestor e portaria; registrado só por gestor/portaria)
drop policy if exists encomendas_select on public.encomendas;
create policy encomendas_select on public.encomendas for select to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = encomendas.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  );
drop policy if exists encomendas_write on public.encomendas;
create policy encomendas_write on public.encomendas for all to authenticated
  using (public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  with check (
    registrado_por = auth.uid() and (public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  );

-- veiculos (visível à unidade dona, gestor e portaria; cadastro pela unidade, gestor ou portaria)
drop policy if exists veiculos_select on public.veiculos;
create policy veiculos_select on public.veiculos for select to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = veiculos.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  );
drop policy if exists veiculos_write on public.veiculos;
create policy veiculos_write on public.veiculos for insert to authenticated
  with check (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = veiculos.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  );
drop policy if exists veiculos_update on public.veiculos;
create policy veiculos_update on public.veiculos for update to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = veiculos.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  )
  with check (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = veiculos.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  );
drop policy if exists veiculos_delete on public.veiculos;
create policy veiculos_delete on public.veiculos for delete to authenticated
  using (
    public.is_gestor(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = veiculos.unidade_id and m.user_id = auth.uid() and m.status = 'ativo'
    )
  );

-- ----------------------------------------------------------------------------
-- 4b. PERMISSÕES DE ACESSO À DATA API
--     (necessárias além do RLS; garantem que o app enxergue as tabelas mesmo
--      se "Automatically expose new tables" estiver desligado no projeto)
-- ----------------------------------------------------------------------------

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ----------------------------------------------------------------------------
-- 5. STORAGE (fotos de chamados, achados e avatares)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('chamados', 'chamados', true), ('achados', 'achados', true), ('portaria', 'portaria', true)
on conflict (id) do nothing;

drop policy if exists fotos_leitura on storage.objects;
create policy fotos_leitura on storage.objects for select
  using (bucket_id in ('avatars', 'chamados', 'achados', 'portaria'));

drop policy if exists fotos_upload on storage.objects;
create policy fotos_upload on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'chamados', 'achados', 'portaria'));

drop policy if exists fotos_update on storage.objects;
create policy fotos_update on storage.objects for update to authenticated
  using (owner = auth.uid());

drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects for delete to authenticated
  using (owner = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. REALTIME (notificações instantâneas)
-- ----------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.comunicados;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.chamados;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.chamado_eventos;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.reservas;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.solicitacoes;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.encomendas;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.visitantes_autorizados;
  exception when duplicate_object then null; end;
end $$;

-- Fim do setup.
