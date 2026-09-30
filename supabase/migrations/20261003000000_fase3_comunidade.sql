-- =============================================================================
-- Fase 3 · Campeonatos e gestão do clã pelo líder (ESPECIFICACAO.md › Gestão do clã / Campeonatos)
-- Só adiciona coisas (tabela, funções e regras novas); o site anterior segue funcionando.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Campeonatos: ADM também apaga; um clã tem uma colocação por campeonato
-- -----------------------------------------------------------------------------
create unique index titulos_um_por_cla on public.titulos (campeonato_id, cla_id);
create index titulos_por_cla on public.titulos (cla_id);

create policy "ADM apaga" on public.campeonatos for delete using (public.is_admin());
create policy "ADM apaga" on public.titulos for delete using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Pedidos de entrada em clã
-- -----------------------------------------------------------------------------
create type public.status_pedido as enum ('pendente', 'aceito', 'recusado', 'cancelado');

create table public.pedidos_entrada (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  cla_id uuid not null references public.clas (id) on delete cascade,
  status public.status_pedido not null default 'pendente',
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  respondido_por uuid references public.usuarios (id)
);
create unique index pedidos_um_aberto_por_jogador on public.pedidos_entrada (usuario_id) where status = 'pendente';
create index pedidos_por_cla on public.pedidos_entrada (cla_id) where status = 'pendente';

-- Líder (ou sublíder) do clã do usuário logado, ou null.
create function public._meu_cla(p_cargos public.cargo_cla[])
returns uuid
language sql stable security definer set search_path = public
as $$
  select cla_id from membros_cla
  where usuario_id = auth.uid() and saiu_em is null and cargo = any (p_cargos);
$$;
revoke execute on function public._meu_cla(public.cargo_cla[]) from public, anon, authenticated;

alter table public.pedidos_entrada enable row level security;
-- Vê o pedido: quem pediu, o líder do clã e o ADM. Escrita só pelas funções abaixo.
create policy "dono, líder ou ADM" on public.pedidos_entrada for select
using (
  usuario_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.membros_cla m
    where m.usuario_id = auth.uid() and m.saiu_em is null and m.cargo = 'lider' and m.cla_id = pedidos_entrada.cla_id
  )
);

