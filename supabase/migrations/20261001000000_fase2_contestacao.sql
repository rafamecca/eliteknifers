-- =============================================================================
-- Fase 2 · Confirmação e contestação pelo adversário (ESPECIFICACAO.md › Fluxo de envio)
--
-- A decisão do ADM (status) e a resposta do adversário (resposta) passam a ser colunas
-- separadas: o ADM pode aprovar antes da resposta, e o adversário tem 12h a partir do envio
-- para confirmar ou contestar — inclusive um resultado já aprovado. Contestação aberta vai
-- para o ADM, que mantém, anula (desfaz os pontos) ou corrige placar/rounds.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos e colunas
-- -----------------------------------------------------------------------------
create type public.decisao_adm as enum ('pendente', 'aprovado', 'rejeitado');
create type public.resposta_adversario as enum ('aguardando', 'confirmado', 'contestado');
create type public.resolucao_contestacao as enum ('mantido', 'anulado', 'corrigido');

-- status: o que não era aprovado/rejeitado vira "pendente" (a resposta agora é outra coluna).
alter table public.confrontos alter column status drop default;
alter table public.confrontos alter column status type public.decisao_adm
  using (case when status::text in ('aprovado', 'rejeitado') then status::text else 'pendente' end)::public.decisao_adm;
alter table public.confrontos alter column status set default 'pendente';
drop type public.status_confronto;

alter table public.confrontos
  add column resposta public.resposta_adversario not null default 'aguardando',
  add column respondido_por uuid references public.usuarios (id),
  add column respondido_em timestamptz,
  add column contestacao_resolvida public.resolucao_contestacao,
  add column contestacao_resolvida_em timestamptz,
  add constraint contestacao_tem_motivo check (resposta <> 'contestado' or motivo_contestacao is not null);

create index confrontos_contestados_abertos on public.confrontos (enviado_em)
  where resposta = 'contestado' and contestacao_resolvida is null;

-- -----------------------------------------------------------------------------
-- Auxiliares internas (sem acesso direto pela API)
-- -----------------------------------------------------------------------------

-- Soma delta ao clã A e subtrai do clã B na temporada; o pico só sobe.
create function public._aplicar_pontos(p_temporada uuid, p_cla_a uuid, p_cla_b uuid, p_delta integer)
returns void
language sql
as $$
  update public.pontos_temporada
  set pontos = pontos + p_delta, pico = greatest(pico, pontos + p_delta)
  where cla_id = p_cla_a and temporada_id = p_temporada;
  update public.pontos_temporada
  set pontos = pontos - p_delta, pico = greatest(pico, pontos - p_delta)
  where cla_id = p_cla_b and temporada_id = p_temporada;
$$;

-- Mínimo de 3 partidas e só o primeiro confronto do dia (horário de Brasília) entre o par vale pontos.
create function public._conta_pontos(p_confronto uuid, p_cla_a uuid, p_cla_b uuid, p_data timestamptz, p_total integer)
returns boolean
language sql stable
as $$
  select p_total >= 3 and not exists (
    select 1 from public.confrontos o
    where o.id <> p_confronto
      and o.status = 'aprovado'
      and o.conta_pontos
      and least(o.cla_a_id, o.cla_b_id) = least(p_cla_a, p_cla_b)
      and greatest(o.cla_a_id, o.cla_b_id) = greatest(p_cla_a, p_cla_b)
      and (o.data at time zone 'America/Sao_Paulo')::date = (p_data at time zone 'America/Sao_Paulo')::date
  );
$$;

-- Trava as linhas de pontos dos dois clãs (sempre na mesma ordem, contra deadlock), criando se faltar.
create function public._travar_pontos(p_temporada uuid, p_cla_a uuid, p_cla_b uuid)
returns void
language plpgsql
as $$
begin
  insert into public.pontos_temporada (cla_id, temporada_id)
  values (p_cla_a, p_temporada), (p_cla_b, p_temporada)
  on conflict do nothing;
  perform 1 from public.pontos_temporada
  where temporada_id = p_temporada and cla_id in (p_cla_a, p_cla_b)
  order by cla_id
  for update;
