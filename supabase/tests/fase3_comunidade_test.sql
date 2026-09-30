-- Testes de campeonatos e gestão do clã (migração 20261003000000). Rodar com scripts/testar-sql.sh.
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

create function pg_temp.como(v_usuario text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', v_usuario, false) $$;

-- Dados: ADM, líder do UM (L1), líder do DOIS (L2), jogadores J1, J2 sem clã
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"nick":"Admin"}'),
  ('00000000-0000-0000-0000-000000000001', '{"nick":"L1"}'),
  ('00000000-0000-0000-0000-000000000002', '{"nick":"L2"}'),
  ('00000000-0000-0000-0000-000000000003', '{"nick":"J1"}'),
  ('00000000-0000-0000-0000-000000000004', '{"nick":"J2"}');
update usuarios set papel = 'adm' where nick = 'Admin';
insert into clas (id, nome, tag) values
  ('10000000-0000-0000-0000-000000000001', 'Clã Um', 'UM'),
  ('10000000-0000-0000-0000-000000000002', 'Clã Dois', 'DOIS');
insert into membros_cla (usuario_id, cla_id, cargo) values
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'lider'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'lider');

set role authenticated;

-- ---------------------------------------------------------------------------
-- Campeonatos
-- ---------------------------------------------------------------------------
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
insert into campeonatos (id, nome, data) values ('30000000-0000-0000-0000-000000000001', 'Copa Knifer', current_date);
insert into titulos (campeonato_id, cla_id, colocacao) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 2);
select pg_temp.esperar_erro($$insert into titulos (campeonato_id, cla_id, colocacao)
  values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 3)$$, 'titulos_um_por_cla');
delete from titulos where cla_id = '10000000-0000-0000-0000-000000000002';
select pg_temp.esperar((select count(*) from titulos)::int, 1, 'ADM apaga título');

select pg_temp.como('00000000-0000-0000-0000-000000000001');
select pg_temp.esperar_erro($$insert into campeonatos (nome) values ('Pirata')$$, 'row-level security');
delete from titulos;
select pg_temp.esperar((select count(*) from titulos)::int, 1, 'líder não apaga título');

-- ---------------------------------------------------------------------------
-- Pedidos de entrada
-- ---------------------------------------------------------------------------
select pg_temp.como('00000000-0000-0000-0000-000000000001');
select pg_temp.esperar_erro($$select pedir_entrada('10000000-0000-0000-0000-000000000002')$$, 'já está num clã');

select pg_temp.como('00000000-0000-0000-0000-000000000003');
select pedir_entrada('10000000-0000-0000-0000-000000000001') as p1 \gset
select pg_temp.esperar_erro($$select pedir_entrada('10000000-0000-0000-0000-000000000002')$$, 'já tem um pedido aberto');
select cancelar_pedido(:'p1');
select pedir_entrada('10000000-0000-0000-0000-000000000001') as p2 \gset

select pg_temp.como('00000000-0000-0000-0000-000000000004');
select pedir_entrada('10000000-0000-0000-0000-000000000001') as p3 \gset
-- J2 não vê o pedido do J1
select pg_temp.esperar((select count(*) from pedidos_entrada)::int, 1, 'jogador vê só o próprio pedido');

-- Líder do outro clã não responde; líder do clã vê e responde
select pg_temp.como('00000000-0000-0000-0000-000000000002');
select pg_temp.esperar((select count(*) from pedidos_entrada)::int, 0, 'outro líder não vê');
select pg_temp.esperar_erro(format('select responder_pedido(%L, true)', :'p2'), 'Só o líder do clã');
select pg_temp.como('00000000-0000-0000-0000-000000000001');
select pg_temp.esperar((select count(*) from pedidos_entrada where status = 'pendente')::int, 2, 'líder vê os pedidos do clã');
select responder_pedido(:'p2', true);
select responder_pedido(:'p3', false);
select pg_temp.esperar((select cargo::text from membros_cla where usuario_id = '00000000-0000-0000-0000-000000000003' and saiu_em is null),
  'membro', 'J1 entrou como membro');
select pg_temp.esperar((select status::text from pedidos_entrada where id = :'p3'), 'recusado', 'J2 recusado');
select pg_temp.esperar_erro(format('select responder_pedido(%L, true)', :'p2'), 'não está mais aberto');

