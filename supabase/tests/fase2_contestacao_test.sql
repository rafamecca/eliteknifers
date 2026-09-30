-- Testes da confirmação/contestação (migração 20261001000000). Rodar com scripts/testar-sql.sh.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create function pg_temp.esperar(v_obtido anyelement, v_esperado anyelement, v_nome text)
returns void language plpgsql as $$
begin
  if v_obtido is distinct from v_esperado then
    raise exception 'FALHOU %: esperado %, obtido %', v_nome, v_esperado, v_obtido;
  end if;
end $$;

create function pg_temp.esperar_erro(v_sql text, v_trecho text)
returns void language plpgsql as $$
begin
  execute v_sql;
  raise exception 'FALHOU: deveria dar erro "%": %', v_trecho, v_sql;
exception when others then
  if sqlerrm like 'FALHOU%' or position(v_trecho in sqlerrm) = 0 then
    raise exception 'FALHOU: esperado erro "%", veio "%"', v_trecho, sqlerrm;
  end if;
end $$;

-- Pontos atuais de um clã na temporada ativa
create function pg_temp.pts(v_cla uuid) returns integer language sql as $$
  select coalesce((select pontos from pontos_temporada p join temporadas t on t.id = p.temporada_id
                   where t.ativa and p.cla_id = v_cla), 1000)
$$;

-- ---------------------------------------------------------------------------
-- Dados: ADM e 4 clãs, cada um com um líder (u1..u4); u5 é sublíder do clã 2
-- ---------------------------------------------------------------------------
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"nick":"Admin"}'),
  ('00000000-0000-0000-0000-000000000001', '{"nick":"L1"}'),
  ('00000000-0000-0000-0000-000000000002', '{"nick":"L2"}'),
  ('00000000-0000-0000-0000-000000000003', '{"nick":"L3"}'),
  ('00000000-0000-0000-0000-000000000004', '{"nick":"L4"}'),
  ('00000000-0000-0000-0000-000000000005', '{"nick":"S2"}');
update usuarios set papel = 'adm' where nick = 'Admin';
insert into clas (id, nome, tag) values
  ('10000000-0000-0000-0000-000000000001', 'Clã Um', 'UM'),
  ('10000000-0000-0000-0000-000000000002', 'Clã Dois', 'DOIS'),
  ('10000000-0000-0000-0000-000000000003', 'Clã Três', 'TRES'),
  ('10000000-0000-0000-0000-000000000004', 'Clã Quatro', 'QUATRO');
insert into membros_cla (usuario_id, cla_id, cargo) values
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'lider'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'lider'),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'lider'),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'lider'),
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'sublider');
insert into storage.objects (bucket_id, name)
select 'prints', '00000000-0000-0000-0000-00000000000' || u || '/p' || n || '.webp'
from generate_series(1, 4) u, generate_series(1, 6) n;

-- Envia <a> x <b> 3x0 como líder do clã <a>, print n
create function pg_temp.enviar(v_a int, v_b int, v_n int, v_pa int default 3, v_pb int default 0)
returns uuid language plpgsql as $$
declare v_id uuid; v_rounds jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || v_a, false);
  select jsonb_agg(case when i <= v_pa then '{"a":9,"b":5}'::jsonb else '{"a":5,"b":9}'::jsonb end order by i)
    into v_rounds from generate_series(1, v_pa + v_pb) i;
  v_id := enviar_confronto(('10000000-0000-0000-0000-00000000000' || v_b)::uuid, now() - interval '1 hour', v_pa, v_pb, v_rounds,
    jsonb_build_array(jsonb_build_object('arquivo', '00000000-0000-0000-0000-00000000000' || v_a || '/p' || v_n || '.webp',
                                         'hash', repeat(to_hex(v_a * 16 + v_n), 32), 'partida', null)));
  return v_id;
end $$;

