-- ==========================================================================
-- 0013 — SINDICO VE O NOME DE QUEM PEDE ACESSO
-- ==========================================================================
--
-- A fila de "Pedidos de acesso pendentes" mostrava so a unidade: o nome vinha
-- vazio e a tela caia no rotulo generico "Morador". O sindico aprovava sem
-- saber quem estava entrando.
--
-- A causa e a `profiles_select`: ela libera o perfil de quem COMPARTILHA
-- condominio, e `compartilha_condominio` exige vinculo 'ativo' dos dois lados.
-- Quem acabou de pedir acesso ainda esta 'pendente' — entao, para o sindico, o
-- perfil dele simplesmente nao existia.
--
-- A correcao nao afrouxa `compartilha_condominio` (ela vale para todos os
-- moradores, e morador nenhum precisa ver quem ainda nem foi aceito). E uma
-- segunda politica, estreita: so o GESTOR, so do condominio em que ele e gestor,
-- e so enquanto o pedido estiver pendente. Recusado o pedido, a linha some e a
-- leitura acaba junto. O contato (telefone/e-mail) continua fora: mora em
-- `perfis_contato`, com RLS propria, e nao muda aqui.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

create or replace function public.pediu_acesso_a_minha_gestao(outro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.memberships pedido
    where pedido.user_id = outro
      and pedido.status = 'pendente'
      and public.is_gestor(pedido.condominio_id)
  );
$$;

revoke execute on function public.pediu_acesso_a_minha_gestao(uuid) from public, anon;
grant execute on function public.pediu_acesso_a_minha_gestao(uuid) to authenticated;

drop policy if exists profiles_select_pedido on public.profiles;
create policy profiles_select_pedido on public.profiles for select to authenticated
  using (public.pediu_acesso_a_minha_gestao(id));
