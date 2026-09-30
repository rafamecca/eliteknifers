-- Testes da migração da Fase 1. Rodar com scripts/testar-sql.sh.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create function pg_temp.esperar(v_obtido anyelement, v_esperado anyelement, v_nome text)
returns void language plpgsql as $$
begin
  if v_obtido is distinct from v_esperado then
    raise exception 'FALHOU %: esperado %, obtido %', v_nome, v_esperado, v_obtido;
  end if;
end $$;

-- Roda um SQL e confere que ele falha com uma mensagem contendo o trecho esperado.
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

-- ---------------------------------------------------------------------------
-- Elo: exemplos da especificação
-- ---------------------------------------------------------------------------
select pg_temp.esperar(calcular_variacao_elo(1000, 1000, 5, 1), 21, 'elo 5x1');
select pg_temp.esperar(calcular_variacao_elo(1000, 1000, 3, 2), 18, 'elo 3x2');
select pg_temp.esperar(calcular_variacao_elo(1000, 1200, 3, 2), 27, 'elo zebra 3x2');
select pg_temp.esperar(calcular_variacao_elo(1200, 1000, 5, 0), 12, 'elo favorito 5x0');
select pg_temp.esperar(calcular_variacao_elo(1000, 1000, 1, 5), -21, 'elo derrota 1x5');
select pg_temp.esperar(calcular_variacao_elo(1000, 1000, 2, 2), 0, 'elo empate igual');
select pg_temp.esperar(calcular_variacao_elo(1000, 1200, 2, 2), 8, 'elo empate contra forte');

-- ---------------------------------------------------------------------------
-- Dados: 1 ADM, líderes de SwK e KnR, um jogador comum
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'adm@x.com', '{"nick":"Admin"}'),
  ('00000000-0000-0000-0000-000000000001', 'l1@x.com', '{"nick":"LiderSwK"}'),
  ('00000000-0000-0000-0000-000000000002', 'l2@x.com', '{"nick":"LiderKnR"}'),
  ('00000000-0000-0000-0000-000000000003', 'j@x.com', '{"nick":"Jogador"}');
update usuarios set papel = 'adm' where nick = 'Admin';
select pg_temp.esperar((select count(*) from usuarios)::int, 4, 'trigger cria perfis');
select pg_temp.esperar(nick_disponivel('lidERswk'), false, 'nick é único sem diferenciar maiúsculas');

insert into clas (id, nome, tag) values
  ('10000000-0000-0000-0000-000000000001', 'Swiss Knifers', 'SwK'),
  ('10000000-0000-0000-0000-000000000002', 'Knife Riders', 'KnR');

-- Prints já enviados ao storage
insert into storage.objects (bucket_id, name) values
  ('prints', '00000000-0000-0000-0000-000000000001/placar1.webp'),
  ('prints', '00000000-0000-0000-0000-000000000001/p1.webp'),
  ('prints', '00000000-0000-0000-0000-000000000001/placar2.webp'),
  ('prints', '00000000-0000-0000-0000-000000000001/placar3.webp'),
  ('prints', '00000000-0000-0000-0000-000000000002/placar4.webp');

-- ---------------------------------------------------------------------------
-- Como ADM: liderança
-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

