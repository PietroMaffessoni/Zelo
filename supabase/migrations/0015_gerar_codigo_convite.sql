-- ==========================================================================
-- 0015 — GERAR UM NOVO CODIGO DE CONVITE
-- ==========================================================================
--
-- O codigo de convite nascia com o condominio e nunca mais mudava. Se ele
-- vazasse (print no grupo errado, ex-morador que guardou), qualquer um seguia
-- pedindo acesso com ele para sempre. Portaria e zeladoria ja podiam ser
-- trocados (0004); agora o convite tambem.
--
-- Mesmo formato do codigo criado em `criar_condominio`: 10 caracteres hex em
-- maiusculas. Sem validade: o convite e o caminho normal de entrada de
-- morador, e expirar sozinho travaria mudancas sem aviso ao sindico.
--
-- Pedidos ja feitos com o codigo antigo continuam na fila: o codigo so e
-- conferido no momento do pedido, nao na aprovacao.
--
-- Idempotente: pode ser reaplicada sem efeito colateral.

create or replace function public.gerar_codigo_convite(p_cond uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_codigo text;
begin
  if not public.is_gestor(p_cond) then raise exception 'Sem permissão'; end if;
  loop
    v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.condominios where codigo_convite = v_codigo);
  end loop;
  update public.condominios set codigo_convite = v_codigo where id = p_cond;
  return v_codigo;
end;
$$;

revoke execute on function public.gerar_codigo_convite(uuid) from public, anon;
grant execute on function public.gerar_codigo_convite(uuid) to authenticated;
