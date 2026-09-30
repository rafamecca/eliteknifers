-- =============================================================================
-- Ranking de Clãs @79 — Fase 1
-- Esquema, regras de acesso (RLS), funções de envio/aprovação e buckets.
-- Rodar uma vez no SQL Editor do Supabase (ou `supabase db push`).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.papel_usuario as enum ('jogador', 'adm');
create type public.cargo_cla as enum ('lider', 'sublider', 'membro');
create type public.status_confronto as enum (
  'aguardando_adversario', 'confirmado', 'contestado', 'sem_resposta', 'aprovado', 'rejeitado'
);
create type public.tipo_print as enum ('confronto', 'partida');

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------

-- Perfil público de cada conta. O e-mail fica só em auth.users (não é público).
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nick text not null check (char_length(nick) between 2 and 24),
  avatar text,
  papel public.papel_usuario not null default 'jogador',
  banido boolean not null default false,
  criado_em timestamptz not null default now()
);
create unique index usuarios_nick_unico on public.usuarios (lower(nick));

create table public.clas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 60),
  tag text not null check (char_length(tag) between 1 and 12),
  logo text, -- caminho no bucket "logos"
  bio text,
  redes jsonb not null default '{}'::jsonb, -- { "discord": url, "instagram": url, "youtube": url }
  fundado_em date,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index clas_tag_unica on public.clas (lower(tag));

-- Histórico de clãs de cada jogador: saiu_em nulo = membro atual.
create table public.membros_cla (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  cla_id uuid not null references public.clas (id) on delete cascade,
  cargo public.cargo_cla not null default 'membro',
  entrou_em timestamptz not null default now(),
  saiu_em timestamptz,
  check (saiu_em is null or saiu_em >= entrou_em)
);
create unique index membros_um_cla_por_vez on public.membros_cla (usuario_id) where saiu_em is null;
create unique index membros_um_lider on public.membros_cla (cla_id) where saiu_em is null and cargo = 'lider';
create unique index membros_um_sublider on public.membros_cla (cla_id) where saiu_em is null and cargo = 'sublider';
create index membros_por_cla on public.membros_cla (cla_id) where saiu_em is null;

create table public.temporadas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  inicio date not null,
  fim date not null,
  ativa boolean not null default false,
  check (fim >= inicio)
);
create unique index temporadas_uma_ativa on public.temporadas (ativa) where ativa;

create table public.pontos_temporada (
  cla_id uuid not null references public.clas (id) on delete cascade,
  temporada_id uuid not null references public.temporadas (id) on delete cascade,
  pontos integer not null default 1000,
  pico integer not null default 1000,
  posicao_final integer,
  primary key (cla_id, temporada_id)
);

create table public.confrontos (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas (id),
  cla_a_id uuid not null references public.clas (id), -- clã que enviou
  cla_b_id uuid not null references public.clas (id), -- adversário
  partidas_a smallint not null check (partidas_a >= 0),
  partidas_b smallint not null check (partidas_b >= 0),
  data timestamptz not null,
  enviado_por uuid not null references public.usuarios (id),
  enviado_em timestamptz not null default now(),
  status public.status_confronto not null default 'aguardando_adversario',
  conta_pontos boolean, -- definido na aprovação
  pontos_a_antes integer,
  pontos_b_antes integer,
  variacao integer, -- variação do clã A; o clã B recebe o mesmo valor com sinal invertido
  observacao text check (char_length(observacao) <= 500),
  motivo_contestacao text,
  motivo_rejeicao text,
  decidido_por uuid references public.usuarios (id),
  decidido_em timestamptz,
  check (cla_a_id <> cla_b_id),
  check (partidas_a + partidas_b between 1 and 15)
);
create index confrontos_temporada_status on public.confrontos (temporada_id, status);
create index confrontos_cla_a on public.confrontos (cla_a_id, data desc);
create index confrontos_cla_b on public.confrontos (cla_b_id, data desc);

create table public.partidas (
  id uuid primary key default gen_random_uuid(),
  confronto_id uuid not null references public.confrontos (id) on delete cascade,
  numero smallint not null check (numero >= 1),
  rounds_a smallint not null check (rounds_a between 0 and 9),
  rounds_b smallint not null check (rounds_b between 0 and 9),
  unique (confronto_id, numero)
);

