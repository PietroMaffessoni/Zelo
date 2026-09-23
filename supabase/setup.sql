-- ============================================================================
-- ARQUIVO GERADO — NÃO EDITE
-- ============================================================================
--
-- Concatenação de supabase/migrations, na ordem. Para mudar o esquema, crie
-- uma migration nova e rode `node scripts/gerar-setup.mjs`. Ver
-- supabase/README.md.
--
-- Migrations incluídas (9):
--   0001_base.sql
--   0002_conta_exclusao_e_senha.sql
--   0003_privacidade_dados_pessoais.sql
--   0004_codigos_de_equipe.sql
--   0005_paginacao.sql
--   0006_trilha_de_auditoria.sql
--   0007_retencao_lgpd.sql
--   0008_agendamento_expurgo.sql
--   0009_push_fila.sql

-- ==========================================================================
-- 0001 — BASE
-- ==========================================================================
--
-- Estado do banco antes da auditoria de setembro de 2026: tabelas, funcoes
-- auxiliares, RPCs de onboarding, RLS, storage, realtime e os modulos de
-- agenda, manutencao, infracoes, propostas e "Caminho A".
--
-- Vem tudo junto de proposito. Esse historico nunca foi versionado — ele
-- existia como um arquivo unico que era reeditado a cada mudanca —, e
-- inventar uma sequencia de migrations que nunca aconteceu seria pior que
-- admitir o ponto de partida. Daqui para frente cada mudanca tem a sua.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

 -- ============================================================================
--  Zelo — Setup completo do banco de dados (Supabase / PostgreSQL)
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

-- A policy de update de comunicados é gestor-only, mas não impede trocar o autor_id
-- para outro perfil — reatribuindo a autoria de um post. Nunca é uma operação
-- legítima, então trava geral via trigger.
create or replace function public.proteger_autor_id()
returns trigger language plpgsql as $$
begin
  if new.autor_id is distinct from old.autor_id then
    raise exception 'Não é permitido reatribuir a autoria deste registro';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comunicados_protect_autor on public.comunicados;
create trigger trg_comunicados_protect_autor before update on public.comunicados
  for each row execute function public.proteger_autor_id();

-- chamados_update deixa autor OU gestor editar qualquer coluna — na prática o autor
-- podia mudar responsavel_id/prioridade (decisão de gestão) e reatribuir a própria
-- autoria. O autor segue livre para editar título/descrição/categoria/fotos; o resto
-- (responsavel, prioridade, autoria) passa a ser gestor-only.
create or replace function public.proteger_chamado_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_gestor(new.condominio_id) then
    return new;
  end if;
  if new.autor_id is distinct from old.autor_id
     or new.responsavel_id is distinct from old.responsavel_id
     or new.prioridade is distinct from old.prioridade then
    raise exception 'Sem permissão para alterar autoria, responsável ou prioridade do chamado';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chamados_protect_update on public.chamados;
create trigger trg_chamados_protect_update before update on public.chamados
  for each row execute function public.proteger_chamado_update();

drop trigger if exists trg_solic_updated on public.solicitacoes;
create trigger trg_solic_updated before update on public.solicitacoes
  for each row execute function public.touch_updated_at();

-- Só o gestor responde (status/resposta); o morador só edita o texto e só
-- enquanto a solicitação segue aberta (evita "auto-responder" a própria solicitação).
create or replace function public.proteger_solicitacao_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_gestor(new.condominio_id) then
    return new;
  end if;
  if new.status is distinct from old.status or new.resposta is distinct from old.resposta then
    raise exception 'Sem permissão para alterar status/resposta da solicitação';
  end if;
  if old.status <> 'aberta' then
    raise exception 'Esta solicitação já está em análise ou concluída e não pode mais ser editada';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_solic_before_update on public.solicitacoes;
create trigger trg_solic_before_update before update on public.solicitacoes
  for each row execute function public.proteger_solicitacao_update();

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

-- O cliente não é confiável para decidir se uma reserva precisa de aprovação nem
-- quanto ela custa: essas informações são sempre derivadas da própria área comum.
create or replace function public.derivar_reserva_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_area public.areas_comuns;
begin
  select * into v_area from public.areas_comuns where id = new.area_id;
  if v_area.id is null then raise exception 'Área comum inválida'; end if;
  new.status := case when v_area.requer_aprovacao then 'pendente' else 'aprovada' end;
  new.taxa_cobrada := case when v_area.taxa_uso > 0 then v_area.taxa_uso else null end;
  new.lancamento_id := null;
  return new;
end;
$$;

drop trigger if exists trg_reservas_before_insert on public.reservas;
create trigger trg_reservas_before_insert before insert on public.reservas
  for each row execute function public.derivar_reserva_insert();

-- Depois de criada, só o gestor mexe em status/taxa/lançamento (aprovar, rejeitar,
-- gerar boleto); o morador dono da reserva só pode cancelá-la.
create or replace function public.proteger_reserva_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_gestor(new.condominio_id) then
    return new;
  end if;
  if new.taxa_cobrada is distinct from old.taxa_cobrada
     or new.lancamento_id is distinct from old.lancamento_id then
    raise exception 'Sem permissão para alterar a taxa ou o lançamento da reserva';
  end if;
  if new.status is distinct from old.status and new.status <> 'cancelada' then
    raise exception 'Sem permissão para alterar o status da reserva';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reservas_before_update on public.reservas;
