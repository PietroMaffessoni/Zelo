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