create table public.prints (
  id uuid primary key default gen_random_uuid(),
  confronto_id uuid not null references public.confrontos (id) on delete cascade,
  partida_id uuid references public.partidas (id) on delete cascade,
  arquivo text not null, -- caminho no bucket "prints"
  hash text not null check (hash ~ '^[0-9a-f]{64}$'), -- SHA-256 do arquivo original
  tipo public.tipo_print not null,
  criado_em timestamptz not null default now(),
  check ((tipo = 'confronto' and partida_id is null) or (tipo = 'partida' and partida_id is not null))
);
create index prints_hash on public.prints (hash);
create index prints_confronto on public.prints (confronto_id);

-- Fase 3 (campeonatos e títulos): tabelas já criadas para não mexer no esquema depois.
create table public.campeonatos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data date,
  descricao text
);

create table public.titulos (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonatos (id) on delete cascade,
  cla_id uuid not null references public.clas (id) on delete cascade,
  colocacao smallint not null check (colocacao >= 1)
);

create table public.log_admin (
  id uuid primary key default gen_random_uuid(),
  adm_id uuid not null references public.usuarios (id),
  acao text not null,
  alvo text not null, -- ex.: "confrontos:<id>"
  antes jsonb,
  depois jsonb,
  data timestamptz not null default now()
);
create index log_admin_data on public.log_admin (data desc);

-- Fase 4 (estatísticas de jogadores): estrutura pronta, ainda sem uso.
create table public.estatisticas_jogador (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references public.partidas (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  cla_id uuid not null references public.clas (id) on delete cascade,
  frags smallint not null default 0,
  mortes smallint not null default 0,
  mvp boolean not null default false,
  unique (partida_id, usuario_id)
);

-- -----------------------------------------------------------------------------
-- Funções auxiliares
-- -----------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.usuarios where id = auth.uid() and papel = 'adm' and not banido
  );
$$;

create function public.nick_disponivel(p_nick text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from public.usuarios where lower(nick) = lower(trim(p_nick)));
$$;

-- Cria o perfil público assim que alguém se cadastra.
create function public.criar_perfil_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, nick)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nick'), ''), 'jogador-' || left(new.id::text, 8))
  );
  return new;
end;
$$;

create trigger ao_criar_conta
  after insert on auth.users
  for each row execute function public.criar_perfil_usuario();

-- Elo por confronto (ESPECIFICACAO.md › Pontuação). Retorna a variação do clã A.
-- Espelhado em src/lib/elo.ts — mudou aqui, muda lá (e nos testes).
create function public.calcular_variacao_elo(
  r_a integer, r_b integer, p_a integer, p_b integer, k numeric default 32
)
returns integer
language sql immutable
as $$
  select round(
    k
    * (case when p_a = p_b then 1 else 1 + 0.5 * abs(p_a - p_b)::numeric / (p_a + p_b) end)
    * ((case when p_a > p_b then 1 when p_a < p_b then 0 else 0.5 end)
       - 1 / (1 + power(10::numeric, (r_b - r_a)::numeric / 400)))
  )::integer;
$$;

