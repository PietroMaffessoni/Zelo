-- ============================================================================
--  CondoOS — Setup completo do banco de dados (Supabase / PostgreSQL)
--  Cole este arquivo inteiro no SQL Editor do seu projeto Supabase e execute.
--  É seguro rodar mais de uma vez (idempotente).
-- ============================================================================

-- Extensão necessária para a trava de conflito de horário em reservas (EXCLUDE por intervalo).
create extension if not exists btree_gist;

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

create table if not exists public.lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid references public.unidades(id) on delete set null,
  tipo text not null check (tipo in ('boleto','despesa')),
  categoria text not null default 'outros'
    check (categoria in ('taxa_condominial','fundo_reserva','multa','agua','luz','manutencao','servicos','outros')),
  descricao text not null,
  valor numeric(10,2) not null check (valor >= 0),
  vencimento date not null,
  competencia text,
  status text not null default 'pendente' check (status in ('pendente','pago','atrasado','cancelado')),
  pago_em date,
  anexo_path text,
  observacao text,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  categoria text not null default 'outros'
    check (categoria in ('convencao','regimento_interno','ata','edital','financeiro','outros')),
  titulo text not null,
  descricao text,
  arquivo_path text not null,
  arquivo_nome text,
  tamanho_bytes bigint,
  publicado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Regras de reserva: taxa de uso, limite mensal por unidade e trava de conflito de horário.
alter table public.areas_comuns add column if not exists taxa_uso numeric(10,2) not null default 0;
alter table public.areas_comuns add column if not exists limite_mensal_por_unidade int;

alter table public.reservas add column if not exists taxa_cobrada numeric(10,2);
alter table public.reservas add column if not exists lancamento_id uuid references public.lancamentos_financeiros(id) on delete set null;
alter table public.reservas add column if not exists periodo tstzrange
  generated always as (tstzrange(inicio, fim, '[)')) stored;

alter table public.reservas drop constraint if exists reservas_sem_conflito;
alter table public.reservas add constraint reservas_sem_conflito
  exclude using gist (area_id with =, periodo with &&)
  where (status in ('pendente','aprovada'));

create table if not exists public.vistorias_reserva (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida')),
  itens jsonb not null default '[]',
  fotos text[] not null default '{}',
  respondida_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (reserva_id, tipo)
);