select definir_lideranca('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', null);
select definir_lideranca('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
select pg_temp.esperar_erro(
  $$select definir_lideranca('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', null)$$,
  'já está no clã KnR');
-- Troca: o sublíder vira líder e o antigo líder fica como membro
select definir_lideranca('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002');
select pg_temp.esperar(
  (select cargo::text from membros_cla where usuario_id = '00000000-0000-0000-0000-000000000003' and saiu_em is null),
  'lider', 'troca de líder');
select definir_lideranca('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', null);
select pg_temp.esperar(
  (select cargo::text from membros_cla where usuario_id = '00000000-0000-0000-0000-000000000003' and saiu_em is null),
  'membro', 'ex-líder vira membro');
select pg_temp.esperar((select count(*) from log_admin)::int, 4, 'log da liderança');

-- ---------------------------------------------------------------------------
-- Como jogador comum: não envia, não aprova, não escreve direto
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select pg_temp.esperar_erro(
  $$select enviar_confronto('10000000-0000-0000-0000-000000000001', now(), 3, 0, '[]', '[]')$$,
  'Só o líder ou o sublíder');
select pg_temp.esperar_erro(
  $$select aprovar_confronto(gen_random_uuid())$$, 'Apenas o ADM');
select pg_temp.esperar_erro(
  $$insert into clas (nome, tag) values ('Hack', 'HCK')$$, 'row-level security');
update pontos_temporada set pontos = 9999;
select pg_temp.esperar((select count(*) from pontos_temporada where pontos = 9999)::int, 0, 'RLS bloqueia update');
select pg_temp.esperar_erro(
  $$insert into storage.objects (bucket_id, name) values ('prints', '00000000-0000-0000-0000-000000000003/x.webp')$$,
  'row-level security');

-- ---------------------------------------------------------------------------
-- Como líder do SwK: validações de envio
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

select pg_temp.esperar_erro($$select enviar_confronto('10000000-0000-0000-0000-000000000002', now() - interval '25 hours', 1, 0,
  '[{"a":9,"b":3}]', '[{"arquivo":"00000000-0000-0000-0000-000000000001/placar1.webp","hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","partida":null}]')$$,
  'prazo para enviar é de 24h');
select pg_temp.esperar_erro($$select enviar_confronto('10000000-0000-0000-0000-000000000001', now(), 1, 0,
  '[{"a":9,"b":3}]', '[]')$$, 'clã adversário válido');
select pg_temp.esperar_erro($$select enviar_confronto('10000000-0000-0000-0000-000000000002', now(), 2, 1,
  '[{"a":9,"b":3},{"a":9,"b":8}]', '[]')$$, 'rounds de todas as 3 partidas');
select pg_temp.esperar_erro($$select enviar_confronto('10000000-0000-0000-0000-000000000002', now(), 2, 1,
  '[{"a":9,"b":3},{"a":9,"b":8},{"a":9,"b":1}]', '[]')$$, 'pelos rounds ficou 3x0');
select pg_temp.esperar_erro($$select enviar_confronto('10000000-0000-0000-0000-000000000002', now(), 2, 1,
  '[{"a":9,"b":3},{"a":9,"b":9},{"a":1,"b":9}]', '[]')$$, 'Partida 2: rounds inválidos');
select pg_temp.esperar_erro($$select enviar_confronto('10000000-0000-0000-0000-000000000002', now(), 2, 1,
  '[{"a":9,"b":3},{"a":9,"b":8},{"a":1,"b":9}]', '[]')$$, 'exatamente um print do placar');
select pg_temp.esperar_erro($$select enviar_confronto('10000000-0000-0000-0000-000000000002', now(), 2, 1,
  '[{"a":9,"b":3},{"a":9,"b":8},{"a":1,"b":9}]',
  '[{"arquivo":"00000000-0000-0000-0000-000000000001/naoexiste.webp","hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","partida":null}]')$$,
  'não foi encontrado');
select pg_temp.esperar_erro($$select enviar_confronto('10000000-0000-0000-0000-000000000002', now(), 2, 1,
  '[{"a":9,"b":3},{"a":9,"b":8},{"a":1,"b":9}]',
  '[{"arquivo":"00000000-0000-0000-0000-000000000002/placar4.webp","hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","partida":null}]')$$,
  'não foi encontrado');

-- Envio válido: SwK 2x1 KnR, com print de uma partida
select enviar_confronto('10000000-0000-0000-0000-000000000002', now() - interval '1 hour', 2, 1,
  '[{"a":9,"b":3},{"a":9,"b":8},{"a":1,"b":9}]',
  '[{"arquivo":"00000000-0000-0000-0000-000000000001/placar1.webp","hash":"1111111111111111111111111111111111111111111111111111111111111111","partida":null},
    {"arquivo":"00000000-0000-0000-0000-000000000001/p1.webp","hash":"2222222222222222222222222222222222222222222222222222222222222222","partida":2}]',
  'teste') as primeiro \gset
select pg_temp.esperar((select count(*) from partidas where confronto_id = :'primeiro')::int, 3, 'partidas criadas');
select pg_temp.esperar((select numero from partidas p join prints pr on pr.partida_id = p.id where pr.confronto_id = :'primeiro')::int,
  2, 'print ligado à partida 2');

-- Duplicado pendente (mesmo horário)
select pg_temp.esperar_erro($$select enviar_confronto('10000000-0000-0000-0000-000000000002', now() - interval '30 minutes', 3, 0,
  '[{"a":9,"b":3},{"a":9,"b":8},{"a":9,"b":1}]',
  '[{"arquivo":"00000000-0000-0000-0000-000000000001/placar2.webp","hash":"3333333333333333333333333333333333333333333333333333333333333333","partida":null}]')$$,
  'Já existe um resultado pendente');