create trigger trg_reservas_before_update before update on public.reservas
  for each row execute function public.proteger_reserva_update();

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
    -- 10 chars hex (16^10 combinações) — bem mais difícil de adivinhar/força-bruta que os 6 chars antigos.
    v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
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

  -- Entra como 'pendente': o morador só reivindica a unidade/vínculo, quem confirma
  -- que ele de fato mora ali é o síndico (tela de Moradores e unidades aprova/recusa).
  insert into public.memberships (condominio_id, user_id, unidade_id, papel, status, vinculo)
  values (v_cond.id, (select auth.uid()), v_unidade_id, 'morador', 'pendente', v_vinculo)
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
    v_codigo := 'P' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.condominios where codigo_portaria = v_codigo);
  end loop;
  update public.condominios set codigo_portaria = v_codigo where id = p_cond;
  return v_codigo;
end;
$$;

-- Os códigos (convite/portaria) são segredos que dão acesso ao condomínio — a coluna
-- não é mais exposta pelo select geral de condominios (ver seção 4), só por esta RPC,
-- restrita a quem já é gestor daquele condomínio.
-- DROP antes do CREATE: o Postgres não troca as colunas OUT via replace, e a seção 8
-- redefine esta função com uma coluna a mais (ver obter_codigos_condominio mais abaixo).
drop function if exists public.obter_codigos_condominio(uuid);
create or replace function public.obter_codigos_condominio(p_cond uuid)
returns table (codigo_convite text, codigo_portaria text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_gestor(p_cond) then raise exception 'Sem permissão'; end if;
  return query select c.codigo_convite, c.codigo_portaria from public.condominios c where c.id = p_cond;
end;
$$;
grant execute on function public.obter_codigos_condominio(uuid) to authenticated;

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
-- 'comunicados_write' cobria insert/update/delete sem exigir autor_id = auth.uid(),
-- então um gestor podia publicar um comunicado assinado por outro perfil. Insert
-- agora exige autoria própria; update/delete seguem gestor-only (edição de conteúdo
-- por qualquer gestor é esperado — o que fica travado é reatribuir a autoria, via
-- o trigger trg_comunicados_protect_autor abaixo).
drop policy if exists comunicados_write on public.comunicados;
drop policy if exists comunicados_insert on public.comunicados;
create policy comunicados_insert on public.comunicados for insert to authenticated
  with check (autor_id = (select auth.uid()) and public.is_gestor(condominio_id));
drop policy if exists comunicados_update on public.comunicados;
create policy comunicados_update on public.comunicados for update to authenticated
  using (public.is_gestor(condominio_id)) with check (public.is_gestor(condominio_id));
drop policy if exists comunicados_delete on public.comunicados;
create policy comunicados_delete on public.comunicados for delete to authenticated
  using (public.is_gestor(condominio_id));

-- comunicado_leituras
drop policy if exists leituras_select on public.comunicado_leituras;
create policy leituras_select on public.comunicado_leituras for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists leituras_insert on public.comunicado_leituras;
create policy leituras_insert on public.comunicado_leituras for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.comunicados c where c.id = comunicado_id and public.is_member(c.condominio_id)
    )
  );

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
        and m.condominio_id = assembleia_votos.condominio_id
    ) and exists (
      select 1 from public.assembleia_pautas p
      where p.id = pauta_id and p.permite_votacao and not p.encerrada
        and p.condominio_id = assembleia_votos.condominio_id
    )
  );

-- push_tokens (cada usuário só vê/gerencia os próprios tokens; condominio_id, quando
-- informado, precisa ser de fato um condomínio do qual o usuário é membro)
drop policy if exists push_tokens_all on public.push_tokens;
create policy push_tokens_all on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid()) and (condominio_id is null or public.is_member(condominio_id))
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
-- 5. STORAGE (fotos de chamados, achados, portaria e avatares)
-- ----------------------------------------------------------------------------

-- 'chamados'/'achados'/'portaria' eram buckets públicos e sem isolamento por
-- condomínio (qualquer autenticado lia/escrevia na raiz do bucket) — fotos de
-- encomendas/portaria são dado sensível. Agora seguem o mesmo padrão de
-- 'financeiro'/'documentos': privados, path "{condominio_id}/arquivo", lidos
-- via signed URL (ver urlAssinada em storage.ts). 'avatars' continua público
-- (foto de perfil não é sensível), mas só o dono sobe no seu próprio path.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('chamados', 'chamados', false), ('achados', 'achados', false), ('portaria', 'portaria', false)
on conflict (id) do nothing;

-- update explícito: garante que colar este script numa base já provisionada também
-- torna os buckets privados e aplica os limites abaixo (insert...on conflict do nothing
-- não atualiza uma linha já existente).
update storage.buckets set public = false where id in ('chamados', 'achados', 'portaria');