-- Assembleias e votações
create table if not exists public.assembleias (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  titulo text not null,
  descricao text,
  data_hora timestamptz not null,
  local text,
  link_online text,
  quorum_minimo_unidades int,
  status text not null default 'convocada' check (status in ('convocada','em_andamento','encerrada','cancelada')),
  ata_documento_id uuid references public.documentos(id) on delete set null,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assembleia_pautas (
  id uuid primary key default gen_random_uuid(),
  assembleia_id uuid not null references public.assembleias(id) on delete cascade,
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  ordem int not null default 0,
  titulo text not null,
  descricao text,
  permite_votacao boolean not null default true,
  encerrada boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.assembleia_opcoes (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.assembleia_pautas(id) on delete cascade,
  texto text not null,
  ordem int not null default 0
);

create table if not exists public.assembleia_votos (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.assembleia_pautas(id) on delete cascade,
  opcao_id uuid not null references public.assembleia_opcoes(id) on delete cascade,
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (pauta_id, unidade_id)
);

-- Notificações push (base local — sem servidor de push nesta fase)
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  condominio_id uuid references public.condominios(id) on delete cascade,
  expo_push_token text not null,
  plataforma text check (plataforma in ('ios','android','web')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

alter table public.profiles add column if not exists preferencias_notificacao jsonb not null default
  '{"comunicados":true,"chamados":true,"encomendas":true,"reservas":true,"assembleias":true}'::jsonb;

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
create index if not exists idx_financeiro_cond on public.lancamentos_financeiros(condominio_id, vencimento desc);
create index if not exists idx_financeiro_unidade on public.lancamentos_financeiros(unidade_id);
create index if not exists idx_documentos_cond on public.documentos(condominio_id, created_at desc);
create index if not exists idx_vistorias_reserva on public.vistorias_reserva(reserva_id);
create index if not exists idx_assembleias_cond on public.assembleias(condominio_id, data_hora desc);
create index if not exists idx_pautas_assembleia on public.assembleia_pautas(assembleia_id, ordem);
create index if not exists idx_opcoes_pauta on public.assembleia_opcoes(pauta_id, ordem);
create index if not exists idx_votos_pauta on public.assembleia_votos(pauta_id);
create index if not exists idx_push_tokens_user on public.push_tokens(user_id);
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
    where m.condominio_id = cond and m.user_id = (select auth.uid()) and m.status = 'ativo'
  );
$$;

create or replace function public.is_gestor(cond uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.condominio_id = cond and m.user_id = (select auth.uid())
      and m.status = 'ativo' and m.papel in ('sindico','admin')
  );
$$;

create or replace function public.is_porteiro(cond uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.condominio_id = cond and m.user_id = (select auth.uid())
      and m.status = 'ativo' and m.papel = 'porteiro'
  );
$$;

-- Conselho fiscal: síndico, admin ou conselheiro (enxerga a gestão, não a altera).
create or replace function public.is_conselho(cond uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.condominio_id = cond and m.user_id = (select auth.uid())
      and m.status = 'ativo' and m.papel in ('sindico','admin','conselheiro')
  );
$$;

create or replace function public.compartilha_condominio(outro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.memberships m1
    join public.memberships m2 on m1.condominio_id = m2.condominio_id
    where m1.user_id = (select auth.uid()) and m1.status = 'ativo'
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

drop trigger if exists trg_financeiro_updated on public.lancamentos_financeiros;
create trigger trg_financeiro_updated before update on public.lancamentos_financeiros
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_assembleias_updated on public.assembleias;
create trigger trg_assembleias_updated before update on public.assembleias
  for each row execute function public.touch_updated_at();

-- Limite mensal de reservas por unidade (por área) — não é expressável via EXCLUDE, precisa contar linhas.
create or replace function public.checar_limite_reservas()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limite int;
  v_qtde int;
begin
  if new.unidade_id is null then return new; end if;
  select limite_mensal_por_unidade into v_limite from public.areas_comuns where id = new.area_id;
  if v_limite is null then return new; end if;
  select count(*) into v_qtde from public.reservas
    where area_id = new.area_id and unidade_id = new.unidade_id
      and status in ('pendente','aprovada')
      and date_trunc('month', inicio) = date_trunc('month', new.inicio)
      and id is distinct from new.id;
  if v_qtde >= v_limite then
    raise exception 'Limite de % reserva(s) por mês para esta área já foi atingido por esta unidade.', v_limite;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reservas_limite on public.reservas;
create trigger trg_reservas_limite before insert or update of unidade_id, area_id, inicio, status on public.reservas
  for each row execute function public.checar_limite_reservas();

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
  if (select auth.uid()) is null then raise exception 'Não autenticado'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome do condomínio'; end if;

  loop
    v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.condominios where codigo_convite = v_codigo);
  end loop;

  insert into public.condominios (nome, cidade, uf, codigo_convite, criado_por)
  values (trim(p_nome), nullif(trim(p_cidade), ''), nullif(upper(trim(p_uf)), ''), v_codigo, (select auth.uid()))
  returning * into v_cond;

  insert into public.memberships (condominio_id, user_id, papel, status)
  values (v_cond.id, (select auth.uid()), 'sindico', 'ativo');

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
  if (select auth.uid()) is null then raise exception 'Não autenticado'; end if;

  select * into v_cond from public.condominios where codigo_convite = upper(trim(p_codigo));
  if v_cond.id is null then raise exception 'Código de convite inválido'; end if;

  select * into v_membership from public.memberships
    where condominio_id = v_cond.id and user_id = (select auth.uid());
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
  values (v_cond.id, (select auth.uid()), v_unidade_id, 'morador', 'ativo', v_vinculo)
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
  if (select auth.uid()) is null then raise exception 'Não autenticado'; end if;

  select * into v_cond from public.condominios where codigo_portaria = upper(trim(p_codigo));
  if v_cond.id is null then raise exception 'Código de portaria inválido'; end if;

  select * into v_membership from public.memberships
    where condominio_id = v_cond.id and user_id = (select auth.uid());

  if v_membership.id is not null then
    update public.memberships set papel = 'porteiro', status = 'ativo'
      where id = v_membership.id returning * into v_membership;
  else
    insert into public.memberships (condominio_id, user_id, papel, status)
    values (v_cond.id, (select auth.uid()), 'porteiro', 'ativo')
    returning * into v_membership;
  end if;

  return v_membership;
end;
$$;

-- Lança a mesma cobrança (ex.: taxa condominial do mês) para todas as unidades de uma vez.
create or replace function public.gerar_boletos_mensais(
  p_cond uuid, p_categoria text, p_descricao text, p_valor numeric, p_vencimento date, p_competencia text default null
) returns setof public.lancamentos_financeiros
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_gestor(p_cond) then raise exception 'Sem permissão'; end if;
  return query insert into public.lancamentos_financeiros
    (condominio_id, unidade_id, tipo, categoria, descricao, valor, vencimento, competencia, criado_por)
  select p_cond, u.id, 'boleto', p_categoria, p_descricao, p_valor, p_vencimento, p_competencia, (select auth.uid())
  from public.unidades u
  where u.condominio_id = p_cond
  returning *;
end;
$$;

grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_gestor(uuid) to authenticated;
grant execute on function public.is_porteiro(uuid) to authenticated;
grant execute on function public.is_conselho(uuid) to authenticated;
grant execute on function public.compartilha_condominio(uuid) to authenticated;
grant execute on function public.criar_condominio(text, text, text) to authenticated;
grant execute on function public.entrar_condominio(text, text, text, text) to authenticated;
grant execute on function public.gerar_codigo_portaria(uuid) to authenticated;
grant execute on function public.entrar_como_porteiro(text) to authenticated;
grant execute on function public.gerar_boletos_mensais(uuid, text, text, numeric, date, text) to authenticated;

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
alter table public.lancamentos_financeiros enable row level security;
alter table public.documentos enable row level security;
alter table public.vistorias_reserva enable row level security;
alter table public.assembleias enable row level security;
alter table public.assembleia_pautas enable row level security;
alter table public.assembleia_opcoes enable row level security;
alter table public.assembleia_votos enable row level security;
alter table public.push_tokens enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.compartilha_condominio(id));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

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
  using (user_id = (select auth.uid()) or public.is_gestor(condominio_id));
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
  using (user_id = (select auth.uid()));
drop policy if exists leituras_insert on public.comunicado_leituras;
create policy leituras_insert on public.comunicado_leituras for insert to authenticated
  with check (user_id = (select auth.uid()));

-- chamados
drop policy if exists chamados_select on public.chamados;
create policy chamados_select on public.chamados for select to authenticated
  using (public.is_member(condominio_id) and (autor_id = (select auth.uid()) or public.is_gestor(condominio_id)));
drop policy if exists chamados_insert on public.chamados;
create policy chamados_insert on public.chamados for insert to authenticated
  with check (autor_id = (select auth.uid()) and public.is_member(condominio_id));
drop policy if exists chamados_update on public.chamados;
create policy chamados_update on public.chamados for update to authenticated
  using (autor_id = (select auth.uid()) or public.is_gestor(condominio_id))
  with check (autor_id = (select auth.uid()) or public.is_gestor(condominio_id));
drop policy if exists chamados_delete on public.chamados;
create policy chamados_delete on public.chamados for delete to authenticated
  using (autor_id = (select auth.uid()) or public.is_gestor(condominio_id));

-- chamado_eventos (visíveis para quem enxerga o chamado)
drop policy if exists eventos_select on public.chamado_eventos;
create policy eventos_select on public.chamado_eventos for select to authenticated
  using (exists (
    select 1 from public.chamados c
    where c.id = chamado_id and (c.autor_id = (select auth.uid()) or public.is_gestor(c.condominio_id))
  ));
drop policy if exists eventos_insert on public.chamado_eventos;
create policy eventos_insert on public.chamado_eventos for insert to authenticated
  with check (autor_id = (select auth.uid()) and exists (
    select 1 from public.chamados c
    where c.id = chamado_id and (c.autor_id = (select auth.uid()) or public.is_gestor(c.condominio_id))
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
  with check (morador_id = (select auth.uid()) and public.is_member(condominio_id));
drop policy if exists reservas_update on public.reservas;
create policy reservas_update on public.reservas for update to authenticated
  using (morador_id = (select auth.uid()) or public.is_gestor(condominio_id))
  with check (morador_id = (select auth.uid()) or public.is_gestor(condominio_id));
drop policy if exists reservas_delete on public.reservas;
create policy reservas_delete on public.reservas for delete to authenticated
  using (morador_id = (select auth.uid()) or public.is_gestor(condominio_id));

-- achados_perdidos
drop policy if exists achados_select on public.achados_perdidos;
create policy achados_select on public.achados_perdidos for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists achados_insert on public.achados_perdidos;
create policy achados_insert on public.achados_perdidos for insert to authenticated
  with check (registrado_por = (select auth.uid()) and public.is_member(condominio_id));
drop policy if exists achados_update on public.achados_perdidos;
create policy achados_update on public.achados_perdidos for update to authenticated
  using (registrado_por = (select auth.uid()) or public.is_gestor(condominio_id))
  with check (registrado_por = (select auth.uid()) or public.is_gestor(condominio_id));
drop policy if exists achados_delete on public.achados_perdidos;
create policy achados_delete on public.achados_perdidos for delete to authenticated
  using (registrado_por = (select auth.uid()) or public.is_gestor(condominio_id));

-- solicitacoes
drop policy if exists solic_select on public.solicitacoes;
create policy solic_select on public.solicitacoes for select to authenticated
  using (public.is_member(condominio_id) and (morador_id = (select auth.uid()) or public.is_gestor(condominio_id)));
drop policy if exists solic_insert on public.solicitacoes;
create policy solic_insert on public.solicitacoes for insert to authenticated
  with check (morador_id = (select auth.uid()) and public.is_member(condominio_id));
drop policy if exists solic_update on public.solicitacoes;
create policy solic_update on public.solicitacoes for update to authenticated
  using (morador_id = (select auth.uid()) or public.is_gestor(condominio_id))
  with check (morador_id = (select auth.uid()) or public.is_gestor(condominio_id));
drop policy if exists solic_delete on public.solicitacoes;
create policy solic_delete on public.solicitacoes for delete to authenticated
  using (morador_id = (select auth.uid()) or public.is_gestor(condominio_id));

-- dependentes (leitura: qualquer membro do condomínio; escrita: gestor ou morador da própria unidade)
drop policy if exists dependentes_select on public.dependentes;
create policy dependentes_select on public.dependentes for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists dependentes_write on public.dependentes;
create policy dependentes_write on public.dependentes for all to authenticated
  using (
    public.is_gestor(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = dependentes.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  )
  with check (
    public.is_gestor(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = dependentes.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
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
      where m.unidade_id = pets.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  )
  with check (
    public.is_gestor(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = pets.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  );

-- visitantes_autorizados (pré-autorização feita pelo morador; visível a ele, ao gestor e à portaria)
drop policy if exists visitantes_select on public.visitantes_autorizados;
create policy visitantes_select on public.visitantes_autorizados for select to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = visitantes_autorizados.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  );
drop policy if exists visitantes_insert on public.visitantes_autorizados;
create policy visitantes_insert on public.visitantes_autorizados for insert to authenticated
  with check (
    autorizado_por = (select auth.uid()) and exists (
      select 1 from public.memberships m
      where m.unidade_id = visitantes_autorizados.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  );
drop policy if exists visitantes_update on public.visitantes_autorizados;
create policy visitantes_update on public.visitantes_autorizados for update to authenticated
  using (autorizado_por = (select auth.uid()) or public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  with check (autorizado_por = (select auth.uid()) or public.is_gestor(condominio_id) or public.is_porteiro(condominio_id));
drop policy if exists visitantes_delete on public.visitantes_autorizados;
create policy visitantes_delete on public.visitantes_autorizados for delete to authenticated
  using (autorizado_por = (select auth.uid()) or public.is_gestor(condominio_id));

-- registros_visitantes (log operacional; só gestor/portaria registram)
drop policy if exists registros_visitantes_select on public.registros_visitantes;
create policy registros_visitantes_select on public.registros_visitantes for select to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = registros_visitantes.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  );
drop policy if exists registros_visitantes_write on public.registros_visitantes;
create policy registros_visitantes_write on public.registros_visitantes for all to authenticated
  using (public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  with check (
    registrado_por = (select auth.uid()) and (public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  );

-- encomendas (visível à unidade dona, gestor e portaria; registrado só por gestor/portaria)
drop policy if exists encomendas_select on public.encomendas;
create policy encomendas_select on public.encomendas for select to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = encomendas.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  );
drop policy if exists encomendas_write on public.encomendas;
create policy encomendas_write on public.encomendas for all to authenticated
  using (public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  with check (
    registrado_por = (select auth.uid()) and (public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  );

-- veiculos (visível à unidade dona, gestor e portaria; cadastro pela unidade, gestor ou portaria)
drop policy if exists veiculos_select on public.veiculos;
create policy veiculos_select on public.veiculos for select to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = veiculos.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  );
drop policy if exists veiculos_write on public.veiculos;
create policy veiculos_write on public.veiculos for insert to authenticated
  with check (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = veiculos.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  );
drop policy if exists veiculos_update on public.veiculos;
create policy veiculos_update on public.veiculos for update to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = veiculos.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  )
  with check (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = veiculos.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  );
drop policy if exists veiculos_delete on public.veiculos;
create policy veiculos_delete on public.veiculos for delete to authenticated
  using (
    public.is_gestor(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = veiculos.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  );

-- lancamentos_financeiros (tabela administrativa: só o gestor lança/edita;
-- morador só lê o que é da própria unidade ou despesas gerais do condomínio)
drop policy if exists financeiro_select on public.lancamentos_financeiros;
create policy financeiro_select on public.lancamentos_financeiros for select to authenticated
  using (
    public.is_conselho(condominio_id) or
    (unidade_id is null and public.is_member(condominio_id)) or
    (unidade_id is not null and exists (
      select 1 from public.memberships m
      where m.unidade_id = lancamentos_financeiros.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    ))
  );
drop policy if exists financeiro_write on public.lancamentos_financeiros;
create policy financeiro_write on public.lancamentos_financeiros for all to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));

-- documentos (biblioteca do condomínio: leitura para membros, publicação só pelo gestor)
drop policy if exists documentos_select on public.documentos;
create policy documentos_select on public.documentos for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists documentos_write on public.documentos;
create policy documentos_write on public.documentos for all to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));

-- vistorias_reserva (checklist de entrada/saída: gestor, portaria e o morador dono da reserva veem;
-- só gestor/portaria preenchem)
drop policy if exists vistorias_select on public.vistorias_reserva;
create policy vistorias_select on public.vistorias_reserva for select to authenticated
  using (
    public.is_gestor(condominio_id) or public.is_porteiro(condominio_id) or exists (
      select 1 from public.reservas r where r.id = reserva_id and r.morador_id = (select auth.uid())
    )
  );
drop policy if exists vistorias_write on public.vistorias_reserva;
create policy vistorias_write on public.vistorias_reserva for all to authenticated
  using (public.is_gestor(condominio_id) or public.is_porteiro(condominio_id))
  with check (public.is_gestor(condominio_id) or public.is_porteiro(condominio_id));

-- assembleias / pautas (leitura para membros, escrita só gestor)
drop policy if exists assembleias_select on public.assembleias;
create policy assembleias_select on public.assembleias for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists assembleias_write on public.assembleias;
create policy assembleias_write on public.assembleias for all to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));

drop policy if exists pautas_select on public.assembleia_pautas;
create policy pautas_select on public.assembleia_pautas for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists pautas_write on public.assembleia_pautas;
create policy pautas_write on public.assembleia_pautas for all to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));

