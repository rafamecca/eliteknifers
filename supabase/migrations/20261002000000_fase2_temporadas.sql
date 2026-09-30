-- =============================================================================
-- Fase 2 · Temporadas (ESPECIFICACAO.md › Temporadas)
--
-- O ADM encerra a temporada ativa e abre a próxima num passo só:
--   - grava a posição final de cada clã (calculada pelo site com as regras do ranking);
--   - cada clã começa a nova com metade da distância que tinha de 1000;
--   - o campeão (posição final 1) aparece com título no perfil.
-- O ranking geral histórico é calculado pelo site a partir dos confrontos aprovados.
-- Só adiciona funções: o site antigo continua funcionando com ou sem esta migração.
-- =============================================================================

-- Pontos de largada na temporada seguinte: 1100 → 1050, 940 → 970.
-- Espelhado em src/lib/elo.ts › pontosNaNovaTemporada.
create function public.pontos_na_nova_temporada(p_pontos integer)
returns integer
language sql immutable
as $$
  select round(1000 + (p_pontos - 1000) / 2.0)::integer;
$$;

-- p_posicoes: {"<cla_id>": posicao, ...} — só os clãs classificados (quem não tem fica sem posição).
create function public.nova_temporada(p_nome text, p_inicio date, p_fim date, p_posicoes jsonb default '{}'::jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_atual temporadas%rowtype;
  v_nova uuid;
  v_pendentes integer;
begin
  if not is_admin() then
    raise exception 'Apenas o ADM pode abrir temporadas.';
  end if;
  if nullif(trim(p_nome), '') is null then
    raise exception 'Dê um nome para a nova temporada.';
  end if;
  if p_inicio is null or p_fim is null or p_fim < p_inicio then
    raise exception 'Datas da nova temporada inválidas.';
  end if;
  if jsonb_typeof(coalesce(p_posicoes, '{}'::jsonb)) <> 'object' then
    raise exception 'Posições finais inválidas.';
  end if;

  select * into v_atual from temporadas where ativa for update;
  if found then
    select count(*) into v_pendentes from confrontos where temporada_id = v_atual.id and status = 'pendente';
    if v_pendentes > 0 then
      raise exception 'Ainda há % resultado(s) aguardando o ADM nesta temporada. Aprove ou rejeite antes de encerrar.', v_pendentes;
    end if;

    update pontos_temporada p
    set posicao_final = (coalesce(p_posicoes, '{}'::jsonb) ->> p.cla_id::text)::integer
    where p.temporada_id = v_atual.id;

    update temporadas set ativa = false, fim = greatest(inicio, current_date) where id = v_atual.id;
  end if;

  insert into temporadas (nome, inicio, fim, ativa)
  values (trim(p_nome), p_inicio, p_fim, true)
  returning id into v_nova;

  if v_atual.id is not null then
    insert into pontos_temporada (cla_id, temporada_id, pontos, pico)
    select cla_id, v_nova, pontos_na_nova_temporada(pontos), pontos_na_nova_temporada(pontos)
    from pontos_temporada
    where temporada_id = v_atual.id;
  end if;

  insert into log_admin (adm_id, acao, alvo, antes, depois)
  values (auth.uid(), 'nova_temporada', 'temporadas:' || v_nova,
          case when v_atual.id is null then null
               else jsonb_build_object('encerrada', v_atual.id, 'nome', v_atual.nome, 'posicoes', p_posicoes) end,
          jsonb_build_object('nome', trim(p_nome), 'inicio', p_inicio, 'fim', p_fim));

  return v_nova;
end;
$$;

revoke execute on function public.nova_temporada(text, date, date, jsonb) from public, anon;
grant execute on function public.nova_temporada(text, date, date, jsonb) to authenticated;
