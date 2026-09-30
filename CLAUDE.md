@AGENTS.md

# Elite Knifers — Ranking de Clãs @79

Site de ranking de ~25 clãs da comunidade Knifer (modo @79 do Point Blank). Líderes enviam
resultados com prints, o ADM aprova e o ranking da temporada se atualiza.

## Fonte da verdade

- **`ESPECIFICACAO.md` manda.** Regra de negócio nova ou alterada: atualize a especificação
  primeiro, depois o código. Se o código e a especificação divergirem, pergunte antes de "consertar".
- Construímos por fases (seção "Fases de construção" da especificação). Não adiante funcionalidades
  de fases futuras sem pedido — mas a estrutura (tabelas, tipos) já pode nascer preparada.
- O usuário pede uma parte por vez, testa no navegador e só então segue. Faça commits pequenos,
  um por parte funcionando.

## Status

- [x] **Fase 1 — Base no ar**: cadastro/login, clãs pelo ADM com líder e sublíder, envio de
  resultado com prints e rounds, fila de aprovação, Elo na aprovação, ranking com pódio e tabela,
  perfil do clã com últimos 20 confrontos. (Extras mínimos para navegar: Início, lista de clãs,
  página do confronto.)
- [x] Fase 2 — Competição completa:
  - [x] Confirmação/contestação pelo adversário (12h a partir do envio), "Minhas pendências",
    ADM mantém/anula/corrige (inclui corrigir placar antes de aprovar).
  - [x] Temporadas: ADM encerra e abre a próxima (`nova_temporada`), reset, título de campeão
    (= `posicao_final` 1), abas do ranking: atual, anteriores, geral histórico
  - [x] Comparação clã x clã (`/comparar?a=TAG&b=TAG`, cálculo em `src/lib/estatisticas.ts`)
  - [x] Estatísticas completas do clã no perfil (temporada/geral via `?visao=geral`, rivais,
    `/clas/[tag]/confrontos` com todos) — cálculo em `src/lib/estatisticas.ts › estatisticasDoCla`
  - [x] "Como funciona" (regras dos modos em `src/lib/regras.ts`; números da pontuação vêm de `elo.ts`)
- [x] Fase 3 — Comunidade (Discord e desafios adiados pelo usuário):
  - [x] Campeonatos: `/campeonatos[/id]`, ADM cadastra e define colocações (`titulos`), selos no
    perfil (`SeloTitulo`), próximo campeonato no Início
  - [x] Líder gerencia o clã em `/meu-cla`: pedidos de entrada (`pedidos_entrada`), remover membro,
    nomear sublíder, editar logo/bio/redes; jogador pede entrada no perfil do clã e sai; perfil do
    jogador `/jogadores/[nick]` com histórico de clãs
  - [ ] Desafios entre clãs — adiado pelo usuário (proposta pendente: desafio com data/modo, aceitar/recusar, sem bônus)
- [ ] Fase 4 — em andamento:
  - [x] `/jogadores`: lista dos jogadores com o clã ao lado (ordem alfabética, busca e filtro por
    clã) — decisão do usuário: por enquanto sem estatísticas
  - [ ] Estatísticas individuais (frags, mortes, MVP) e ranking por elas — regras a definir
    (proposta feita: cada clã digita os números dos seus jogadores a partir dos prints; MVP
    automático; ranking por K/D com mínimo de partidas). Tabela `estatisticas_jogador` já existe.

## Stack e comandos

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · Supabase (Postgres, Auth,
Storage) via `@supabase/ssr` · Vitest · deploy na Vercel.

```bash
npm run dev          # localhost:3000 (precisa de .env.local — ver .env.example)
npm test             # vitest: src/lib/*.test.ts
npm run test:sql     # Postgres descartável; cada supabase/tests/*_test.sql roda num banco limpo
npm run lint
npm run typecheck    # rode `npx next typegen` antes se PageProps/LayoutProps não existirem
npm run build
```

Antes de commitar: `npm test`, `npm run test:sql` (se mexeu em SQL), `npm run lint`, `npm run typecheck`.