-- opcoes (sem condominio_id próprio — checa via pauta)
drop policy if exists opcoes_select on public.assembleia_opcoes;
create policy opcoes_select on public.assembleia_opcoes for select to authenticated
  using (exists (
    select 1 from public.assembleia_pautas p where p.id = pauta_id and public.is_member(p.condominio_id)
  ));
drop policy if exists opcoes_write on public.assembleia_opcoes;
create policy opcoes_write on public.assembleia_opcoes for all to authenticated
  using (exists (
    select 1 from public.assembleia_pautas p where p.id = pauta_id and public.is_gestor(p.condominio_id)
  ))
  with check (exists (
    select 1 from public.assembleia_pautas p where p.id = pauta_id and public.is_gestor(p.condominio_id)
  ));

-- votos: 1 por unidade por pauta (trava real é o unique(pauta_id, unidade_id) da tabela).
-- Sem policy de update/delete — voto é definitivo.
drop policy if exists votos_select on public.assembleia_votos;
create policy votos_select on public.assembleia_votos for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists votos_insert on public.assembleia_votos;
create policy votos_insert on public.assembleia_votos for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.memberships m
      where m.user_id = (select auth.uid()) and m.unidade_id = assembleia_votos.unidade_id and m.status = 'ativo'
    ) and exists (
      select 1 from public.assembleia_pautas p where p.id = pauta_id and p.permite_votacao and not p.encerrada
    )
  );