drop policy if exists fotos_leitura on storage.objects;
drop policy if exists fotos_upload on storage.objects;

-- avatars: leitura pública, upload só no próprio path "{auth.uid()}/arquivo".
drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- chamados/achados: fotos privadas por condomínio; leitura e upload para membros.
drop policy if exists chamados_achados_storage_select on storage.objects;
create policy chamados_achados_storage_select on storage.objects for select to authenticated
  using (bucket_id in ('chamados', 'achados') and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists chamados_achados_storage_insert on storage.objects;
create policy chamados_achados_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('chamados', 'achados') and public.is_member(((storage.foldername(name))[1])::uuid));

-- portaria: fotos de encomendas — leitura para membros do condomínio, upload só gestor/portaria.
drop policy if exists portaria_storage_select on storage.objects;
create policy portaria_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'portaria' and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists portaria_storage_insert on storage.objects;
create policy portaria_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portaria' and (
      public.is_gestor(((storage.foldername(name))[1])::uuid) or public.is_porteiro(((storage.foldername(name))[1])::uuid)
    )
  );

-- update/delete do dono do arquivo — restrito aos buckets de fotos (não vale para
-- 'financeiro'/'documentos', que não têm policy de update/delete de propósito).
drop policy if exists fotos_update on storage.objects;
create policy fotos_update on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'chamados', 'achados', 'portaria') and owner = (select auth.uid()))
  with check (bucket_id in ('avatars', 'chamados', 'achados', 'portaria') and owner = (select auth.uid()));

drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'chamados', 'achados', 'portaria') and owner = (select auth.uid()));

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

-- Limite de tamanho/tipo por bucket — antes nenhum bucket tinha limite, permitindo
-- encher o storage com qualquer arquivo. Fotos: 5 MB, JPEG/PNG/WebP. PDFs
-- (financeiro/documentos): 20 MB, PDF ou imagem (comprovante pode ser foto). Fica
-- depois de criados todos os buckets acima (senão o update não acha as linhas ainda
-- não inseridas na primeira execução do script).
update storage.buckets set file_size_limit = 5 * 1024 * 1024, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id in ('avatars', 'chamados', 'achados', 'portaria');
update storage.buckets set file_size_limit = 20 * 1024 * 1024, allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  where id in ('financeiro', 'documentos');

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
-- A lista precisa incluir TODOS os papéis já criados por seções posteriores
-- (o 'zelador' da 8.2): num banco que já tem zelador, recriar o check só com os
-- papéis daqui derruba a rodada inteira do setup antes de chegar na 8.2.
alter table public.memberships drop constraint if exists memberships_papel_check;
alter table public.memberships add constraint memberships_papel_check
  check (papel in ('morador','sindico','admin','porteiro','conselheiro','zelador'));

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
  -- Texto livre: o síndico escreve a categoria ao cadastrar (ver 8.7).
  categoria text not null default '',
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
  -- Texto livre: o síndico escreve o motivo ao aplicar (ver 8.6).
  motivo text not null default '',
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

-- 7.10 codigo_convite/codigo_portaria não fazem parte do select geral -----------
-- RLS é por linha, não por coluna: qualquer membro que enxerga a linha do
-- condomínio (policy condominios_select) enxergaria também essas duas colunas,
-- que na prática são "senhas" (dão acesso de morador/porteiro). Por isso o
-- privilégio de tabela é revogado e reconcedido só nas colunas não sensíveis;
-- os códigos passam a ser lidos exclusivamente pela RPC obter_codigos_condominio
-- (seção 3), que confere is_gestor antes de devolver algo. Precisa ficar depois
-- dos "grant select on all tables" (4b e 7.7) para não ser sobrescrito por eles.
revoke select on public.condominios from authenticated;
grant select (id, nome, cidade, uf, endereco, cnpj, criado_por, created_at) on public.condominios to authenticated;

-- ============================================================================
-- 8. MÓDULO "CAMINHO A" — substituir o Imodolo, conviver com a administradora
--    Ficha cadastral do morador (CPF/RG/e-mail), papel "zelador", agenda de
--    manutenção turbinada (checklist), inadimplência e envio de contas para a
--    administradora pagar. Bloco autocontido e idempotente — roda junto do resto.
-- ============================================================================

-- 8.1 Ficha cadastral do morador --------------------------------------------
-- CPF/RG são PII sensível: ficam em memberships (não em profiles), porque a
-- policy memberships_select só devolve a linha para o próprio usuário OU para o
-- gestor daquele condomínio — exatamente a visibilidade que a ficha exige. Em
-- profiles (legível por qualquer co-morador) o CPF ficaria exposto a vizinhos.
alter table public.memberships add column if not exists cpf text;
alter table public.memberships add column if not exists rg text;

-- E-mail no perfil: o síndico pediu o e-mail do morador "sempre à mão".
--
-- ESTE BLOCO FICOU HISTÓRICO. O e-mail chegou a morar em `profiles`, mas essa
-- tabela é legível por qualquer co-morador (o nome do autor aparece em catorze
-- consultas) — e com o e-mail dentro dela, um select da tabela devolvia a agenda
-- do prédio inteiro. O dado passou para `perfis_contato`, na seção 10.2, com RLS
-- própria. O `handle_new_user` definitivo também está lá.
--
-- Nada a fazer aqui: recriar a coluna só para a 10.2 derrubá-la de novo a cada
-- execução deixaria o script batendo em si mesmo.