create function pg_temp.como(v_usuario text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', v_usuario, false) $$;

set role authenticated;

-- ---------------------------------------------------------------------------
-- Resposta do adversário
-- ---------------------------------------------------------------------------
select pg_temp.enviar(1, 2, 1) as x \gset
select pg_temp.esperar((select status::text || '/' || resposta::text from confrontos where id = :'x'), 'pendente/aguardando', 'novo envio');

select pg_temp.como('00000000-0000-0000-0000-000000000001');
select pg_temp.esperar_erro(format('select responder_confronto(%L, true)', :'x'), 'clã adversário');
select pg_temp.como('00000000-0000-0000-0000-000000000003');
select pg_temp.esperar_erro(format('select responder_confronto(%L, true)', :'x'), 'clã adversário');
select pg_temp.como('00000000-0000-0000-0000-000000000005'); -- sublíder do adversário pode
select pg_temp.esperar_erro(format('select responder_confronto(%L, false, %L)', :'x', ' '), 'motivo');
select responder_confronto(:'x', false, 'Foi 2x1, não 3x0');
select pg_temp.esperar((select resposta::text || '/' || motivo_contestacao from confrontos where id = :'x'),
  'contestado/Foi 2x1, não 3x0', 'contestado com motivo');
select pg_temp.esperar_erro(format('select responder_confronto(%L, true)', :'x'), 'já foi respondido');

-- ADM ainda não aprovou: manter não se aplica; aprovar fecha a contestação como "mantido"
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select pg_temp.esperar_erro(format('select manter_confronto(%L)', :'x'), 'pela fila');
select aprovar_confronto(:'x');
select pg_temp.esperar((select contestacao_resolvida::text from confrontos where id = :'x'), 'mantido', 'aprovar resolve contestação');

-- Prazo de 12h a partir do envio
select pg_temp.enviar(3, 4, 1) as prazo \gset
reset role;
update confrontos set enviado_em = now() - interval '13 hours' where id = :'prazo';
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000000004');
select pg_temp.esperar_erro(format('select responder_confronto(%L, true)', :'prazo'), 'prazo de 12h');

-- Confirmar
reset role;
update confrontos set enviado_em = now() where id = :'prazo';
set role authenticated;
select responder_confronto(:'prazo', true);
select pg_temp.esperar((select resposta::text from confrontos where id = :'prazo'), 'confirmado', 'confirmado');

-- Rejeitado não pode ser respondido
select pg_temp.enviar(1, 3, 2) as rej \gset
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select rejeitar_confronto(:'rej', 'Print ilegível');
select pg_temp.como('00000000-0000-0000-0000-000000000003');
select pg_temp.esperar_erro(format('select responder_confronto(%L, true)', :'rej'), 'rejeitado');

-- ---------------------------------------------------------------------------
-- Contestação depois de aprovado → Manter
-- ---------------------------------------------------------------------------
select pg_temp.enviar(1, 3, 3) as y \gset
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select aprovar_confronto(:'y');
select pg_temp.pts('10000000-0000-0000-0000-000000000001') as p1_antes \gset
select pg_temp.como('00000000-0000-0000-0000-000000000003');
select responder_confronto(:'y', false, 'Jogador irregular');
select pg_temp.esperar((select status::text from confrontos where id = :'y'), 'aprovado', 'continua aprovado após contestação');
select pg_temp.como('00000000-0000-0000-0000-000000000003');
select pg_temp.esperar_erro(format('select manter_confronto(%L)', :'y'), 'Apenas o ADM');
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select manter_confronto(:'y');
select pg_temp.esperar((select contestacao_resolvida::text from confrontos where id = :'y'), 'mantido', 'mantido');
select pg_temp.esperar(pg_temp.pts('10000000-0000-0000-0000-000000000001'), :p1_antes, 'manter não mexe nos pontos');
select pg_temp.esperar_erro(format('select manter_confronto(%L)', :'y'), 'não tem contestação aberta');

-- ---------------------------------------------------------------------------
-- Contestação depois de aprovado → Anular (desfaz só os pontos dele)
-- ---------------------------------------------------------------------------
select pg_temp.pts('10000000-0000-0000-0000-000000000002') as p2_0 \gset
select pg_temp.pts('10000000-0000-0000-0000-000000000003') as p3_0 \gset
select pg_temp.enviar(2, 3, 1) as z \gset
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select (aprovar_confronto(:'z') ->> 'variacao')::int as dz \gset
select pg_temp.esperar(:dz <> 0, true, 'z valeu pontos');
select pg_temp.como('00000000-0000-0000-0000-000000000003');
select responder_confronto(:'z', false, 'Não jogamos');
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select rejeitar_confronto(:'z', 'Confronto não aconteceu');
select pg_temp.esperar((select status::text || '/' || contestacao_resolvida::text from confrontos where id = :'z'),
  'rejeitado/anulado', 'anulado');
select pg_temp.esperar(pg_temp.pts('10000000-0000-0000-0000-000000000002'), :p2_0, 'pontos do clã 2 voltaram');
select pg_temp.esperar(pg_temp.pts('10000000-0000-0000-0000-000000000003'), :p3_0, 'pontos do clã 3 voltaram');
select pg_temp.esperar((select acao from log_admin order by data desc, acao limit 1), 'anular_confronto', 'log de anulação');

-- ---------------------------------------------------------------------------
-- Contestação depois de aprovado → Corrigir (3x0 vira 2x1)
-- ---------------------------------------------------------------------------
select pg_temp.enviar(2, 4, 2) as w \gset
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select aprovar_confronto(:'w');
select pontos_a_antes as wa, pontos_b_antes as wb from confrontos where id = :'w' \gset
select pg_temp.como('00000000-0000-0000-0000-000000000004');
select responder_confronto(:'w', false, 'Foi 2x1');
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select pg_temp.esperar_erro(format('select corrigir_confronto(%L, 2, 1, %L)', :'w', '[{"a":9,"b":1},{"a":9,"b":2},{"a":9,"b":3}]'),
  'pelos rounds ficou 3x0');
select corrigir_confronto(:'w', 2, 1, '[{"a":9,"b":1},{"a":9,"b":2},{"a":4,"b":9}]');
select pg_temp.esperar((select variacao from confrontos where id = :'w'), calcular_variacao_elo(:wa, :wb, 2, 1), 'variação recalculada');
select pg_temp.esperar(pg_temp.pts('10000000-0000-0000-0000-000000000002'), :wa + calcular_variacao_elo(:wa, :wb, 2, 1), 'clã 2 com pontos corrigidos');
select pg_temp.esperar(pg_temp.pts('10000000-0000-0000-0000-000000000004'), :wb - calcular_variacao_elo(:wa, :wb, 2, 1), 'clã 4 com pontos corrigidos');
select pg_temp.esperar((select partidas_a || 'x' || partidas_b || '/' || contestacao_resolvida from confrontos where id = :'w'),
  '2x1/corrigido', 'placar corrigido');
select pg_temp.esperar((select string_agg(rounds_a || '-' || rounds_b, ',' order by numero) from partidas where confronto_id = :'w'),
  '9-1,9-2,4-9', 'rounds corrigidos');

-- Corrigir para menos de 3 partidas: deixa de valer pontos
select corrigir_confronto(:'w', 1, 1, '[{"a":9,"b":1},{"a":4,"b":9}]');
select pg_temp.esperar((select conta_pontos::text || '/' || variacao from confrontos where id = :'w'), 'false/0', 'menos de 3 partidas');
select pg_temp.esperar(pg_temp.pts('10000000-0000-0000-0000-000000000004'), :wb, 'clã 4 volta aos pontos de antes');
select pg_temp.esperar((select count(*) from partidas where confronto_id = :'w')::int, 2, 'partida extra removida');

-- Corrigir um pendente não mexe em pontos
select pg_temp.enviar(3, 1, 4) as pend \gset
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select corrigir_confronto(:'pend', 3, 1, '[{"a":9,"b":1},{"a":9,"b":2},{"a":4,"b":9},{"a":9,"b":0}]');
select pg_temp.esperar((select status::text || '/' || partidas_a || 'x' || partidas_b from confrontos where id = :'pend'),
  'pendente/3x1', 'pendente corrigido');
select pg_temp.esperar((select variacao from confrontos where id = :'pend'), null::int, 'sem pontos ainda');

-- Não-ADM não corrige; funções internas não são acessíveis
select pg_temp.como('00000000-0000-0000-0000-000000000001');
select pg_temp.esperar_erro(format('select corrigir_confronto(%L, 3, 0, %L)', :'pend', '[]'), 'Apenas o ADM');
select pg_temp.esperar_erro($$select _aplicar_pontos(gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 100)$$, 'permission denied');

reset role;