-- push_tokens (cada usuário só vê/gerencia os próprios tokens)
drop policy if exists push_tokens_all on public.push_tokens;
create policy push_tokens_all on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

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
  using (owner = (select auth.uid()));

drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects for delete to authenticated
  using (owner = (select auth.uid()));

-- Bucket privado (boletos/comprovantes): path "{condominio_id}/arquivo", lido via signed URL.
insert into storage.buckets (id, name, public)
values ('financeiro', 'financeiro', false)
on conflict (id) do nothing;

drop policy if exists financeiro_storage_select on storage.objects;
create policy financeiro_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'financeiro' and public.is_member(((storage.foldername(name))[1])::uuid));

-- INSERT liberado para membros do condomínio (não só gestor): além de o síndico subir
-- boletos, o morador precisa anexar o comprovante de pagamento da reserva. A leitura
-- continua restrita a membros e os nomes de arquivo são aleatórios (sem sobrescrita).
drop policy if exists financeiro_storage_insert on storage.objects;
create policy financeiro_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'financeiro' and public.is_member(((storage.foldername(name))[1])::uuid));

-- Bucket privado de documentos (convenção, regimento, atas, editais): mesmo padrão do financeiro.
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists documentos_storage_select on storage.objects;
create policy documentos_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists documentos_storage_insert on storage.objects;
create policy documentos_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.is_gestor(((storage.foldername(name))[1])::uuid));

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
  begin
    alter publication supabase_realtime add table public.assembleia_pautas;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.assembleia_votos;
  exception when duplicate_object then null; end;