-- O print já usado é bloqueado
select pg_temp.esperar_erro($$select enviar_confronto('10000000-0000-0000-0000-000000000002', now() - interval '5 hours', 3, 0,
  '[{"a":9,"b":3},{"a":9,"b":8},{"a":9,"b":1}]',
  '[{"arquivo":"00000000-0000-0000-0000-000000000001/placar2.webp","hash":"1111111111111111111111111111111111111111111111111111111111111111","partida":null}]')$$,
  'já foi usado em outro resultado');

-- Líder não apaga do storage um print que já está num confronto, mas apaga um solto
reset role;
insert into storage.objects (bucket_id, name) values ('prints', '00000000-0000-0000-0000-000000000001/solto.webp');
set role authenticated;
delete from storage.objects where name in ('00000000-0000-0000-0000-000000000001/placar1.webp',
  '00000000-0000-0000-0000-000000000001/solto.webp');
reset role;
select pg_temp.esperar((select count(*) from storage.objects where name like '%/placar1.webp')::int, 1, 'print em uso fica');
select pg_temp.esperar((select count(*) from storage.objects where name like '%/solto.webp')::int, 0, 'print solto é apagado');
set role authenticated;

-- ---------------------------------------------------------------------------
-- Como ADM: aprovação calcula o Elo
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.esperar(aprovar_confronto(:'primeiro'), '{"variacao": 19, "conta_pontos": true}'::jsonb, 'aprova 2x1');
select pg_temp.esperar((select pontos from pontos_temporada where cla_id = '10000000-0000-0000-0000-000000000001'), 1019, 'SwK +19');
select pg_temp.esperar((select pontos from pontos_temporada where cla_id = '10000000-0000-0000-0000-000000000002'), 981, 'KnR -19');
select pg_temp.esperar((select pico from pontos_temporada where cla_id = '10000000-0000-0000-0000-000000000002'), 1000, 'pico do KnR fica 1000');
select pg_temp.esperar_erro(format('select aprovar_confronto(%L)', :'primeiro'), 'já foi decidido');

-- Segundo confronto no mesmo dia (enviado pelo KnR): entra no histórico, mas não vale pontos
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select enviar_confronto('10000000-0000-0000-0000-000000000001', now() - interval '10 minutes', 3, 0,
  '[{"a":9,"b":3},{"a":9,"b":8},{"a":9,"b":1}]',
  '[{"arquivo":"00000000-0000-0000-0000-000000000002/placar4.webp","hash":"4444444444444444444444444444444444444444444444444444444444444444","partida":null}]')
  as segundo \gset
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.esperar(aprovar_confronto(:'segundo'), '{"variacao": 0, "conta_pontos": false}'::jsonb, 'segundo do dia não conta');
select pg_temp.esperar((select pontos from pontos_temporada where cla_id = '10000000-0000-0000-0000-000000000002'), 981, 'KnR segue 981');

-- Rejeição: exige motivo; depois o print pode ser reaproveitado
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select enviar_confronto('10000000-0000-0000-0000-000000000002', now() - interval '20 hours', 1, 1,
  '[{"a":9,"b":3},{"a":2,"b":9}]',
  '[{"arquivo":"00000000-0000-0000-0000-000000000001/placar2.webp","hash":"5555555555555555555555555555555555555555555555555555555555555555","partida":null}]')
  as terceiro \gset
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.esperar_erro(format('select rejeitar_confronto(%L, %L)', :'terceiro', '  '), 'motivo');
select rejeitar_confronto(:'terceiro', 'Placar errado');
select pg_temp.esperar((select status::text from confrontos where id = :'terceiro'), 'rejeitado', 'rejeitado');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select enviar_confronto('10000000-0000-0000-0000-000000000002', now() - interval '20 hours', 1, 1,
  '[{"a":9,"b":3},{"a":2,"b":9}]',
  '[{"arquivo":"00000000-0000-0000-0000-000000000001/placar3.webp","hash":"5555555555555555555555555555555555555555555555555555555555555555","partida":null}]')
  as quarto \gset
-- Menos de 3 partidas não vale pontos (e é empate)
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.esperar(aprovar_confronto(:'quarto'), '{"variacao": 0, "conta_pontos": false}'::jsonb, 'menos de 3 partidas');

-- Remover membro
select remover_membro('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
select pg_temp.esperar((select count(*) from membros_cla where usuario_id = '00000000-0000-0000-0000-000000000003' and saiu_em is null)::int,
  0, 'membro removido');

-- Visitante não vê o log do ADM
reset role;
set request.jwt.claim.sub = '';
set role anon;
select pg_temp.esperar((select count(*) from log_admin)::int, 0, 'log invisível ao visitante');
select pg_temp.esperar((select count(*) from confrontos)::int, 4, 'confrontos públicos');

reset role;
