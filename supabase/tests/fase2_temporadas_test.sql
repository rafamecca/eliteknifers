-- Testes das temporadas (migração 20261002000000). Rodar com scripts/testar-sql.sh.
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

-- Reset: metade da distância até 1000
select pg_temp.esperar(pontos_na_nova_temporada(1100), 1050, 'reset 1100');
select pg_temp.esperar(pontos_na_nova_temporada(940), 970, 'reset 940');
select pg_temp.esperar(pontos_na_nova_temporada(1000), 1000, 'reset 1000');
select pg_temp.esperar(pontos_na_nova_temporada(1037), 1019, 'reset 1037 (18,5 arredonda para cima)');
select pg_temp.esperar(pontos_na_nova_temporada(963), 982, 'reset 963 (−18,5 arredonda para longe de zero)');

-- Dados
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"nick":"Admin"}'),
  ('00000000-0000-0000-0000-000000000001', '{"nick":"L1"}');
update usuarios set papel = 'adm' where nick = 'Admin';
insert into clas (id, nome, tag) values
  ('10000000-0000-0000-0000-000000000001', 'Clã Um', 'UM'),
  ('10000000-0000-0000-0000-000000000002', 'Clã Dois', 'DOIS'),
  ('10000000-0000-0000-0000-000000000003', 'Clã Três', 'TRES');
insert into membros_cla (usuario_id, cla_id, cargo) values
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'lider');
select id as t1 from temporadas where ativa \gset
insert into pontos_temporada (cla_id, temporada_id, pontos, pico) values
  ('10000000-0000-0000-0000-000000000001', :'t1', 1100, 1120),
  ('10000000-0000-0000-0000-000000000002', :'t1', 940, 1000),
  ('10000000-0000-0000-0000-000000000003', :'t1', 960, 1000);
-- Um confronto pendente na temporada
insert into confrontos (temporada_id, cla_a_id, cla_b_id, partidas_a, partidas_b, data, enviado_por)
values (:'t1', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 3, 0, now(),
        '00000000-0000-0000-0000-000000000001')
returning id as pendente \gset

set role authenticated;

-- Só ADM
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select pg_temp.esperar_erro($$select nova_temporada('T2', current_date, current_date + 90)$$, 'Apenas o ADM');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.esperar_erro($$select nova_temporada(' ', current_date, current_date + 90)$$, 'nome');
select pg_temp.esperar_erro($$select nova_temporada('T2', current_date, current_date - 1)$$, 'Datas');
-- Pendente bloqueia
select pg_temp.esperar_erro($$select nova_temporada('T2', current_date, current_date + 90)$$, 'aguardando o ADM');
select rejeitar_confronto(:'pendente', 'teste');

select nova_temporada('Temporada 2', current_date, current_date + 90,
  '{"10000000-0000-0000-0000-000000000001": 1, "10000000-0000-0000-0000-000000000003": 2}') as t2 \gset

select pg_temp.esperar((select count(*) from temporadas where ativa)::int, 1, 'uma temporada ativa');
select pg_temp.esperar((select id from temporadas where ativa), :'t2'::uuid, 'nova é a ativa');
select pg_temp.esperar((select string_agg(coalesce(posicao_final::text, '-'), ',' order by cla_id)
  from pontos_temporada where temporada_id = :'t1'), '1,-,2', 'posições finais gravadas');
select pg_temp.esperar((select string_agg(pontos || '/' || pico, ',' order by cla_id)
  from pontos_temporada where temporada_id = :'t2'), '1050/1050,970/970,980/980', 'pontos da nova temporada');
select pg_temp.esperar((select acao from log_admin order by data desc limit 1), 'nova_temporada', 'log');

-- Envio novo cai na temporada nova
reset role;
insert into storage.objects (bucket_id, name) values ('prints', '00000000-0000-0000-0000-000000000001/x.webp');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select enviar_confronto('10000000-0000-0000-0000-000000000002', now() - interval '1 hour', 3, 0,
  '[{"a":9,"b":1},{"a":9,"b":2},{"a":9,"b":3}]',
  '[{"arquivo":"00000000-0000-0000-0000-000000000001/x.webp","hash":"abababababababababababababababababababababababababababababababab","partida":null}]') as novo \gset
select pg_temp.esperar((select temporada_id from confrontos where id = :'novo'), :'t2'::uuid, 'envio na temporada nova');

-- Aprovar na nova usa os pontos resetados
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.esperar((aprovar_confronto(:'novo') ->> 'variacao')::int, calcular_variacao_elo(1050, 970, 3, 0), 'Elo com pontos resetados');

reset role;
