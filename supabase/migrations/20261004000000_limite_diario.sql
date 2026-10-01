-- =============================================================================
-- Limite diário de pontos (ESPECIFICACAO.md › Regras do ranking)
-- Cada clã tem no máximo 3 confrontos valendo pontos por dia (horário de Brasília), somando
-- todos os adversários. Continua valendo só o primeiro do dia entre o mesmo par de clãs.
-- Só troca a regra usada por aprovar_confronto/corrigir_confronto; nada muda para trás.
-- =============================================================================

create or replace function public._conta_pontos(p_confronto uuid, p_cla_a uuid, p_cla_b uuid, p_data timestamptz, p_total integer)
returns boolean
language sql stable
as $$
  with do_dia as (
    select o.cla_a_id, o.cla_b_id
    from public.confrontos o
    where o.id <> p_confronto
      and o.status = 'aprovado'
      and o.conta_pontos
      and (o.cla_a_id in (p_cla_a, p_cla_b) or o.cla_b_id in (p_cla_a, p_cla_b))
      and (o.data at time zone 'America/Sao_Paulo')::date = (p_data at time zone 'America/Sao_Paulo')::date
  )
  select p_total >= 3
    -- primeiro do dia entre o par
    and not exists (
      select 1 from do_dia
      where least(cla_a_id, cla_b_id) = least(p_cla_a, p_cla_b)
        and greatest(cla_a_id, cla_b_id) = greatest(p_cla_a, p_cla_b)
    )
    -- os dois clãs abaixo de 3 confrontos com pontos no dia
    and (select count(*) from do_dia where p_cla_a in (cla_a_id, cla_b_id)) < 3
    and (select count(*) from do_dia where p_cla_b in (cla_a_id, cla_b_id)) < 3;
$$;

revoke execute on function public._conta_pontos(uuid, uuid, uuid, timestamptz, integer) from public, anon, authenticated;
