-- =============================================================================
-- Tags de jogador estilo Discord (ESPECIFICACAO.md › Tags de jogador)
-- Só o CODER gerencia. CODER é ligado direto no banco (tabela coders), nunca pelo site:
--   insert into coders (usuario_id) select id from usuarios where nick = 'SEU_NICK';
-- Só adiciona coisas; o site anterior segue funcionando.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CODER: sem política de escrita, então ninguém entra pela API (nem o ADM).
-- -----------------------------------------------------------------------------
create table public.coders (
  usuario_id uuid primary key references public.usuarios (id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.coders enable row level security;
create policy "leitura pública" on public.coders for select using (true);

create function public.is_coder()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from coders c join usuarios u on u.id = c.usuario_id
    where c.usuario_id = auth.uid() and not u.banido
  );
$$;

-- -----------------------------------------------------------------------------
-- Tags e quem tem cada uma
-- -----------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 20 and nome = trim(nome)),
  cor text not null check (cor ~ '^#[0-9a-f]{6}$'),
  ordem integer not null default 0, -- menor = mais importante
  automatica text unique check (automatica in ('adm', 'coder')), -- dada pelo papel, não à mão
  criada_em timestamptz not null default now()
);
create unique index tags_nome_unico on public.tags (lower(nome));

create table public.usuarios_tags (
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  dada_em timestamptz not null default now(),
  primary key (usuario_id, tag_id)
);
create index usuarios_tags_por_tag on public.usuarios_tags (tag_id);

alter table public.tags enable row level security;
create policy "leitura pública" on public.tags for select using (true);
create policy "CODER cria" on public.tags for insert with check (public.is_coder() and automatica is null);
create policy "CODER edita" on public.tags for update using (public.is_coder()) with check (public.is_coder());
create policy "CODER apaga" on public.tags for delete using (public.is_coder() and automatica is null);
-- Pela API só mudam nome, cor e ordem (automática fica como está).
revoke update on public.tags from anon, authenticated;
grant update (nome, cor, ordem) on public.tags to authenticated;

alter table public.usuarios_tags enable row level security;
create policy "leitura pública" on public.usuarios_tags for select using (true);
create policy "CODER dá" on public.usuarios_tags for insert
with check (
  public.is_coder()
  and exists (select 1 from public.tags t where t.id = tag_id and t.automatica is null)
);
create policy "CODER tira" on public.usuarios_tags for delete using (public.is_coder());

-- Todas as tags de cada jogador: as dadas à mão + ADM (papel adm) + CODER (tabela coders); banido não leva as automáticas.
create view public.tags_usuario with (security_invoker = true) as
  select ut.usuario_id, ut.tag_id
  from public.usuarios_tags ut join public.tags t on t.id = ut.tag_id
  where t.automatica is null
  union all
  select u.id, t.id
  from public.usuarios u join public.tags t on t.automatica = 'adm'
  where u.papel = 'adm' and not u.banido
  union all
  select c.usuario_id, t.id
  from public.coders c join public.usuarios u on u.id = c.usuario_id join public.tags t on t.automatica = 'coder'
  where not u.banido;

insert into public.tags (nome, cor, ordem, automatica) values
  ('CODER', '#a78bfa', 0, 'coder'),
  ('ADM', '#f06a1c', 1, 'adm');