create function public.pedir_entrada(p_cla uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Faça login para pedir entrada num clã.';
  end if;
  if exists (select 1 from usuarios where id = v_uid and banido) then
    raise exception 'Sua conta está banida.';
  end if;
  if exists (select 1 from membros_cla where usuario_id = v_uid and saiu_em is null) then
    raise exception 'Você já está num clã. Saia dele antes de pedir entrada em outro.';
  end if;
  if not exists (select 1 from clas where id = p_cla and ativo) then
    raise exception 'Clã não encontrado.';
  end if;
  if exists (select 1 from pedidos_entrada where usuario_id = v_uid and status = 'pendente') then
    raise exception 'Você já tem um pedido aberto. Cancele-o antes de pedir em outro clã.';
  end if;

  insert into pedidos_entrada (usuario_id, cla_id) values (v_uid, p_cla) returning id into v_id;
  return v_id;
end;
$$;

create function public.cancelar_pedido(p_pedido uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update pedidos_entrada set status = 'cancelado', respondido_em = now()
  where id = p_pedido and usuario_id = auth.uid() and status = 'pendente';
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
end;
$$;

-- Líder (ou ADM) aceita ou recusa.
create function public.responder_pedido(p_pedido uuid, p_aceitar boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  p pedidos_entrada%rowtype;
begin
  select * into p from pedidos_entrada where id = p_pedido for update;
  if not found or p.status <> 'pendente' then
    raise exception 'Este pedido não está mais aberto.';
  end if;
  if not is_admin() and _meu_cla(array['lider']::cargo_cla[]) is distinct from p.cla_id then
    raise exception 'Só o líder do clã pode responder pedidos de entrada.';
  end if;

  if p_aceitar then
    if exists (select 1 from membros_cla where usuario_id = p.usuario_id and saiu_em is null) then
      raise exception 'Esse jogador já entrou em outro clã. Recuse o pedido.';
    end if;
    insert into membros_cla (usuario_id, cla_id, cargo) values (p.usuario_id, p.cla_id, 'membro');
  end if;

  update pedidos_entrada
  set status = case when p_aceitar then 'aceito'::status_pedido else 'recusado'::status_pedido end,
      respondido_em = now(), respondido_por = auth.uid()
  where id = p.id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Membros
-- -----------------------------------------------------------------------------

-- Qualquer membro sai do clã, menos o líder.
create function public.sair_do_cla()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  m membros_cla%rowtype;
begin
  select * into m from membros_cla where usuario_id = auth.uid() and saiu_em is null for update;
  if not found then
    raise exception 'Você não está em nenhum clã.';
  end if;
  if m.cargo = 'lider' then
    raise exception 'O líder não pode sair do clã. Peça ao ADM para definir outro líder antes.';
  end if;
  update membros_cla set saiu_em = now() where id = m.id;
end;
$$;

-- Remover membro: ADM (qualquer um) ou o líder do clã (menos ele mesmo).
create or replace function public.remover_membro(p_cla uuid, p_usuario uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_admin boolean := is_admin();
begin
  if not v_admin and _meu_cla(array['lider']::cargo_cla[]) is distinct from p_cla then
    raise exception 'Só o líder do clã ou o ADM pode remover membros.';
  end if;
  if not v_admin and p_usuario = auth.uid() then
    raise exception 'O líder não pode remover a si mesmo.';
  end if;

  update membros_cla set saiu_em = now()
  where cla_id = p_cla and usuario_id = p_usuario and saiu_em is null;
  if not found then
    raise exception 'Esse jogador não é membro do clã.';
  end if;

  if v_admin then
    insert into log_admin (adm_id, acao, alvo, antes, depois)
    values (auth.uid(), 'remover_membro', 'clas:' || p_cla, jsonb_build_object('usuario_id', p_usuario), null);
  end if;
end;
$$;

-- O líder nomeia o sublíder entre os membros (null = fica sem sublíder).
create function public.nomear_sublider(p_usuario uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_cla uuid := _meu_cla(array['lider']::cargo_cla[]);
begin
  if v_cla is null then
    raise exception 'Só o líder pode nomear o sublíder.';
  end if;
  if p_usuario is not null and not exists (
    select 1 from membros_cla where cla_id = v_cla and usuario_id = p_usuario and saiu_em is null and cargo <> 'lider'
  ) then
    raise exception 'O sublíder precisa ser um membro do clã.';
  end if;

  update membros_cla set cargo = 'membro' where cla_id = v_cla and saiu_em is null and cargo = 'sublider';
  if p_usuario is not null then
    update membros_cla set cargo = 'sublider' where cla_id = v_cla and usuario_id = p_usuario and saiu_em is null;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Perfil do clã editado pelo líder (logo, bio, redes)
-- -----------------------------------------------------------------------------
create function public.editar_perfil_cla(p_cla uuid, p_logo text, p_bio text, p_redes jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_chave text;
  v_valor jsonb;
begin
  if not is_admin() and _meu_cla(array['lider']::cargo_cla[]) is distinct from p_cla then
    raise exception 'Só o líder do clã pode editar o perfil.';
  end if;
  if char_length(coalesce(p_bio, '')) > 1000 then
    raise exception 'A bio pode ter até 1000 caracteres.';
  end if;
  if p_logo is not null and p_logo !~ '^clas/[A-Za-z0-9/_.-]+$' then
    raise exception 'Logo inválido.';
  end if;
  if jsonb_typeof(coalesce(p_redes, '{}'::jsonb)) <> 'object' then
    raise exception 'Redes inválidas.';
  end if;
  for v_chave, v_valor in select * from jsonb_each(coalesce(p_redes, '{}'::jsonb)) loop
    if v_chave not in ('discord', 'instagram', 'youtube') or jsonb_typeof(v_valor) <> 'string'
       or (v_valor #>> '{}') !~ '^https?://\S+$' then
      raise exception 'Link inválido em %: use um endereço começando com https://', v_chave;
    end if;
  end loop;

  update clas
  set logo = p_logo, bio = nullif(trim(p_bio), ''), redes = coalesce(p_redes, '{}'::jsonb)
  where id = p_cla;
end;
$$;

-- Líder envia logo na pasta do próprio clã: logos/clas/<cla_id>/...
create policy "logos: líder envia" on storage.objects for insert to authenticated
with check (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = 'clas'
  and exists (
    select 1 from public.membros_cla m
    where m.usuario_id = auth.uid() and m.saiu_em is null and m.cargo = 'lider'
      and m.cla_id::text = (storage.foldername(name))[2]
  )
);

revoke execute on function public.pedir_entrada(uuid) from public, anon;
revoke execute on function public.cancelar_pedido(uuid) from public, anon;
revoke execute on function public.responder_pedido(uuid, boolean) from public, anon;
revoke execute on function public.sair_do_cla() from public, anon;
revoke execute on function public.nomear_sublider(uuid) from public, anon;
revoke execute on function public.editar_perfil_cla(uuid, text, text, jsonb) from public, anon;
grant execute on function public.pedir_entrada(uuid) to authenticated;
grant execute on function public.cancelar_pedido(uuid) to authenticated;
grant execute on function public.responder_pedido(uuid, boolean) to authenticated;
grant execute on function public.sair_do_cla() to authenticated;
grant execute on function public.nomear_sublider(uuid) to authenticated;
grant execute on function public.editar_perfil_cla(uuid, text, text, jsonb) to authenticated;