-- ---------------------------------------------------------------------------
-- Sublíder, remover, sair
-- ---------------------------------------------------------------------------
select pg_temp.como('00000000-0000-0000-0000-000000000003');
select pg_temp.esperar_erro($$select nomear_sublider('00000000-0000-0000-0000-000000000003')$$, 'Só o líder');
select pg_temp.como('00000000-0000-0000-0000-000000000001');
select pg_temp.esperar_erro($$select nomear_sublider('00000000-0000-0000-0000-000000000004')$$, 'membro do clã');
select nomear_sublider('00000000-0000-0000-0000-000000000003');
select pg_temp.esperar((select cargo::text from membros_cla where usuario_id = '00000000-0000-0000-0000-000000000003' and saiu_em is null),
  'sublider', 'J1 sublíder');
select nomear_sublider(null);
select pg_temp.esperar((select cargo::text from membros_cla where usuario_id = '00000000-0000-0000-0000-000000000003' and saiu_em is null),
  'membro', 'J1 volta a membro');

select pg_temp.esperar_erro($$select remover_membro('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')$$, 'a si mesmo');
select pg_temp.esperar_erro($$select remover_membro('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002')$$, 'Só o líder do clã ou o ADM');
select pg_temp.esperar_erro($$select sair_do_cla()$$, 'líder não pode sair');
select remover_membro('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');
select pg_temp.esperar((select count(*) from membros_cla where usuario_id = '00000000-0000-0000-0000-000000000003' and saiu_em is null)::int,
  0, 'líder removeu J1');

-- J2 entra no DOIS e sai sozinho; o histórico fica
select pg_temp.como('00000000-0000-0000-0000-000000000004');
select pedir_entrada('10000000-0000-0000-0000-000000000002') as p4 \gset
select pg_temp.como('00000000-0000-0000-0000-000000000002');
select responder_pedido(:'p4', true);
select pg_temp.como('00000000-0000-0000-0000-000000000004');
select sair_do_cla();
select pg_temp.esperar_erro($$select sair_do_cla()$$, 'não está em nenhum clã');
select pg_temp.esperar((select count(*) from membros_cla where usuario_id = '00000000-0000-0000-0000-000000000004')::int,
  1, 'histórico guardado');

-- ---------------------------------------------------------------------------
-- Perfil do clã pelo líder
-- ---------------------------------------------------------------------------
select pg_temp.como('00000000-0000-0000-0000-000000000002');
select pg_temp.esperar_erro($$select editar_perfil_cla('10000000-0000-0000-0000-000000000001', null, 'x', '{}')$$, 'Só o líder do clã');
select pg_temp.como('00000000-0000-0000-0000-000000000001');
select pg_temp.esperar_erro($$select editar_perfil_cla('10000000-0000-0000-0000-000000000001', null, 'x', '{"discord":"javascript:alert(1)"}')$$, 'Link inválido');
select pg_temp.esperar_erro($$select editar_perfil_cla('10000000-0000-0000-0000-000000000001', null, 'x', '{"tiktok":"https://t.co"}')$$, 'Link inválido');
select pg_temp.esperar_erro($$select editar_perfil_cla('10000000-0000-0000-0000-000000000001', '../x.png', 'x', '{}')$$, 'Logo inválido');
select editar_perfil_cla('10000000-0000-0000-0000-000000000001', 'clas/10000000-0000-0000-0000-000000000001/a.webp',
  '  Bio nova  ', '{"discord":"https://discord.gg/um"}');
select pg_temp.esperar((select bio || '|' || (redes ->> 'discord') || '|' || logo from clas where tag = 'UM'),
  'Bio nova|https://discord.gg/um|clas/10000000-0000-0000-0000-000000000001/a.webp', 'perfil editado');
select pg_temp.esperar((select nome from clas where tag = 'UM'), 'Clã Um', 'nome continua');

-- Logo: líder envia só na pasta do próprio clã
insert into storage.objects (bucket_id, name) values ('logos', 'clas/10000000-0000-0000-0000-000000000001/b.webp');
select pg_temp.esperar_erro($$insert into storage.objects (bucket_id, name) values ('logos', 'clas/10000000-0000-0000-0000-000000000002/b.webp')$$,
  'row-level security');

-- Funções internas não ficam expostas
select pg_temp.esperar_erro($$select _meu_cla(array['lider']::cargo_cla[])$$, 'permission denied');

reset role;
