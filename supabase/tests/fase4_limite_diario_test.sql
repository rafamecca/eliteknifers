-- Testes do limite de 3 confrontos com pontos por clã por dia (migração 20261004000000).
-- Rodar com scripts/testar-sql.sh.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create function pg_temp.esperar(v_obtido anyelement, v_esperado anyelement, v_nome text)
returns void language plpgsql as $$
begin
  if v_obtido is distinct from v_esperado then
    raise exception 'FALHOU %: esperado %, obtido %', v_nome, v_esperado, v_obtido;
  end if;
end $$;

-- Dados: ADM e 6 clãs (UM..SEIS) com um líder cada
insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000a', '{"nick":"Admin"}');
update usuarios set papel = 'adm' where nick = 'Admin';
insert into auth.users (id, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, jsonb_build_object('nick', 'L' || n) from generate_series(1, 6) n;
insert into clas (id, nome, tag)
select ('10000000-0000-0000-0000-00000000000' || n)::uuid, 'Clã ' || n, 'C' || n from generate_series(1, 6) n;
insert into membros_cla (usuario_id, cla_id, cargo)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, ('10000000-0000-0000-0000-00000000000' || n)::uuid, 'lider'
from generate_series(1, 6) n;

-- Cria um confronto pendente <a> x <b> 3x0 no horário <quando> (Brasília) e aprova como ADM.
-- Devolve se valeu pontos.
create function pg_temp.jogar(v_a int, v_b int, v_quando text, v_pa int default 3, v_pb int default 0)
returns boolean language plpgsql as $$
declare v_id uuid;
begin
  reset role;
  insert into confrontos (temporada_id, cla_a_id, cla_b_id, partidas_a, partidas_b, data, enviado_por)
  values ((select id from temporadas where ativa),
          ('10000000-0000-0000-0000-00000000000' || v_a)::uuid, ('10000000-0000-0000-0000-00000000000' || v_b)::uuid,
          v_pa, v_pb, (v_quando || ' America/Sao_Paulo')::timestamptz,
          ('00000000-0000-0000-0000-00000000000' || v_a)::uuid)
  returning id into v_id;
  set role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
  return (aprovar_confronto(v_id) ->> 'conta_pontos')::boolean;
end $$;

create function pg_temp.pts(v_cla int) returns integer language sql as $$
  select coalesce((select pontos from pontos_temporada p join temporadas t on t.id = p.temporada_id
                   where t.ativa and p.cla_id = ('10000000-0000-0000-0000-00000000000' || v_cla)::uuid), 1000)
$$;

-- Dia 1: o clã 1 joga contra 2, 2 de novo, 3 e 4 (às 23h30, ainda o mesmo dia em Brasília)
select pg_temp.esperar(pg_temp.jogar(1, 2, '2026-10-01 14:00'), true, '1º do clã 1');
select pg_temp.esperar(pg_temp.jogar(1, 2, '2026-10-01 15:00'), false, 'repetido com o mesmo par');
select pg_temp.esperar(pg_temp.jogar(3, 1, '2026-10-01 16:00'), true, '2º do clã 1 (como clã B)');
select pg_temp.esperar(pg_temp.jogar(1, 4, '2026-10-01 23:30'), true, '3º do clã 1');

-- Limite do clã 1 atingido: não vale nem como A nem como B, e o adversário não ganha nada
select pg_temp.esperar(pg_temp.jogar(5, 1, '2026-10-01 18:00'), false, 'clã 1 no limite (como B)');
select pg_temp.esperar(pg_temp.jogar(1, 6, '2026-10-01 19:00'), false, 'clã 1 no limite (como A)');
select pg_temp.esperar(pg_temp.pts(5), 1000, 'clã 5 sem pontos');
select pg_temp.esperar(pg_temp.pts(6), 1000, 'clã 6 sem pontos');

-- Outros clãs seguem normais no mesmo dia
select pg_temp.esperar(pg_temp.jogar(5, 6, '2026-10-01 20:00'), true, '5 x 6 vale');

-- Dia seguinte (00h30 em Brasília) zera a conta
select pg_temp.esperar(pg_temp.jogar(1, 6, '2026-10-02 00:30'), true, 'novo dia');

-- Anular um que valeu libera vaga para o próximo aprovado, sem mudar os que já foram decididos
select pg_temp.esperar((select conta_pontos from confrontos
                        where cla_a_id = '10000000-0000-0000-0000-000000000005' and cla_b_id = '10000000-0000-0000-0000-000000000001'),
                       false, 'antes de anular');
select rejeitar_confronto(id, 'teste') from confrontos
where cla_a_id = '10000000-0000-0000-0000-000000000003' and cla_b_id = '10000000-0000-0000-0000-000000000001';
select pg_temp.esperar((select conta_pontos from confrontos
                        where cla_a_id = '10000000-0000-0000-0000-000000000005' and cla_b_id = '10000000-0000-0000-0000-000000000001'),
                       false, 'o já decidido não muda');
select pg_temp.esperar(pg_temp.jogar(4, 1, '2026-10-01 21:00', 2, 1), false, 'par 1x4 já valeu no dia');
select pg_temp.esperar(pg_temp.jogar(1, 3, '2026-10-01 22:00'), true, 'vaga liberada pela anulação');

-- Corrigir um que valeu mantém a vaga dele (não se conta contra si mesmo)
select corrigir_confronto(id, 3, 1, '[{"a":9,"b":1},{"a":9,"b":2},{"a":3,"b":9},{"a":9,"b":0}]'::jsonb)
from confrontos
where cla_a_id = '10000000-0000-0000-0000-000000000001' and cla_b_id = '10000000-0000-0000-0000-000000000004';
select pg_temp.esperar((select conta_pontos from confrontos
                        where cla_a_id = '10000000-0000-0000-0000-000000000001' and cla_b_id = '10000000-0000-0000-0000-000000000004'),
                       true, 'corrigido continua valendo');

reset role;