-- 8.2 Papel "zelador" (equipe operacional: manutenção + chamados) -------------
-- Login individual (cada zelador com seu e-mail) via código de equipe próprio,
-- no mesmo molde do porteiro. Enxerga/opera manutenção e chamados; não é gestão.
alter table public.condominios add column if not exists codigo_zelador text unique;

alter table public.memberships drop constraint if exists memberships_papel_check;
alter table public.memberships add constraint memberships_papel_check
  check (papel in ('morador','sindico','admin','porteiro','conselheiro','zelador'));

create or replace function public.is_zelador(cond uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.condominio_id = cond and m.user_id = (select auth.uid())
      and m.status = 'ativo' and m.papel = 'zelador'
  );
$$;
grant execute on function public.is_zelador(uuid) to authenticated;

create or replace function public.gerar_codigo_zelador(p_cond uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_codigo text;
begin
  if not public.is_gestor(p_cond) then raise exception 'Sem permissão'; end if;
  loop
    v_codigo := 'Z' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.condominios where codigo_zelador = v_codigo);
  end loop;
  update public.condominios set codigo_zelador = v_codigo where id = p_cond;
  return v_codigo;
end;
$$;
grant execute on function public.gerar_codigo_zelador(uuid) to authenticated;

create or replace function public.entrar_como_zelador(p_codigo text)
returns public.memberships
language plpgsql security definer set search_path = public as $$
declare
  v_cond public.condominios;
  v_membership public.memberships;
begin
  if (select auth.uid()) is null then raise exception 'Não autenticado'; end if;
  select * into v_cond from public.condominios where codigo_zelador = upper(trim(p_codigo));
  if v_cond.id is null then raise exception 'Código de zelador inválido'; end if;

  select * into v_membership from public.memberships
    where condominio_id = v_cond.id and user_id = (select auth.uid());
  if v_membership.id is not null then
    update public.memberships set papel = 'zelador', status = 'ativo'
      where id = v_membership.id returning * into v_membership;
  else
    insert into public.memberships (condominio_id, user_id, papel, status)
    values (v_cond.id, (select auth.uid()), 'zelador', 'ativo')
    returning * into v_membership;
  end if;
  return v_membership;
end;
$$;
grant execute on function public.entrar_como_zelador(text) to authenticated;