**Next.js 16 é diferente do que você conhece**: `middleware` virou `src/proxy.ts`; `params` e
`searchParams` são Promises; tipos globais `PageProps<"/rota">`/`LayoutProps`. Na dúvida, leia
`node_modules/next/dist/docs/`.

## Estrutura

```
supabase/migrations/   SQL do banco (tabelas, RLS, funções, buckets). Um arquivo novo por mudança.
supabase/tests/        stub do Supabase + testes SQL (scripts/testar-sql.sh)
src/proxy.ts           renova a sessão do Supabase a cada requisição
src/lib/elo.ts         fórmula do Elo (espelho de public.calcular_variacao_elo)
src/lib/confronto.ts   validação de placar/rounds (espelho de public.enviar_confronto)
src/lib/ranking.ts     monta a tabela: V/E/D, aproveitamento, saldo, desempate, mínimo de 3 confrontos
src/lib/dados.ts       consultas compartilhadas (temporada ativa, ranking, últimos confrontos)
src/lib/sessao.ts      obterSessao(): usuário logado, clã, cargo, ehAdmin, podeEnviar
src/lib/tipos.ts       formato das linhas do banco (manter em sincronia com o SQL)
src/lib/supabase/      clientes servidor/navegador e urlPublica()
src/components/        UI compartilhada (menu, pódio, tabela, lista de confrontos…)
src/app/               rotas: / · /ranking · /clas · /clas/[tag][/confrontos] · /confrontos/[id] · /enviar · /pendencias · /como-funciona · /comparar
                       /entrar · /cadastrar · /auth/confirm · /admin · /admin/clas[/novo|/[id]] · /admin/temporadas · /admin/campeonatos[/id]
                       /campeonatos[/id] · /meu-cla · /jogadores[/nick]
```

## Como o banco funciona (importante)

- **Leitura é pública** (RLS `select using (true)`), exceto `log_admin` (só ADM).
- **Escritas sensíveis passam por funções `security definer`** que conferem cargo e regras:
  `enviar_confronto`, `responder_confronto`, `aprovar_confronto`, `rejeitar_confronto` (também
  anula aprovado), `manter_confronto`, `corrigir_confronto`, `definir_lideranca`, `remover_membro` (ADM ou líder), `nova_temporada`, `pedir_entrada`,
  `cancelar_pedido`, `responder_pedido`, `sair_do_cla`, `nomear_sublider`, `editar_perfil_cla`.
  Auxiliares internas começam com `_` (`_aplicar_pontos`, `_conta_pontos`…) e não ficam expostas na API. Nunca abra `insert/update` direto nessas tabelas para usuários comuns.
  Escritas simples do ADM (clãs, temporadas) usam RLS com `is_admin()`.
- **Confronto tem duas colunas de estado**: `status` = decisão do ADM (`pendente`/`aprovado`/`rejeitado`)
  e `resposta` = adversário (`aguardando`/`confirmado`/`contestado`). "Sem resposta" não é gravado:
  é `aguardando` com mais de 12h desde `enviado_em` (`src/lib/confronto.ts › estadoResposta`).
  Contestação aberta = `contestado` com `contestacao_resolvida` nula → aviso "Contestado".
- **O Elo é gravado só pelo banco**, em `aprovar_confronto`/`corrigir_confronto`/`rejeitar_confronto` (linhas travadas, tudo numa transação,
  com registro em `log_admin`). `src/lib/elo.ts` existe para prévias na tela e testes. Mudou a
  fórmula? Mude os dois e os testes dos dois (`elo.test.ts` e `fase1_test.sql`).
- As validações do formulário (`src/lib/confronto.ts`) são repetidas no SQL; o SQL é quem garante.
- **O usuário roda as migrações à mão** no SQL Editor do Supabase. Push no branch principal publica
  na Vercel na hora: com migração nova, peça para ele rodar o SQL **antes** do push e liste no README.
- **Migrações são imutáveis depois de aplicadas**: crie um arquivo novo em `supabase/migrations/`
  (prefixo de data) em vez de editar um antigo. Rode `npm run test:sql` e acrescente testes em
  `supabase/tests/`.