-- -----------------------------------------------------------------------------
-- Envio de resultado (líder ou sublíder)
-- -----------------------------------------------------------------------------
-- p_rounds: [{"a": 9, "b": 6}, ...] na ordem das partidas, do ponto de vista do clã que envia.
-- p_prints: [{"arquivo": "<uid>/<nome>.webp", "hash": "<sha256>", "partida": null | 1..n}]
--           exatamente um print com "partida": null (o print do placar do confronto).
create function public.enviar_confronto(
  p_cla_adversario uuid,
  p_data timestamptz,
  p_partidas_a integer,
  p_partidas_b integer,
  p_rounds jsonb,
  p_prints jsonb,
  p_observacao text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cla uuid;
  v_temporada uuid;
  v_total integer;
  v_ga integer := 0;
  v_gb integer := 0;
  v_ra integer;
  v_rb integer;
  v_confronto uuid;
  v_partidas uuid[] := '{}';
  v_partida uuid;
  v_print jsonb;
  v_num integer;
  v_prints_confronto integer := 0;
  v_nums integer[] := '{}';
  v_hashes text[] := '{}';
  v_hash text;
  v_arquivo text;
begin
  if v_uid is null then
    raise exception 'Faça login para enviar resultados.';
  end if;
  if exists (select 1 from usuarios where id = v_uid and banido) then
    raise exception 'Sua conta está banida.';
  end if;

  select cla_id into v_cla
  from membros_cla
  where usuario_id = v_uid and saiu_em is null and cargo in ('lider', 'sublider');
  if v_cla is null then
    raise exception 'Só o líder ou o sublíder de um clã pode enviar resultados.';
  end if;

  if p_cla_adversario is null or p_cla_adversario = v_cla
     or not exists (select 1 from clas where id = p_cla_adversario and ativo) then
    raise exception 'Escolha um clã adversário válido.';
  end if;

  select id into v_temporada from temporadas where ativa;
  if v_temporada is null then
    raise exception 'Não há temporada ativa no momento.';
  end if;

  if p_data is null or p_data > now() + interval '10 minutes' then
    raise exception 'A data do confronto não pode estar no futuro.';
  end if;
  if p_data < now() - interval '24 hours' then
    raise exception 'O prazo para enviar é de 24h após o confronto.';
  end if;

  -- Placar e rounds
  if p_partidas_a is null or p_partidas_b is null or p_partidas_a < 0 or p_partidas_b < 0
     or p_partidas_a + p_partidas_b not between 1 and 15 then
    raise exception 'Placar do confronto inválido.';
  end if;
  v_total := p_partidas_a + p_partidas_b;

  if jsonb_typeof(p_rounds) is distinct from 'array' or jsonb_array_length(p_rounds) <> v_total then
    raise exception 'Informe os rounds de todas as % partidas.', v_total;
  end if;
  for i in 0 .. v_total - 1 loop
    v_ra := (p_rounds -> i ->> 'a')::integer;
    v_rb := (p_rounds -> i ->> 'b')::integer;
    if v_ra is null or v_rb is null or v_ra not between 0 and 9 or v_rb not between 0 and 9
       or not ((v_ra = 9 and v_rb < 9) or (v_rb = 9 and v_ra < 9)) then
      raise exception 'Partida %: rounds inválidos (quem vence faz 9, o outro de 0 a 8).', i + 1;
    end if;
    if v_ra = 9 then v_ga := v_ga + 1; else v_gb := v_gb + 1; end if;
  end loop;
  if v_ga <> p_partidas_a or v_gb <> p_partidas_b then
    raise exception 'Os rounds não batem com o placar: pelos rounds ficou %x%.', v_ga, v_gb;
  end if;

  -- Só um dos dois clãs envia o mesmo confronto
  if exists (
    select 1 from confrontos
    where status not in ('aprovado', 'rejeitado')
      and ((cla_a_id = v_cla and cla_b_id = p_cla_adversario)
        or (cla_a_id = p_cla_adversario and cla_b_id = v_cla))
      and abs(extract(epoch from (data - p_data))) <= 2 * 60 * 60
  ) then
    raise exception 'Já existe um resultado pendente entre esses dois clãs nesse horário. Aguarde a análise do ADM.';
  end if;

  -- Prints
  if jsonb_typeof(p_prints) is distinct from 'array' then
    raise exception 'Envie o print do placar do confronto.';
  end if;
  for v_print in select * from jsonb_array_elements(p_prints) loop
    v_arquivo := v_print ->> 'arquivo';
    v_hash := v_print ->> 'hash';
    v_num := (v_print ->> 'partida')::integer;

    if v_arquivo is null or v_arquivo not like v_uid::text || '/%'
       or not exists (select 1 from storage.objects where bucket_id = 'prints' and name = v_arquivo) then
      raise exception 'Um dos prints não foi encontrado. Tente enviar de novo.';
    end if;
    if v_hash is null or v_hash !~ '^[0-9a-f]{64}$' then
      raise exception 'Print inválido.';
    end if;
    if v_hash = any (v_hashes) then
      raise exception 'O mesmo print foi usado duas vezes neste envio.';
    end if;
    v_hashes := v_hashes || v_hash;

    if v_num is null then
      v_prints_confronto := v_prints_confronto + 1;
    else
      if v_num not between 1 and v_total or v_num = any (v_nums) then
        raise exception 'Print de partida inválido.';
      end if;
      v_nums := v_nums || v_num;
    end if;
  end loop;
  if v_prints_confronto <> 1 then
    raise exception 'Envie exatamente um print do placar do confronto.';
  end if;
  -- Prints de envios rejeitados podem ser reaproveitados (ex.: reenvio corrigido).
  if exists (
    select 1 from prints p join confrontos c on c.id = p.confronto_id
    where p.hash = any (v_hashes) and c.status <> 'rejeitado'
  ) then
    raise exception 'Um dos prints já foi usado em outro resultado.';
  end if;

  insert into confrontos (temporada_id, cla_a_id, cla_b_id, partidas_a, partidas_b, data, enviado_por, observacao)
  values (v_temporada, v_cla, p_cla_adversario, p_partidas_a, p_partidas_b, p_data, v_uid,
          nullif(trim(p_observacao), ''))
  returning id into v_confronto;

  for i in 0 .. v_total - 1 loop
    insert into partidas (confronto_id, numero, rounds_a, rounds_b)
    values (v_confronto, i + 1, (p_rounds -> i ->> 'a')::integer, (p_rounds -> i ->> 'b')::integer)
    returning id into v_partida;
    v_partidas := v_partidas || v_partida;
  end loop;

  for v_print in select * from jsonb_array_elements(p_prints) loop
    v_num := (v_print ->> 'partida')::integer;
    insert into prints (confronto_id, partida_id, arquivo, hash, tipo)
    values (
      v_confronto,
      case when v_num is null then null else v_partidas[v_num] end,
      v_print ->> 'arquivo',
      v_print ->> 'hash',
      case when v_num is null then 'confronto'::tipo_print else 'partida'::tipo_print end
    );
  end loop;

  return v_confronto;
end;
$$;

-- -----------------------------------------------------------------------------
-- Aprovação e rejeição (ADM)
-- -----------------------------------------------------------------------------
create function public.aprovar_confronto(p_confronto uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  c confrontos%rowtype;
  v_ra integer;
  v_rb integer;
  v_conta boolean;
  v_delta integer;
  v_dia date;
begin
  if not is_admin() then
    raise exception 'Apenas o ADM pode aprovar resultados.';
  end if;

  select * into c from confrontos where id = p_confronto for update;
  if not found then
    raise exception 'Confronto não encontrado.';
  end if;
  if c.status in ('aprovado', 'rejeitado') then
    raise exception 'Este confronto já foi decidido.';
  end if;

  insert into pontos_temporada (cla_id, temporada_id)
  values (c.cla_a_id, c.temporada_id), (c.cla_b_id, c.temporada_id)
  on conflict do nothing;

  -- Trava as duas linhas sempre na mesma ordem para evitar deadlock.
  perform 1 from pontos_temporada
  where temporada_id = c.temporada_id and cla_id in (c.cla_a_id, c.cla_b_id)
  order by cla_id
  for update;

  select pontos into v_ra from pontos_temporada where cla_id = c.cla_a_id and temporada_id = c.temporada_id;
  select pontos into v_rb from pontos_temporada where cla_id = c.cla_b_id and temporada_id = c.temporada_id;

  -- Regras: mínimo de 3 partidas; só o primeiro confronto do dia (horário de Brasília)
  -- entre os mesmos dois clãs vale pontos.
  v_dia := (c.data at time zone 'America/Sao_Paulo')::date;
  v_conta := c.partidas_a + c.partidas_b >= 3
    and not exists (
      select 1 from confrontos o
      where o.id <> c.id
        and o.status = 'aprovado'
        and o.conta_pontos
        and least(o.cla_a_id, o.cla_b_id) = least(c.cla_a_id, c.cla_b_id)
        and greatest(o.cla_a_id, o.cla_b_id) = greatest(c.cla_a_id, c.cla_b_id)
        and (o.data at time zone 'America/Sao_Paulo')::date = v_dia
    );

  v_delta := case when v_conta then calcular_variacao_elo(v_ra, v_rb, c.partidas_a, c.partidas_b) else 0 end;

  update pontos_temporada
  set pontos = pontos + v_delta, pico = greatest(pico, pontos + v_delta)
  where cla_id = c.cla_a_id and temporada_id = c.temporada_id;
  update pontos_temporada
  set pontos = pontos - v_delta, pico = greatest(pico, pontos - v_delta)
  where cla_id = c.cla_b_id and temporada_id = c.temporada_id;

  update confrontos
  set status = 'aprovado', conta_pontos = v_conta, pontos_a_antes = v_ra, pontos_b_antes = v_rb,
      variacao = v_delta, decidido_por = auth.uid(), decidido_em = now()
  where id = c.id;

  insert into log_admin (adm_id, acao, alvo, antes, depois)
  values (auth.uid(), 'aprovar_confronto', 'confrontos:' || c.id, to_jsonb(c),
          jsonb_build_object('status', 'aprovado', 'conta_pontos', v_conta, 'variacao', v_delta,
                             'pontos_a_antes', v_ra, 'pontos_b_antes', v_rb));

  return jsonb_build_object('conta_pontos', v_conta, 'variacao', v_delta);
end;
$$;

create function public.rejeitar_confronto(p_confronto uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  c confrontos%rowtype;
begin
  if not is_admin() then
    raise exception 'Apenas o ADM pode rejeitar resultados.';
  end if;
  if nullif(trim(p_motivo), '') is null then
    raise exception 'Informe o motivo da rejeição.';
  end if;

  select * into c from confrontos where id = p_confronto for update;
  if not found then
    raise exception 'Confronto não encontrado.';
  end if;
  if c.status in ('aprovado', 'rejeitado') then
    raise exception 'Este confronto já foi decidido.';
  end if;

  update confrontos
  set status = 'rejeitado', motivo_rejeicao = trim(p_motivo), decidido_por = auth.uid(), decidido_em = now()
  where id = c.id;

  insert into log_admin (adm_id, acao, alvo, antes, depois)
  values (auth.uid(), 'rejeitar_confronto', 'confrontos:' || c.id, to_jsonb(c),
          jsonb_build_object('status', 'rejeitado', 'motivo_rejeicao', trim(p_motivo)));
end;
$$;

-- -----------------------------------------------------------------------------
-- Liderança dos clãs (ADM)
-- -----------------------------------------------------------------------------

-- Define líder e sublíder (qualquer um pode ser nulo). Quem perde o cargo vira membro.
create function public.definir_lideranca(p_cla uuid, p_lider uuid, p_sublider uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_antes jsonb;
  v_usuario uuid;
  v_cargo cargo_cla;
  v_outro text;
begin
  if not is_admin() then
    raise exception 'Apenas o ADM pode definir a liderança.';
  end if;
  if not exists (select 1 from clas where id = p_cla) then
    raise exception 'Clã não encontrado.';
  end if;
  if p_lider is not null and p_lider = p_sublider then
    raise exception 'Líder e sublíder precisam ser pessoas diferentes.';
  end if;

  select jsonb_agg(jsonb_build_object('usuario_id', usuario_id, 'cargo', cargo)) into v_antes
  from membros_cla where cla_id = p_cla and saiu_em is null and cargo in ('lider', 'sublider');

  -- Confere antes de mexer: ninguém pode estar em outro clã.
  foreach v_usuario in array array[p_lider, p_sublider] loop
    continue when v_usuario is null;
    if not exists (select 1 from usuarios where id = v_usuario) then
      raise exception 'Jogador não encontrado.';
    end if;
    select u.nick || ' já está no clã ' || cl.tag || '. Remova-o de lá primeiro.' into v_outro
    from membros_cla m join clas cl on cl.id = m.cla_id join usuarios u on u.id = m.usuario_id
    where m.usuario_id = v_usuario and m.saiu_em is null and m.cla_id <> p_cla;
    if v_outro is not null then
      raise exception '%', v_outro;
    end if;
  end loop;

  update membros_cla set cargo = 'membro'
  where cla_id = p_cla and saiu_em is null and cargo in ('lider', 'sublider');

  foreach v_cargo in array array['lider', 'sublider']::cargo_cla[] loop
    v_usuario := case when v_cargo = 'lider' then p_lider else p_sublider end;
    continue when v_usuario is null;
    update membros_cla set cargo = v_cargo
    where cla_id = p_cla and usuario_id = v_usuario and saiu_em is null;
    if not found then
      insert into membros_cla (usuario_id, cla_id, cargo) values (v_usuario, p_cla, v_cargo);
    end if;
  end loop;

  insert into log_admin (adm_id, acao, alvo, antes, depois)
  values (auth.uid(), 'definir_lideranca', 'clas:' || p_cla, v_antes,
          jsonb_build_object('lider', p_lider, 'sublider', p_sublider));
end;
$$;

create function public.remover_membro(p_cla uuid, p_usuario uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Apenas o ADM pode remover membros.';
  end if;
  update membros_cla set saiu_em = now()
  where cla_id = p_cla and usuario_id = p_usuario and saiu_em is null;
  if not found then
    raise exception 'Esse jogador não é membro do clã.';
  end if;
  insert into log_admin (adm_id, acao, alvo, antes, depois)
  values (auth.uid(), 'remover_membro', 'clas:' || p_cla, jsonb_build_object('usuario_id', p_usuario), null);
end;
$$;

-- Funções de escrita só para quem está logado (cada uma confere o cargo por dentro).
revoke execute on function public.enviar_confronto(uuid, timestamptz, integer, integer, jsonb, jsonb, text) from public, anon;
revoke execute on function public.aprovar_confronto(uuid) from public, anon;
revoke execute on function public.rejeitar_confronto(uuid, text) from public, anon;
revoke execute on function public.definir_lideranca(uuid, uuid, uuid) from public, anon;
revoke execute on function public.remover_membro(uuid, uuid) from public, anon;
grant execute on function public.enviar_confronto(uuid, timestamptz, integer, integer, jsonb, jsonb, text) to authenticated;
grant execute on function public.aprovar_confronto(uuid) to authenticated;
grant execute on function public.rejeitar_confronto(uuid, text) to authenticated;
grant execute on function public.definir_lideranca(uuid, uuid, uuid) to authenticated;
grant execute on function public.remover_membro(uuid, uuid) to authenticated;
revoke execute on function public.criar_perfil_usuario() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Regras de acesso (RLS)
-- Leitura pública; escrita só pelo ADM ou pelas funções acima.
-- -----------------------------------------------------------------------------
alter table public.usuarios enable row level security;
alter table public.clas enable row level security;
alter table public.membros_cla enable row level security;
alter table public.temporadas enable row level security;
alter table public.pontos_temporada enable row level security;
alter table public.confrontos enable row level security;
alter table public.partidas enable row level security;
alter table public.prints enable row level security;
alter table public.campeonatos enable row level security;
alter table public.titulos enable row level security;
alter table public.log_admin enable row level security;
alter table public.estatisticas_jogador enable row level security;

create policy "leitura pública" on public.usuarios for select using (true);
create policy "leitura pública" on public.clas for select using (true);
create policy "leitura pública" on public.membros_cla for select using (true);
create policy "leitura pública" on public.temporadas for select using (true);
create policy "leitura pública" on public.pontos_temporada for select using (true);
create policy "leitura pública" on public.confrontos for select using (true);
create policy "leitura pública" on public.partidas for select using (true);
create policy "leitura pública" on public.prints for select using (true);
create policy "leitura pública" on public.campeonatos for select using (true);
create policy "leitura pública" on public.titulos for select using (true);
create policy "leitura pública" on public.estatisticas_jogador for select using (true);

create policy "ADM edita" on public.usuarios for update using (public.is_admin()) with check (public.is_admin());
create policy "ADM cria" on public.clas for insert with check (public.is_admin());
create policy "ADM edita" on public.clas for update using (public.is_admin()) with check (public.is_admin());
create policy "ADM cria" on public.temporadas for insert with check (public.is_admin());
create policy "ADM edita" on public.temporadas for update using (public.is_admin()) with check (public.is_admin());
create policy "ADM cria" on public.campeonatos for insert with check (public.is_admin());
create policy "ADM edita" on public.campeonatos for update using (public.is_admin()) with check (public.is_admin());
create policy "ADM cria" on public.titulos for insert with check (public.is_admin());
create policy "ADM edita" on public.titulos for update using (public.is_admin()) with check (public.is_admin());
create policy "ADM lê" on public.log_admin for select using (public.is_admin());
create policy "ADM registra" on public.log_admin for insert with check (public.is_admin() and adm_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Armazenamento de arquivos
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('prints', 'prints', true, 3145728, array['image/webp', 'image/jpeg', 'image/png']),
  ('logos', 'logos', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Prints: líder/sublíder envia na própria pasta (<uid>/...).
create policy "prints: líder/sublíder envia" on storage.objects for insert to authenticated
with check (
  bucket_id = 'prints'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.membros_cla
    where usuario_id = auth.uid() and saiu_em is null and cargo in ('lider', 'sublider')
  )
);
create policy "prints: vê a própria pasta" on storage.objects for select to authenticated
using (bucket_id = 'prints' and (storage.foldername(name))[1] = auth.uid()::text);
-- Pode apagar da própria pasta só o que ainda não virou print de um confronto (envio que falhou).
create policy "prints: apaga envio que falhou" on storage.objects for delete to authenticated
using (
  bucket_id = 'prints'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (select 1 from public.prints p where p.arquivo = name)
);

create policy "logos: ADM envia" on storage.objects for insert to authenticated
with check (bucket_id = 'logos' and public.is_admin());
create policy "logos: ADM apaga" on storage.objects for delete to authenticated
using (bucket_id = 'logos' and public.is_admin());

-- -----------------------------------------------------------------------------
-- Primeira temporada (ajuste nome e datas quando estiverem definidos)
-- -----------------------------------------------------------------------------
insert into public.temporadas (nome, inicio, fim, ativa)
values ('Temporada 1', current_date, (current_date + interval '3 months' - interval '1 day')::date, true);