end $$;

-- ============================================================================
-- 7. MÓDULOS ADICIONAIS
--    Agenda/eventos, manutenção preventiva, infrações (multas/advertências),
--    propostas de pauta pelos moradores e papel "conselheiro".
--    Bloco autocontido e idempotente — pode rodar junto do restante do arquivo.
-- ============================================================================

-- 7.1 Ajustes em tabelas existentes ------------------------------------------

-- Papel "conselheiro" (auxiliar do síndico: enxerga a gestão, não a altera).
alter table public.memberships drop constraint if exists memberships_papel_check;
alter table public.memberships add constraint memberships_papel_check
  check (papel in ('morador','sindico','admin','porteiro','conselheiro'));

-- Comprovante de pagamento anexado a uma reserva (bucket privado 'financeiro').
alter table public.reservas add column if not exists comprovante_path text;

-- Assinatura eletrônica de retirada de encomenda (1 toque = confirmação logada).
alter table public.encomendas add column if not exists retirado_por_id uuid references public.profiles(id) on delete set null;
alter table public.encomendas add column if not exists assinatura_confirmada boolean not null default false;

-- 7.2 Tabelas novas ----------------------------------------------------------

-- Agenda: eventos importantes do condomínio (assembleias, obras, manutenções, reuniões).
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  titulo text not null,
  descricao text,
  tipo text not null default 'evento'
    check (tipo in ('evento','assembleia','manutencao','obra','reuniao','lazer','outro')),
  inicio timestamptz not null,
  fim timestamptz,
  local text,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Manutenção preventiva: cadastro de equipamentos + histórico de manutenções.