- O cliente Supabase não tem tipos gerados: use `.overrideTypes<Tipo[], { merge: false }>()` /
  `.maybeSingle<Tipo>()` com os tipos de `src/lib/tipos.ts` e `garantir()` para lançar erros.
- Prints: bucket público `prints`, caminho `<uid>/<uuid>.webp`, comprimidos no navegador
  (`src/lib/imagem.ts`, máx. 1920 px) e com SHA-256 do arquivo original em `prints.hash`.
  Logos: bucket `logos`, pasta `clas/`, 512 px.

## Decisões tomadas onde a especificação deixava em aberto

- O ADM não espera o adversário: aprova quando quiser e o resultado já conta. O adversário tem 12h
  do envio para confirmar/contestar, mesmo depois de aprovado (decisão do usuário, já na especificação).
- Anular desfaz só a variação daquele confronto; corrigir recalcula com `pontos_a_antes/pontos_b_antes`
  (os pontos da época da aprovação). O `pico` não é reduzido ao desfazer.
- "Mesmo confronto" (envio duplicado): par de clãs com resultado pendente a até 2h do horário informado.
- "Primeiro confronto do dia": dia no horário de Brasília; decidido na ordem de aprovação
  (vale o primeiro aprovado que contou pontos). A fila do ADM é ordenada pela data do confronto.
- Rounds são obrigatórios; uma partida válida tem um lado com 9 e o outro de 0 a 8. Máx. 15 partidas.
- Print repetido: bloqueado se o mesmo hash estiver em resultado não rejeitado (reenvio após
  rejeição pode reusar o print).
- Aproveitamento = (V + E/2) ÷ confrontos. Coluna "Sequência" mostra os últimos 5 resultados.
- Estatísticas: "sequência atual" = resultado repetido nos confrontos mais recentes; "maior vitória" =
  maior diferença de partidas (a mais recente no empate); rivais ordenados por confrontos. Pico da
  temporada vem de `pontos_temporada.pico`; pico geral, do replay do Elo geral.
- @mix e @79 contam no mesmo ranking; o envio não registra o modo.
- Empate total nos critérios de desempate divide a posição.
- O e-mail fica só em `auth.users` (não é público); `usuarios` não tem coluna email.
- Ranking geral histórico não é gravado: `obterRankingGeral` recalcula o Elo em TS (`calcularEloGeral`)
  aplicando os confrontos aprovados que valeram pontos, em ordem de `decidido_em`.
- Encerrar temporada é bloqueado enquanto houver confronto `pendente` nela. As posições finais vêm do
  ranking calculado pelo site (`obterRanking`) e vão para `nova_temporada`; o título de campeão é
  `pontos_temporada.posicao_final = 1` (a tabela `titulos` fica para os campeonatos da Fase 3).
- Consultas que podem passar de 1000 linhas usam `buscarTodos` (paginação) em `src/lib/dados.ts`.
- Identidade: nome "Elite Knifers" (`src/lib/config.ts`); logo = kukri com chamas em
  `src/components/logo-faca.tsx` (mesmo desenho no favicon `src/app/icon.svg`); destaque laranja-fogo
  em `src/app/globals.css` (`@theme`). Botão de destaque usa texto escuro (contraste). "Contestado"
  usa o vermelho de derrota para não se confundir com o destaque.

## Convenções

- Código de domínio, nomes e textos em **português** (pt-BR); termos do glossário da
  especificação (clã, confronto, partida, round, temporada).
- **Pensado primeiro para celular**: teste em ~390 px de largura. Tema escuro sempre.
- Tailwind 4: tokens de cor/fonte em `@theme` e classes próprias (`btn-destaque`, `campo`,
  `cartao`, `titulo-secao`…) como `@utility` em `globals.css`. Fontes: Oswald (títulos) e Inter.
- Server Components buscam dados; Client Components só onde há interação. Server Actions ficam
  em `actions.ts` ao lado da rota e sempre conferem a sessão/cargo antes de agir.
- Imagens do Supabase usam `<img>` simples (já vêm comprimidas; evita a cota de otimização da Vercel).
