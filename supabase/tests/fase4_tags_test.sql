-- Testes das tags de jogador (migração 20261005000000). Rodar com scripts/testar-sql.sh.
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

-- Tags de um jogador, em ordem, separadas por vírgula
create function pg_temp.tags_de(v_nick text) returns text language sql as $$
  select coalesce(string_agg(t.nome, ',' order by t.ordem, t.nome), '')
  from tags_usuario tu join tags t on t.id = tu.tag_id join usuarios u on u.id = tu.usuario_id
  where u.nick = v_nick $$;

-- Dados: Coder (CODER e ADM), Adm (só ADM), Jog (jogador)
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000c', '{"nick":"Coder"}'),
  ('00000000-0000-0000-0000-00000000000a', '{"nick":"Adm"}'),
  ('00000000-0000-0000-0000-000000000001', '{"nick":"Jog"}');
update usuarios set papel = 'adm' where nick in ('Coder', 'Adm');
insert into coders (usuario_id) values ('00000000-0000-0000-0000-00000000000c');

set role authenticated;

-- Automáticas
select pg_temp.esperar(pg_temp.tags_de('Coder'), 'CODER,ADM', 'coder tem CODER e ADM');
select pg_temp.esperar(pg_temp.tags_de('Adm'), 'ADM', 'ADM recebe a tag sozinho');
select pg_temp.esperar(pg_temp.tags_de('Jog'), '', 'jogador sem tags');

-- ADM que não é CODER não mexe em nada, nem vira CODER pela API
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select pg_temp.esperar_erro($$insert into tags (nome, cor) values ('LENDA', '#ffd700')$$, 'row-level security');
select pg_temp.esperar_erro($$insert into coders (usuario_id) values ('00000000-0000-0000-0000-00000000000a')$$, 'row-level security');
update tags set cor = '#000000' where nome = 'ADM';
select pg_temp.esperar((select cor from tags where nome = 'ADM'), '#f06a1c', 'ADM não edita tag');
select pg_temp.esperar(is_coder(), false, 'ADM não é coder');

-- CODER cria, edita, dá e tira
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select pg_temp.esperar(is_coder(), true, 'é coder');
insert into tags (id, nome, cor, ordem) values ('20000000-0000-0000-0000-000000000001', 'LENDA', '#ffd700', 2);
select pg_temp.esperar_erro($$insert into tags (nome, cor) values ('lenda', '#ffffff')$$, 'tags_nome_unico');
select pg_temp.esperar_erro($$insert into tags (nome, cor) values ('X', 'vermelho')$$, 'tags_cor_check');
select pg_temp.esperar_erro($$insert into tags (nome, cor, automatica) values ('Y', '#ffffff', 'adm')$$, 'row-level security');
insert into usuarios_tags (usuario_id, tag_id) values ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
select pg_temp.esperar(pg_temp.tags_de('Jog'), 'LENDA', 'Jog ganhou LENDA');

-- Automáticas: não se dá à mão, não se apaga, não deixa de ser automática; nome e cor mudam
select pg_temp.esperar_erro(
  $$insert into usuarios_tags (usuario_id, tag_id) select '00000000-0000-0000-0000-000000000001', id from tags where automatica = 'adm'$$,
  'row-level security');
delete from tags where automatica = 'adm';
select pg_temp.esperar((select count(*) from tags where automatica = 'adm')::int, 1, 'automática não se apaga');
select pg_temp.esperar_erro($$update tags set automatica = null where nome = 'ADM'$$, 'permission denied');
update tags set nome = 'STAFF', cor = '#ff0000' where automatica = 'adm';
select pg_temp.esperar(pg_temp.tags_de('Adm'), 'STAFF', 'automática renomeada');

delete from usuarios_tags where usuario_id = '00000000-0000-0000-0000-000000000001';
select pg_temp.esperar(pg_temp.tags_de('Jog'), '', 'tag tirada');
insert into usuarios_tags (usuario_id, tag_id) values ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
delete from tags where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.esperar((select count(*) from usuarios_tags)::int, 0, 'apagar tag tira de todos');

-- Visitante só lê
reset role;
set role anon;
select pg_temp.como('');
select pg_temp.esperar(pg_temp.tags_de('Coder'), 'CODER,STAFF', 'visitante vê as tags');
select pg_temp.esperar_erro($$insert into tags (nome, cor) values ('Z', '#ffffff')$$, 'row-level security');

-- Banido perde as automáticas
reset role;
update usuarios set banido = true where nick = 'Coder';
select pg_temp.esperar(pg_temp.tags_de('Coder'), '', 'banido sem tags automáticas');