create table if not exists public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  nome text not null,
  categoria text not null default 'outros'
    check (categoria in ('elevador','bomba','gerador','portao','incendio','piscina','jardim','eletrica','hidraulica','outros')),
  localizacao text,
  periodicidade_dias int,
  ultima_manutencao date,
  proxima_manutencao date,
  fornecedor text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.manutencoes (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  equipamento_id uuid not null references public.equipamentos(id) on delete cascade,
  descricao text not null,
  custo numeric(10,2),
  realizada_em date not null default current_date,
  responsavel text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Infrações: advertências e multas com direito a contestação pelo morador.
create table if not exists public.infracoes (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid references public.unidades(id) on delete set null,
  tipo text not null default 'advertencia' check (tipo in ('advertencia','multa')),
  motivo text not null default 'outros'
    check (motivo in ('barulho','area_comum','animais','obras','estacionamento','lixo','seguranca','outros')),
  descricao text not null,
  valor numeric(10,2),
  status text not null default 'aplicada'
    check (status in ('aplicada','contestada','anulada','confirmada','paga')),
  contestacao text,
  contestada_em timestamptz,
  resposta_gestor text,
  lancamento_id uuid references public.lancamentos_financeiros(id) on delete set null,
  aplicada_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Propostas de pauta: qualquer morador sugere um tema; o síndico aprova para virar assembleia.
create table if not exists public.propostas_pauta (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  autor_id uuid not null references public.profiles(id) on delete cascade,
  unidade_id uuid references public.unidades(id) on delete set null,
  titulo text not null,
  descricao text not null,
  status text not null default 'sugerida' check (status in ('sugerida','aprovada','recusada','arquivada')),
  assembleia_id uuid references public.assembleias(id) on delete set null,
  resposta_gestor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Apoios ("curtidas") de outros moradores a uma proposta — 1 por usuário.
create table if not exists public.propostas_apoios (
  proposta_id uuid not null references public.propostas_pauta(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (proposta_id, user_id)
);

-- 7.3 Contestação de infração (RPC) ------------------------------------------
-- O morador só pode CONTESTAR (não anular/alterar). A trava fica no banco:
-- a policy de update de 'infracoes' é gestor-only, e a contestação passa por esta
-- função security definer, que valida unidade e status antes de gravar.
create or replace function public.contestar_infracao(p_id uuid, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_inf public.infracoes;
begin
  if (select auth.uid()) is null then raise exception 'Não autenticado'; end if;
  select * into v_inf from public.infracoes where id = p_id;
  if v_inf.id is null then raise exception 'Infração não encontrada'; end if;
  if v_inf.status <> 'aplicada' then raise exception 'Esta infração não pode mais ser contestada'; end if;
  if not exists (
    select 1 from public.memberships m
    where m.unidade_id = v_inf.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
  ) then raise exception 'Sem permissão'; end if;
  update public.infracoes
    set status = 'contestada', contestacao = coalesce(nullif(trim(p_texto), ''), contestacao), contestada_em = now()
    where id = p_id;
end;
$$;
grant execute on function public.contestar_infracao(uuid, text) to authenticated;

-- 7.4 Índices ----------------------------------------------------------------
create index if not exists idx_eventos_cond on public.eventos(condominio_id, inicio);
create index if not exists idx_equipamentos_cond on public.equipamentos(condominio_id, proxima_manutencao);
create index if not exists idx_manutencoes_equip on public.manutencoes(equipamento_id, realizada_em desc);
create index if not exists idx_infracoes_cond on public.infracoes(condominio_id, created_at desc);
create index if not exists idx_infracoes_unidade on public.infracoes(unidade_id);
create index if not exists idx_propostas_cond on public.propostas_pauta(condominio_id, created_at desc);

-- 7.5 Triggers de updated_at -------------------------------------------------
drop trigger if exists trg_infracoes_updated on public.infracoes;
create trigger trg_infracoes_updated before update on public.infracoes
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_propostas_updated on public.propostas_pauta;
create trigger trg_propostas_updated before update on public.propostas_pauta
  for each row execute function public.touch_updated_at();

-- 7.6 RLS --------------------------------------------------------------------
alter table public.eventos enable row level security;
alter table public.equipamentos enable row level security;
alter table public.manutencoes enable row level security;
alter table public.infracoes enable row level security;
alter table public.propostas_pauta enable row level security;
alter table public.propostas_apoios enable row level security;

-- eventos: leitura para membros, escrita só gestor
drop policy if exists eventos_select on public.eventos;
create policy eventos_select on public.eventos for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists eventos_write on public.eventos;
create policy eventos_write on public.eventos for all to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));

-- equipamentos / manutenções: informação administrativa — gestor e conselho leem, gestor escreve
drop policy if exists equipamentos_select on public.equipamentos;
create policy equipamentos_select on public.equipamentos for select to authenticated
  using (public.is_conselho(condominio_id));
drop policy if exists equipamentos_write on public.equipamentos;
create policy equipamentos_write on public.equipamentos for all to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));

drop policy if exists manutencoes_select on public.manutencoes;
create policy manutencoes_select on public.manutencoes for select to authenticated
  using (public.is_conselho(condominio_id));
drop policy if exists manutencoes_write on public.manutencoes;
create policy manutencoes_write on public.manutencoes for all to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));