-- Passa a devolver também o código do zelador. O tipo de retorno mudou, então
-- precisa de DROP antes do CREATE (o Postgres não troca colunas OUT via replace).
drop function if exists public.obter_codigos_condominio(uuid);
create or replace function public.obter_codigos_condominio(p_cond uuid)
returns table (codigo_convite text, codigo_portaria text, codigo_zelador text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_gestor(p_cond) then raise exception 'Sem permissão'; end if;
  return query select c.codigo_convite, c.codigo_portaria, c.codigo_zelador
    from public.condominios c where c.id = p_cond;
end;
$$;
grant execute on function public.obter_codigos_condominio(uuid) to authenticated;

-- Zelador enxerga e registra manutenção (equipamentos: só leitura; manutenções:
-- registra). Redefine as policies da seção 7.6 incluindo is_zelador.
drop policy if exists equipamentos_select on public.equipamentos;
create policy equipamentos_select on public.equipamentos for select to authenticated
  using (public.is_conselho(condominio_id) or public.is_zelador(condominio_id));

drop policy if exists manutencoes_select on public.manutencoes;
create policy manutencoes_select on public.manutencoes for select to authenticated
  using (public.is_conselho(condominio_id) or public.is_zelador(condominio_id));
drop policy if exists manutencoes_write on public.manutencoes;
create policy manutencoes_write on public.manutencoes for all to authenticated
  using (public.is_gestor(condominio_id) or public.is_zelador(condominio_id))
  with check (public.is_gestor(condominio_id) or public.is_zelador(condominio_id));

-- Zelador é equipe operacional dos chamados: vê todos, comenta e muda status.
-- Redefine as policies/trigger de chamados (seções 2 e 4) incluindo is_zelador.
drop policy if exists chamados_select on public.chamados;
create policy chamados_select on public.chamados for select to authenticated
  using (public.is_member(condominio_id) and (autor_id = (select auth.uid()) or public.is_gestor(condominio_id) or public.is_zelador(condominio_id)));
drop policy if exists chamados_update on public.chamados;
create policy chamados_update on public.chamados for update to authenticated
  using (autor_id = (select auth.uid()) or public.is_gestor(condominio_id) or public.is_zelador(condominio_id))
  with check (autor_id = (select auth.uid()) or public.is_gestor(condominio_id) or public.is_zelador(condominio_id));

create or replace function public.proteger_chamado_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_gestor(new.condominio_id) or public.is_zelador(new.condominio_id) then
    return new;
  end if;
  if new.autor_id is distinct from old.autor_id
     or new.responsavel_id is distinct from old.responsavel_id
     or new.prioridade is distinct from old.prioridade then
    raise exception 'Sem permissão para alterar autoria, responsável ou prioridade do chamado';
  end if;
  return new;
end;
$$;

drop policy if exists eventos_select on public.chamado_eventos;
create policy eventos_select on public.chamado_eventos for select to authenticated
  using (exists (
    select 1 from public.chamados c
    where c.id = chamado_id and (c.autor_id = (select auth.uid()) or public.is_gestor(c.condominio_id) or public.is_zelador(c.condominio_id))
  ));
drop policy if exists eventos_insert on public.chamado_eventos;
create policy eventos_insert on public.chamado_eventos for insert to authenticated
  with check (autor_id = (select auth.uid()) and exists (
    select 1 from public.chamados c
    where c.id = chamado_id and (c.autor_id = (select auth.uid()) or public.is_gestor(c.condominio_id) or public.is_zelador(c.condominio_id))
  ));

-- 8.3 Agenda de manutenção — checklist por equipamento -----------------------
-- Itens verificados na manutenção (ex.: extintores, caixa d'água): lista de
-- { item, ok, observacao } no mesmo formato das vistorias de reserva.
alter table public.manutencoes add column if not exists itens jsonb not null default '[]';

-- 8.4 Caminho A — administradora e envio de contas ---------------------------
-- O condomínio segue com uma administradora que efetua os pagamentos; o Zelo
-- registra a despesa e marca quando ela foi enviada para a administradora pagar.
alter table public.condominios add column if not exists administradora text;
alter table public.condominios add column if not exists administradora_contato text;

-- Essas duas colunas NÃO são segredo (ao contrário dos códigos de acesso), então
-- entram no grant de colunas de condominios (a seção 7.10 revogou tudo e concedeu
-- só as não sensíveis). Precisa vir depois do 7.10 para não ser sobrescrito.
grant select (administradora, administradora_contato) on public.condominios to authenticated;

-- Marca de "enviado para a administradora pagar" numa despesa (null = ainda não).
-- As colunas novas desta seção caem em tabelas que já têm o grant de tabela da
-- seção 4b/7.7 (memberships, profiles, manutencoes, lancamentos) — não é preciso
-- (nem seguro) reemitir "grant on all tables" aqui: isso reexporia as colunas
-- de código secreto de condominios que a seção 7.10 acabou de proteger.
alter table public.lancamentos_financeiros add column if not exists enviado_administradora_em timestamptz;

-- 8.5 Telefone no cadastro ----------------------------------------------------
-- A tela de criar conta coleta telefone (contato para porteiro/síndico). Vem via
-- options.data no signUp -> raw_user_meta_data.
--
-- ESTE BLOCO FICOU HISTÓRICO pelo mesmo motivo do 8.1: telefone e e-mail saíram
-- de `profiles` e vivem em `perfis_contato` (seção 10.2), que é quem define o
-- `handle_new_user` em vigor.

-- 8.6 Motivo da infração vira texto livre -------------------------------------
-- Antes o motivo era uma lista fixa (barulho, area_comum, ...) escolhida em
-- chips. O síndico passou a escrever o motivo com as próprias palavras, tanto
-- na advertência quanto na multa — então o check sai e a coluna fica texto puro.
alter table public.infracoes drop constraint if exists infracoes_motivo_check;
alter table public.infracoes alter column motivo set default '';

-- Converte os motivos antigos (slug) no texto que a tela mostrava, para as
-- infrações já aplicadas não aparecerem como "area_comum" na lista.
update public.infracoes set motivo = case motivo
  when 'barulho' then 'Barulho'
  when 'area_comum' then 'Uso de área comum'
  when 'animais' then 'Animais'
  when 'obras' then 'Obras'
  when 'estacionamento' then 'Estacionamento'
  when 'lixo' then 'Descarte de lixo'
  when 'seguranca' then 'Segurança'
  when 'outros' then 'Outros'
end
where motivo in ('barulho','area_comum','animais','obras','estacionamento','lixo','seguranca','outros');

-- 8.7 Categoria do equipamento vira texto livre -------------------------------
-- Mesma história do motivo da infração (8.6): a categoria era uma lista fixa em
-- chips e passou a ser escrita pelo síndico no cadastro. O app ainda reconhece
-- os termos clássicos ("Elevador", "Incêndio") para dar ícone e checklist.
alter table public.equipamentos drop constraint if exists equipamentos_categoria_check;
alter table public.equipamentos alter column categoria set default '';

-- Converte as categorias antigas (slug) no texto que a tela mostrava.
update public.equipamentos set categoria = case categoria
  when 'elevador' then 'Elevador'
  when 'bomba' then 'Bomba d''água'
  when 'gerador' then 'Gerador'
  when 'portao' then 'Portão'
  when 'incendio' then 'Combate a incêndio'
  when 'piscina' then 'Piscina'
  when 'jardim' then 'Jardim'
  when 'eletrica' then 'Elétrica'
  when 'hidraulica' then 'Hidráulica'
  when 'outros' then 'Outros'
end
where categoria in ('elevador','bomba','gerador','portao','incendio','piscina','jardim','eletrica','hidraulica','outros');

-- 8.8 Documento sem arquivo ---------------------------------------------------
-- Nem todo documento precisa de PDF: avisos e regras curtas se resolvem só com
-- título e descrição. O anexo passa a ser opcional (null = documento de texto).
alter table public.documentos alter column arquivo_path drop not null;

-- ==========================================================================
-- 0002 — CONTA: EXCLUSAO E SENHA
-- ==========================================================================
--
-- Exclusao de conta (App Store 5.1.1(v) e LGPD art. 18, VI) com a regra de
-- nao deixar condominio sem sindico.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 9. CONTA DO USUÁRIO (exclusão e senha)
-- ============================================================================

-- 9.1 Exclusão de conta -------------------------------------------------------
--
-- Obrigatória pela App Store (guideline 5.1.1(v)) e pela LGPD (art. 18, VI —
-- direito à eliminação). Não basta desativar: os dados pessoais saem.
--
-- O apagamento em si é o cascade que já existe no schema: profiles.id referencia
-- auth.users(id) on delete cascade, e 12 tabelas referenciam profiles em cascade.
-- O que esta função acrescenta é a REGRA DE NEGÓCIO que o cascade não sabe: um
-- condomínio não pode ficar sem síndico. Se o usuário for o único gestor ativo de
-- algum condomínio, a exclusão é recusada com a lista dos condomínios pendentes,
-- e ele precisa promover outro síndico antes — do contrário o condomínio inteiro
-- (moradores, financeiro, documentos) ficaria sem ninguém que pudesse administrá-lo.
--
-- O que NÃO é apagado, de propósito: registros em que a autoria vira `null`
-- (on delete set null) — comunicados publicados, lançamentos financeiros, atas.
-- São atos da administração do condomínio, não dados pessoais do indivíduo, e
-- apagá-los destruiria a prestação de contas de terceiros. É a base legal de
-- "cumprimento de obrigação legal/regulatória" da LGPD (art. 16, I).
create or replace function public.excluir_minha_conta()
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := (select auth.uid());
  v_orfaos text;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;

  select string_agg(c.nome, ', ' order by c.nome) into v_orfaos
  from public.memberships m
  join public.condominios c on c.id = m.condominio_id
  where m.user_id = v_uid
    and m.status = 'ativo'
    and m.papel in ('sindico', 'admin')
    and not exists (
      select 1 from public.memberships outro
      where outro.condominio_id = m.condominio_id
        and outro.user_id <> v_uid
        and outro.status = 'ativo'
        and outro.papel in ('sindico', 'admin')
    );

  if v_orfaos is not null then
    raise exception 'Você é o único síndico de: %. Promova outro síndico antes de excluir a conta.', v_orfaos
      using errcode = 'P0001';
  end if;

  -- Cascade faz o resto (profiles e tudo que referencia profiles em cascade).
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;

-- 9.2 Retenção de dados operacionais (LGPD art. 15/16) ------------------------
-- Ver seção 10 para a rotina de expurgo.

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

-- ==========================================================================
-- 0006 — TRILHA DE AUDITORIA
-- ==========================================================================
--
-- Registro de quem fez o que nas tabelas em que uma alteracao muda dinheiro,
-- acesso ou responsabilidade.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 13. TRILHA DE AUDITORIA
-- ============================================================================
--
-- O app não registrava nada sobre QUEM fez o quê. Quem aprovou aquela reserva?
-- Quem marcou o boleto como pago? Quem removeu o morador da unidade? Quem gerou
-- o código de portaria que vazou? Nada disso ficava. Num produto que mexe com
-- dinheiro de terceiros e é operado por um síndico que responde civil e
-- criminalmente pela administração, essa é a lacuna mais cara: na hora da
-- prestação de contas não há lastro de nada.
--
-- O QUE ENTRA: as tabelas em que uma alteração muda dinheiro, acesso ou
-- responsabilidade. Chamado e comunicado ficam de fora — mudar o texto de um
-- aviso não é ato de gestão com consequência.
--
-- O QUE NÃO ENTRA, DE PROPÓSITO: o conteúdo das linhas. Um log que copiasse a
-- linha inteira guardaria CPF, RG e telefone em mais um lugar, com mais uma
-- superfície de vazamento — o oposto do que a seção 10 fez. Ficam registrados os
-- NOMES dos campos alterados e, só para uma lista curta de campos de decisão
-- (status, papel, valor...), os valores antes e depois. É o que a prestação de
-- contas precisa e o mínimo que basta.

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  -- Quem agiu. `set null` e não `cascade`: se a conta for excluída, o registro do
  -- ato permanece — é dele que depende a prestação de contas do condomínio.
  ator_id uuid references public.profiles(id) on delete set null,
  -- Nome no momento do ato: depois de o perfil sumir, "alguém" não presta contas.
  ator_nome text,
  acao text not null check (acao in ('criou', 'alterou', 'removeu')),
  entidade text not null,
  entidade_id uuid,
  /** Campos alterados e, para os de decisão, o antes e o depois. */
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_auditoria_cond on public.auditoria(condominio_id, created_at desc);
create index if not exists idx_auditoria_entidade on public.auditoria(entidade, entidade_id);

alter table public.auditoria enable row level security;

-- Leitura: síndico e conselho fiscal — é a eles que a prestação de contas serve.
drop policy if exists auditoria_select on public.auditoria;
create policy auditoria_select on public.auditoria for select to authenticated
  using (public.is_conselho(condominio_id));

-- Ninguém escreve pela API: só o gatilho, que roda como dono. Um log que o
-- próprio ator pudesse editar não seria log.
drop policy if exists auditoria_insert on public.auditoria;
drop policy if exists auditoria_update on public.auditoria;
drop policy if exists auditoria_delete on public.auditoria;
revoke insert, update, delete on public.auditoria from authenticated;

/*
  Campos cujo VALOR é registrado, além do nome.

  São os que representam uma decisão de gestão — o que alguém precisa poder
  contestar depois. Fora desta lista, guarda-se apenas que o campo mudou.
*/
create or replace function public.campos_auditaveis()
returns text[] language sql immutable as $$
  select array[
    'status', 'papel', 'vinculo', 'valor', 'pago_em', 'vencimento',
    'tipo', 'fixado', 'encerrada', 'ativo', 'enviado_administradora_em'
  ]
$$;

create or replace function public.registrar_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cond uuid;
  v_linha jsonb;
  v_anterior jsonb;
  v_detalhes jsonb := '{}'::jsonb;
  v_campo text;
  v_uid uuid := (select auth.uid());
  v_nome text;
  v_acao text;
begin
  if TG_OP = 'DELETE' then
    v_linha := to_jsonb(OLD);
    v_acao := 'removeu';
  else
    v_linha := to_jsonb(NEW);
    v_acao := case when TG_OP = 'INSERT' then 'criou' else 'alterou' end;
  end if;

  v_cond := (v_linha ->> 'condominio_id')::uuid;
  if v_cond is null then return coalesce(NEW, OLD); end if;

  if TG_OP = 'UPDATE' then
    v_anterior := to_jsonb(OLD);
    for v_campo in select jsonb_object_keys(v_linha) loop
      if v_linha -> v_campo is distinct from v_anterior -> v_campo then
        if v_campo = any(public.campos_auditaveis()) then
          v_detalhes := v_detalhes || jsonb_build_object(
            v_campo, jsonb_build_object('de', v_anterior -> v_campo, 'para', v_linha -> v_campo)
          );
        else
          -- Só o nome: o valor pode ser dado pessoal.
          v_detalhes := v_detalhes || jsonb_build_object(v_campo, 'alterado');
        end if;
      end if;
    end loop;

    -- Nada de relevante mudou (só updated_at, por exemplo): não polui o log.
    if v_detalhes = '{}'::jsonb then return NEW; end if;
  end if;

  select p.nome_completo into v_nome from public.profiles p where p.id = v_uid;

  insert into public.auditoria (condominio_id, ator_id, ator_nome, acao, entidade, entidade_id, detalhes)
  values (v_cond, v_uid, v_nome, v_acao, TG_TABLE_NAME, (v_linha ->> 'id')::uuid, v_detalhes);

  return coalesce(NEW, OLD);
end;
$$;

-- Tabelas auditadas: dinheiro, acesso e responsabilidade.
do $$
declare t text;
begin
  foreach t in array array[
    'lancamentos_financeiros',  -- dinheiro
    'memberships',              -- quem é morador, síndico, porteiro
    'reservas',                 -- aprovação e cancelamento
    'infracoes',                -- advertência e multa
    'documentos',               -- publicação e remoção de ata/convenção
    'areas_comuns',             -- taxa de uso e disponibilidade
    'assembleias'               -- convocação e encerramento
  ] loop
    execute format('drop trigger if exists trg_auditoria on public.%I', t);
    execute format(
      'create trigger trg_auditoria after insert or update or delete on public.%I
         for each row execute function public.registrar_auditoria()', t);
  end loop;
end $$;

-- ==========================================================================
-- 0007 — RETENCAO DE DADOS (LGPD)
-- ==========================================================================
--
-- Prazos de retencao dos dados de portaria e a rotina de expurgo.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 14. RETENÇÃO DE DADOS OPERACIONAIS (LGPD art. 15 e 16)
-- ============================================================================
--
-- Registro de visitante, foto de encomenda e foto de chamado ficavam para
-- sempre. A LGPD manda eliminar o dado pessoal quando acaba a finalidade que
-- justificou coletá-lo (art. 15, I) — e a finalidade de "quem entrou no prédio
-- na terça-feira" se esgota em semanas, não em anos. Guardar indefinidamente
-- não é só irregular: é acumular passivo, porque cada mês a mais é mais gente
-- exposta se a base vazar.
--
-- Os prazos abaixo seguem o que o mercado pratica em portaria (30 a 90 dias) e
-- ficam configuráveis por condomínio, porque a convenção de cada um pode exigir
-- diferente. Zero = não expurgar, para quem tiver obrigação de guardar mais.
--
-- O QUE NÃO EXPIRA: nada que seja ato de gestão ou prova de prestação de contas
-- — lançamento financeiro, assembleia, ata, infração, auditoria. Esses têm base
-- legal própria (art. 16, I) e apagá-los prejudicaria o condomínio inteiro.

alter table public.condominios
  add column if not exists retencao_visitantes_dias int not null default 90,
  add column if not exists retencao_encomendas_dias int not null default 180;

comment on column public.condominios.retencao_visitantes_dias is
  'Dias para manter registros de entrada de visitante. 0 = nunca expurgar.';
comment on column public.condominios.retencao_encomendas_dias is
  'Dias para manter encomendas já retiradas. 0 = nunca expurgar.';

/*
  Expurgo. Idempotente e seguro para rodar quantas vezes quiser.

  Só toca no que já cumpriu sua função: visita que já aconteceu e encomenda que
  já foi retirada. Encomenda aguardando retirada nunca é apagada, por mais
  antiga que seja — ela ainda está fisicamente na portaria.

  Agendamento: `select cron.schedule('zelo-expurgo', '0 4 * * *',
  $$select public.expurgar_dados_antigos()$$);` com a extensão pg_cron ativa, ou
  uma chamada diária por Edge Function. Sem agendador, a função existe e pode
  ser chamada à mão — o que já é melhor do que não haver política nenhuma.
*/
create or replace function public.expurgar_dados_antigos()
returns table (tabela text, removidos bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_visitantes bigint := 0;
  v_registros bigint := 0;
  v_encomendas bigint := 0;
begin
  with apagados as (
    delete from public.registros_visitantes r
    using public.condominios c
    where c.id = r.condominio_id
      and c.retencao_visitantes_dias > 0
      and r.entrada < now() - make_interval(days => c.retencao_visitantes_dias)
    returning 1
  ) select count(*) into v_registros from apagados;

  -- Autorização vencida há mais tempo que a retenção: o visitante nem chegou a
  -- entrar, e o nome dele não tem por que continuar ali.
  with apagados as (
    delete from public.visitantes_autorizados v
    using public.condominios c
    where c.id = v.condominio_id
      and c.retencao_visitantes_dias > 0
      and coalesce(v.data_fim, v.data_inicio) < now() - make_interval(days => c.retencao_visitantes_dias)
    returning 1
  ) select count(*) into v_visitantes from apagados;

  with apagados as (
    delete from public.encomendas e
    using public.condominios c
    where c.id = e.condominio_id
      and c.retencao_encomendas_dias > 0
      and e.status = 'retirada'
      and e.created_at < now() - make_interval(days => c.retencao_encomendas_dias)
    returning 1
  ) select count(*) into v_encomendas from apagados;

  return query
    select 'registros_visitantes'::text, v_registros
    union all select 'visitantes_autorizados'::text, v_visitantes
    union all select 'encomendas'::text, v_encomendas;
end;
$$;

-- Só o serviço agenda o expurgo; nenhum usuário apaga em massa pela API.
revoke all on function public.expurgar_dados_antigos() from public, anon, authenticated;

-- ==========================================================================
-- 0008 — AGENDAMENTO DO EXPURGO
-- ==========================================================================
--
-- Poe a rotina de retencao da 0007 para rodar sozinha, todo dia, via pg_cron.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

-- 15. AGENDAMENTO DO EXPURGO (pg_cron)
-- ============================================================================
--
-- A 0007 criou `expurgar_dados_antigos()`, mas função que ninguém chama é
-- política de retenção no papel: o dado continua lá. O que transforma a regra
-- em fato é o agendador.
--
-- Por que um bloco guardado e não `create extension` direto: ativar extensão
-- exige privilégio de superusuário, que o SQL Editor tem mas uma migration
-- rodada pela CLI nem sempre tem. Ativar a extensão fica sendo um passo humano
-- de uma vez só (Dashboard → Database → Extensions → pg_cron); esta migration
-- apenas agenda, e se a extensão não estiver lá ela não quebra o resto do
-- setup — avisa e segue. Sem a guarda, reaplicar o setup.sql num projeto sem
-- pg_cron abortaria tudo que viesse depois.
--
-- Horário: 07:00 UTC = 04:00 em Brasília. De madrugada porque um DELETE em
-- massa pega lock nas linhas que remove, e às 4h não há portaria registrando
-- entrada nem morador consultando encomenda.

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice
      'pg_cron nao esta ativo: o expurgo LGPD NAO foi agendado. Ative em '
      'Database > Extensions e rode esta migration de novo.';
    return;
  end if;

  -- Desagenda antes de agendar para o horário poder mudar numa reaplicação.
  -- `cron.unschedule` estoura se o job não existe, daí o `if exists`.
  if exists (select 1 from cron.job where jobname = 'zelo-expurgo-diario') then
    perform cron.unschedule('zelo-expurgo-diario');
  end if;

  perform cron.schedule(
    'zelo-expurgo-diario',
    '0 7 * * *',
    $cron$select public.expurgar_dados_antigos()$cron$
  );

  raise notice 'Expurgo LGPD agendado para 07:00 UTC (04:00 Brasilia).';
end $$;

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

-- Fim do setup.