end;
$$;

-- Confere placar e rounds (mesmas regras do envio). Lança erro se algo não bater.
create function public._validar_placar(p_partidas_a integer, p_partidas_b integer, p_rounds jsonb)
returns void
language plpgsql immutable
as $$
declare
  v_total integer;
  v_ga integer := 0;
  v_gb integer := 0;
  v_ra integer;
  v_rb integer;
begin
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
end;
$$;

revoke execute on function public._aplicar_pontos(uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public._conta_pontos(uuid, uuid, uuid, timestamptz, integer) from public, anon, authenticated;
revoke execute on function public._travar_pontos(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public._validar_placar(integer, integer, jsonb) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Resposta do adversário (líder ou sublíder do clã B, até 12h após o envio)
-- -----------------------------------------------------------------------------
create function public.responder_confronto(p_confronto uuid, p_confirmar boolean, p_motivo text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cla uuid;
  c confrontos%rowtype;
begin
  if v_uid is null then
    raise exception 'Faça login para responder.';
  end if;
  if exists (select 1 from usuarios where id = v_uid and banido) then
    raise exception 'Sua conta está banida.';
  end if;

  select * into c from confrontos where id = p_confronto for update;
  if not found then
    raise exception 'Confronto não encontrado.';
  end if;

  select cla_id into v_cla
  from membros_cla
  where usuario_id = v_uid and saiu_em is null and cargo in ('lider', 'sublider');
  if v_cla is distinct from c.cla_b_id then
    raise exception 'Só o líder ou o sublíder do clã adversário pode responder a este resultado.';
  end if;

  if c.status = 'rejeitado' then
    raise exception 'Este resultado já foi rejeitado pelo ADM.';
  end if;
  if c.resposta <> 'aguardando' then
    raise exception 'Este resultado já foi respondido.';
  end if;
  if now() > c.enviado_em + interval '12 hours' then
    raise exception 'O prazo de 12h para responder já passou.';
  end if;
  if not coalesce(p_confirmar, false) and nullif(trim(p_motivo), '') is null then
    raise exception 'Explique o motivo da contestação.';
  end if;

  update confrontos
  set resposta = case when p_confirmar then 'confirmado'::resposta_adversario else 'contestado'::resposta_adversario end,
      motivo_contestacao = case when p_confirmar then null else left(trim(p_motivo), 500) end,
      respondido_por = v_uid,
      respondido_em = now()
  where id = c.id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Decisões do ADM
-- -----------------------------------------------------------------------------

-- Aprovar: igual à Fase 1. Aprovar um pendente contestado conta como "mantido".
create or replace function public.aprovar_confronto(p_confronto uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  c confrontos%rowtype;
  v_ra integer;
  v_rb integer;
  v_conta boolean;
  v_delta integer;
begin
  if not is_admin() then
    raise exception 'Apenas o ADM pode aprovar resultados.';
  end if;

  select * into c from confrontos where id = p_confronto for update;
  if not found then
    raise exception 'Confronto não encontrado.';
  end if;
  if c.status <> 'pendente' then
    raise exception 'Este confronto já foi decidido.';
  end if;

  perform _travar_pontos(c.temporada_id, c.cla_a_id, c.cla_b_id);
  select pontos into v_ra from pontos_temporada where cla_id = c.cla_a_id and temporada_id = c.temporada_id;
  select pontos into v_rb from pontos_temporada where cla_id = c.cla_b_id and temporada_id = c.temporada_id;

  v_conta := _conta_pontos(c.id, c.cla_a_id, c.cla_b_id, c.data, c.partidas_a + c.partidas_b);
  v_delta := case when v_conta then calcular_variacao_elo(v_ra, v_rb, c.partidas_a, c.partidas_b) else 0 end;
  perform _aplicar_pontos(c.temporada_id, c.cla_a_id, c.cla_b_id, v_delta);

  update confrontos
  set status = 'aprovado', conta_pontos = v_conta, pontos_a_antes = v_ra, pontos_b_antes = v_rb,
      variacao = v_delta, decidido_por = auth.uid(), decidido_em = now(),
      contestacao_resolvida = case when resposta = 'contestado' then 'mantido'::resolucao_contestacao end,
      contestacao_resolvida_em = case when resposta = 'contestado' then now() end
  where id = c.id;

  insert into log_admin (adm_id, acao, alvo, antes, depois)
  values (auth.uid(), 'aprovar_confronto', 'confrontos:' || c.id, to_jsonb(c),
          jsonb_build_object('status', 'aprovado', 'conta_pontos', v_conta, 'variacao', v_delta,
                             'pontos_a_antes', v_ra, 'pontos_b_antes', v_rb));

  return jsonb_build_object('conta_pontos', v_conta, 'variacao', v_delta);
end;
$$;

-- Manter um resultado aprovado que foi contestado: só fecha a contestação.
create function public.manter_confronto(p_confronto uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  c confrontos%rowtype;
begin
  if not is_admin() then
    raise exception 'Apenas o ADM pode resolver contestações.';
  end if;
  select * into c from confrontos where id = p_confronto for update;
  if not found then
    raise exception 'Confronto não encontrado.';
  end if;
  if c.resposta <> 'contestado' or c.contestacao_resolvida is not null then
    raise exception 'Este confronto não tem contestação aberta.';
  end if;
  if c.status <> 'aprovado' then
    raise exception 'Aprove, rejeite ou corrija este resultado pela fila.';
  end if;

  update confrontos set contestacao_resolvida = 'mantido', contestacao_resolvida_em = now() where id = c.id;

  insert into log_admin (adm_id, acao, alvo, antes, depois)
  values (auth.uid(), 'manter_confronto', 'confrontos:' || c.id, null, jsonb_build_object('contestacao_resolvida', 'mantido'));
end;
$$;

-- Rejeitar (pendente) ou anular (já aprovado: desfaz só os pontos deste confronto).
create or replace function public.rejeitar_confronto(p_confronto uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  c confrontos%rowtype;
  v_anulando boolean;
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
  if c.status = 'rejeitado' then
    raise exception 'Este confronto já foi rejeitado.';
  end if;

  v_anulando := c.status = 'aprovado';
  if v_anulando and c.conta_pontos and coalesce(c.variacao, 0) <> 0 then
    perform _travar_pontos(c.temporada_id, c.cla_a_id, c.cla_b_id);
    perform _aplicar_pontos(c.temporada_id, c.cla_a_id, c.cla_b_id, -c.variacao);
  end if;

  update confrontos
  set status = 'rejeitado', motivo_rejeicao = trim(p_motivo), decidido_por = auth.uid(), decidido_em = now(),
      contestacao_resolvida = case when resposta = 'contestado' and contestacao_resolvida is null
                                   then 'anulado'::resolucao_contestacao else contestacao_resolvida end,
      contestacao_resolvida_em = case when resposta = 'contestado' and contestacao_resolvida is null
                                      then now() else contestacao_resolvida_em end
  where id = c.id;

  insert into log_admin (adm_id, acao, alvo, antes, depois)
  values (auth.uid(), case when v_anulando then 'anular_confronto' else 'rejeitar_confronto' end,
          'confrontos:' || c.id, to_jsonb(c),
          jsonb_build_object('status', 'rejeitado', 'motivo_rejeicao', trim(p_motivo),
                             'pontos_desfeitos', case when v_anulando and c.conta_pontos then c.variacao else 0 end));
end;
$$;

-- Corrigir placar e rounds (pendente ou aprovado). Se já aprovado, troca os pontos antigos pelos
-- do placar corrigido, calculados com os pontos que os clãs tinham na aprovação.
create function public.corrigir_confronto(p_confronto uuid, p_partidas_a integer, p_partidas_b integer, p_rounds jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  c confrontos%rowtype;
  v_total integer;
  v_antes jsonb;
  v_conta boolean;
  v_delta integer;
begin
  if not is_admin() then
    raise exception 'Apenas o ADM pode corrigir resultados.';
  end if;

  select * into c from confrontos where id = p_confronto for update;
  if not found then
    raise exception 'Confronto não encontrado.';
  end if;
  if c.status = 'rejeitado' then
    raise exception 'Este confronto foi rejeitado; não dá para corrigir.';
  end if;

  perform _validar_placar(p_partidas_a, p_partidas_b, p_rounds);
  v_total := p_partidas_a + p_partidas_b;

  select jsonb_build_object(
           'partidas_a', c.partidas_a, 'partidas_b', c.partidas_b,
           'conta_pontos', c.conta_pontos, 'variacao', c.variacao,
           'rounds', coalesce(jsonb_agg(jsonb_build_object('a', rounds_a, 'b', rounds_b) order by numero), '[]'::jsonb))
    into v_antes
  from partidas where confronto_id = c.id;

  -- Atualiza as partidas no lugar (mantém os prints das que continuam existindo).
  for i in 1 .. v_total loop
    update partidas
    set rounds_a = (p_rounds -> (i - 1) ->> 'a')::integer, rounds_b = (p_rounds -> (i - 1) ->> 'b')::integer
    where confronto_id = c.id and numero = i;
    if not found then
      insert into partidas (confronto_id, numero, rounds_a, rounds_b)
      values (c.id, i, (p_rounds -> (i - 1) ->> 'a')::integer, (p_rounds -> (i - 1) ->> 'b')::integer);
    end if;
  end loop;
  delete from partidas where confronto_id = c.id and numero > v_total;

  update confrontos set partidas_a = p_partidas_a, partidas_b = p_partidas_b where id = c.id;

  v_conta := c.conta_pontos;
  v_delta := c.variacao;
  if c.status = 'aprovado' then
    perform _travar_pontos(c.temporada_id, c.cla_a_id, c.cla_b_id);
    if c.conta_pontos and coalesce(c.variacao, 0) <> 0 then
      perform _aplicar_pontos(c.temporada_id, c.cla_a_id, c.cla_b_id, -c.variacao);
    end if;
    v_conta := _conta_pontos(c.id, c.cla_a_id, c.cla_b_id, c.data, v_total);
    v_delta := case when v_conta
                    then calcular_variacao_elo(c.pontos_a_antes, c.pontos_b_antes, p_partidas_a, p_partidas_b)
                    else 0 end;
    perform _aplicar_pontos(c.temporada_id, c.cla_a_id, c.cla_b_id, v_delta);
    update confrontos set conta_pontos = v_conta, variacao = v_delta where id = c.id;
  end if;

  if c.resposta = 'contestado' and c.contestacao_resolvida is null then
    update confrontos set contestacao_resolvida = 'corrigido', contestacao_resolvida_em = now() where id = c.id;
  end if;

  insert into log_admin (adm_id, acao, alvo, antes, depois)
  values (auth.uid(), 'corrigir_confronto', 'confrontos:' || c.id, v_antes,
          jsonb_build_object('partidas_a', p_partidas_a, 'partidas_b', p_partidas_b, 'rounds', p_rounds,
                             'conta_pontos', v_conta, 'variacao', v_delta));

  return jsonb_build_object('conta_pontos', v_conta, 'variacao', v_delta);
end;
$$;

revoke execute on function public.responder_confronto(uuid, boolean, text) from public, anon;
revoke execute on function public.manter_confronto(uuid) from public, anon;
revoke execute on function public.corrigir_confronto(uuid, integer, integer, jsonb) from public, anon;
grant execute on function public.responder_confronto(uuid, boolean, text) to authenticated;
grant execute on function public.manter_confronto(uuid) to authenticated;
grant execute on function public.corrigir_confronto(uuid, integer, integer, jsonb) to authenticated;