-- infrações: gestor/conselho e a unidade multada veem; gestor aplica;
-- a unidade pode atualizar (contestar) e o gestor pode atualizar (responder/anular)
drop policy if exists infracoes_select on public.infracoes;
create policy infracoes_select on public.infracoes for select to authenticated
  using (
    public.is_conselho(condominio_id) or exists (
      select 1 from public.memberships m
      where m.unidade_id = infracoes.unidade_id and m.user_id = (select auth.uid()) and m.status = 'ativo'
    )
  );
drop policy if exists infracoes_insert on public.infracoes;
create policy infracoes_insert on public.infracoes for insert to authenticated
  with check (public.is_gestor(condominio_id));
-- Update direto é gestor-only (responder/anular). A contestação do morador é feita
-- exclusivamente pela RPC public.contestar_infracao (7.3), que valida e grava.
drop policy if exists infracoes_update on public.infracoes;
create policy infracoes_update on public.infracoes for update to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));
drop policy if exists infracoes_delete on public.infracoes;
create policy infracoes_delete on public.infracoes for delete to authenticated
  using (public.is_gestor(condominio_id));

-- propostas de pauta: todos os membros veem; autor cria; autor e gestor atualizam
drop policy if exists propostas_select on public.propostas_pauta;
create policy propostas_select on public.propostas_pauta for select to authenticated
  using (public.is_member(condominio_id));
drop policy if exists propostas_insert on public.propostas_pauta;
create policy propostas_insert on public.propostas_pauta for insert to authenticated
  with check (autor_id = (select auth.uid()) and public.is_member(condominio_id));
-- Update é gestor-only (aprovar/recusar/responder). O autor não altera a proposta
-- depois de criada — o apoio dos demais moradores fica na tabela propostas_apoios.
drop policy if exists propostas_update on public.propostas_pauta;
create policy propostas_update on public.propostas_pauta for update to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));
drop policy if exists propostas_delete on public.propostas_pauta;
create policy propostas_delete on public.propostas_pauta for delete to authenticated
  using (autor_id = (select auth.uid()) or public.is_gestor(condominio_id));

drop policy if exists apoios_select on public.propostas_apoios;
create policy apoios_select on public.propostas_apoios for select to authenticated
  using (exists (
    select 1 from public.propostas_pauta p where p.id = proposta_id and public.is_member(p.condominio_id)
  ));
drop policy if exists apoios_insert on public.propostas_apoios;
create policy apoios_insert on public.propostas_apoios for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.propostas_pauta p where p.id = proposta_id and public.is_member(p.condominio_id)
  ));
drop policy if exists apoios_delete on public.propostas_apoios;
create policy apoios_delete on public.propostas_apoios for delete to authenticated
  using (user_id = (select auth.uid()));

-- 7.7 Grants (as novas tabelas foram criadas depois do grant global da seção 4b)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- 7.8 Realtime ---------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.infracoes;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.propostas_pauta;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.eventos;
  exception when duplicate_object then null; end;
end $$;

-- 7.9 Limpeza de módulos removidos --------------------------------------------
--    Funcionalidades descontinuadas do app: SOS, acionamento de portão, vagas
--    de visitante e regras/informes (substituídas pelo regimento interno, que
--    usa a tabela public.documentos com categoria 'regimento_interno'). Os
--    drops abaixo são idempotentes (IF EXISTS) para que colar este arquivo no
--    Supabase também limpe uma base já provisionada, não só evite recriar
--    essas estruturas.
drop table if exists public.alertas_sos cascade;
drop table if exists public.acessos_portao cascade;
drop table if exists public.regras cascade;
alter table public.condominios drop column if exists total_vagas_visitante;

-- Fim do setup.
