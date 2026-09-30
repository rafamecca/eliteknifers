# Especificação — Site de Ranking de Clãs @79

Sep 30, 2026 · @Di Vigneto

## Visão geral

Um site de ranking para cerca de 25 clãs da comunidade Knifer, no modo @79 do Point Blank. Líderes enviam o resultado de cada confronto com prints, o clã adversário confirma, o ADM aprova e o ranking da temporada se atualiza sozinho.

O site tem ranking por temporada (trimestral) e ranking geral histórico, perfil de cada clã, comparação clã x clã, campeonatos organizados pelo ADM e contas para todos os jogadores. Estatísticas individuais de jogadores ficam para uma fase futura, mas a estrutura já nasce preparada para elas.

### Glossário

| Termo | Significado |
| --- | --- |
| Clã | Grupo de jogadores com tag, logo, líder e sublíder. Ex.: SwK, KnR. |
| Round | Unidade dentro de uma partida. Uma partida vai até 9 rounds. |
| Partida | Um jogo completo até 9 rounds. Ex.: 9x6. |
| Confronto | Série de partidas entre dois clãs, sem número fixo. O placar do confronto conta partidas ganhas. Ex.: 5x1. |
| Temporada | Período de 3 meses com ranking próprio, que é resetado ao final. |
| Campeonato | Torneio organizado pelo ADM, que gera títulos para os clãs. |

## Modos de jogo

Os clãs combinam entre si qual dos dois modos vão jogar. Confrontos dos dois modos contam no mesmo ranking.

| Modo | Liberado | Proibido |
| --- | --- | --- |
| @mix | Máscara palhaço, colete 5%, Fang Blade (pesada), machete (1 por time), gordão. | Máscara de dano com machete, troca rápida, colete acima de 5%, qualquer tipo de HP+, Fang Blade (leve), boneca, WP Smoke. |
| @79 | Máscara palhaço, colete 5%, troca rápida, Fang Blade (leve e pesada), machete (1 por time), gordão e boneca. | Máscara de dano com machete, colete acima de 5%, qualquer tipo de HP+, WP Smoke. |

## Tipos de usuário e permissões

Só líder e sublíder mexem em resultados; qualquer jogador pode ter conta e aparecer no elenco do seu clã.

| Tipo | O que pode fazer |
| --- | --- |
| Visitante | Ver ranking, perfis, confrontos, comparações e campeonatos. |
| Jogador | Tudo do visitante + ter perfil próprio, pedir entrada em um clã e sair dele. |
| Sublíder | Tudo do jogador + enviar resultados e confirmar ou contestar resultados enviados contra o clã. |
| Líder | Tudo do sublíder + editar perfil do clã (logo, bio, redes), aceitar e remover membros, nomear o sublíder. |
| ADM | Aprovar ou rejeitar confrontos, resolver contestações, criar temporadas e campeonatos, cadastrar títulos, banir contas e editar qualquer dado. |

Um jogador pertence a no máximo um clã por vez. Cada troca de clã fica registrada no histórico do jogador.

### Gestão do clã

- O jogador sem clã pede para entrar pelo perfil do clã; só pode ter um pedido aberto por vez e pode cancelá-lo.
- O líder aceita ou recusa os pedidos, remove membros e nomeia (ou tira) o sublíder entre os membros do clã.
- O líder edita logo, bio e redes do clã. Nome e tag continuam com o ADM.
- Qualquer membro pode sair do clã, menos o líder: para trocar de líder, o ADM define o novo.

### Campeonatos

- O ADM cadastra cada campeonato (nome, data, descrição) e as colocações dos clãs (1º, 2º, 3º…).
- As colocações viram títulos no perfil do clã (Campeão, Vice, 3º lugar), junto com os títulos de campeão de temporada.

## Páginas do site

Navegação por menu lateral fixo (no celular vira menu recolhível), com botões Entrar e Cadastrar no rodapé do menu.

| Página | O que mostra |
| --- | --- |
| Home | Destaque da temporada atual, top 3 clãs, últimos confrontos aprovados, próximo campeonato. |
| Ranking | Pódio dos 3 primeiros em cards grandes e tabela com posição, clã, pontos, V/E/D, aproveitamento e sequência. Abas: Temporada atual, Temporadas anteriores, Geral histórico. |
| Clãs | Lista de todos os clãs com logo, tag, posição e busca. |
| Perfil do clã | Logo, tag, bio, redes, data de fundação, líder e elenco; títulos; estatísticas da temporada e gerais; pico no ranking; últimos 20 confrontos com botão "ver todos"; maiores rivais. |
| Comparação | Escolhe dois clãs e vê o confronto direto: vitórias de cada lado, partidas, saldo de rounds, último resultado e a lista de todos os confrontos entre eles. |
| Confronto | Detalhe de um confronto: placar, cada partida com rounds, prints, variação de pontos de cada clã, data e status. |
| Campeonatos | Lista de campeonatos com campeão, vice e data; página de cada campeonato. |
| Como funciona | Regras do @79, do envio de resultados e da pontuação. |
| Enviar resultado | Formulário para líder e sublíder (ver fluxo abaixo). |
| Minhas pendências | Resultados aguardando confirmação do clã e contestações abertas. |
| Perfil do jogador | Nick, clã atual e histórico de clãs. Futuramente, estatísticas. |
| Painel ADM | Fila de aprovação, contestações, temporadas, campeonatos, clãs, usuários e banimentos. |

## Fluxo de envio e aprovação

O ADM decide se o resultado vale; o clã adversário tem 12h, contadas a partir do envio, para confirmar ou contestar. As duas coisas correm em paralelo: o ADM pode aprovar sem esperar a resposta, e o resultado já entra no ranking.

- Se o adversário contestar (mesmo depois da aprovação), o confronto continua valendo e aparece com o aviso **Contestado** ao lado, até o ADM avaliar.
- Se o adversário não responder em 12h, fica **Sem resposta** e o resultado segue normalmente.
- Contestações chegam para o ADM com destaque. Ele escolhe uma de três saídas:
  - **Manter**: o resultado fica como está e o aviso some.
  - **Anular**: o confronto passa a Rejeitado e os pontos que ele deu são desfeitos (só os dele; os outros confrontos não mudam).
  - **Corrigir**: o ADM ajusta placar e/ou rounds; os pontos antigos são desfeitos e os do placar corrigido são aplicados, calculados com os pontos que os clãs tinham quando o confronto foi aprovado.

### O que o formulário pede

1. Clã adversário (lista dos clãs cadastrados).
2. Data e hora do confronto.
3. Placar do confronto em partidas. Ex.: 5x1.
4. Rounds de cada partida (ex.: 9x6, 9x8, 4x9...). O site gera um campo por partida conforme o placar e confere se o total bate.
5. Print do placar do confronto (obrigatório).
6. Prints do final de cada partida, com rounds e frags (opcional, recomendado). Esses prints já servem de base para as estatísticas de jogadores no futuro.
7. Observação livre, por exemplo "clã adversário saiu na 6ª partida".

### Status de um confronto

Cada confronto tem a decisão do ADM e a resposta do adversário, que andam separadas.

| Decisão do ADM | Quando acontece |
| --- | --- |
| Aguardando ADM | Logo após o envio. |
| Aprovado | O ADM aprovou. Pontos e estatísticas são atualizados. |
| Rejeitado | O ADM rejeitou (ou anulou após contestação) com motivo. Não conta em nada; se já tinha contado pontos, eles são desfeitos. |

| Resposta do adversário | Quando acontece |
| --- | --- |
| Aguardando adversário | Logo após o envio. O líder ou sublíder adversário vê o resultado em "Minhas pendências". |
| Confirmado | O adversário confirmou dentro das 12h. |
| Contestado | O adversário contestou dentro das 12h e escreveu o motivo. Aviso "Contestado" ao lado do confronto até o ADM avaliar. |
| Sem resposta | Passaram 12h do envio sem resposta. Não dá mais para confirmar nem contestar. |

### Regras de envio

- Prazo de 24h após o confronto para enviar.
- Só um dos dois clãs envia; se o outro tentar enviar o mesmo confronto, o site avisa que já existe um pendente.
- Prints são comprimidos no envio, e o site bloqueia um print idêntico a outro já enviado.
- O ADM pode corrigir placar ou rounds antes ou depois de aprovar, e toda edição fica registrada no log.

## Pontuação, temporadas e estatísticas

A posição no ranking vem de um Elo calculado por confronto, com bônus pela margem de vitória. Ganhar de um clã forte vale mais que ganhar de um fraco, e séries longas não dão pontos extras.

### Fórmula

Todo clã começa com 1000 pontos. Para um confronto entre A e B, primeiro calcula-se a chance esperada de A vencer:

```latex
E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}
```

Depois, a variação de pontos de A (B recebe o mesmo valor com sinal invertido):

```latex
\Delta = \text{arredondar}\left(K \cdot M \cdot (S - E_A)\right)
```

- R = pontos atuais de cada clã.
- K = 32 (quanto os pontos se movem por confronto).
- S = 1 se A venceu, 0,5 em empate, 0 se A perdeu.
- M = multiplicador de margem = 1 + 0,5 × (diferença de partidas ÷ total de partidas). Vai de 1,0 a 1,5. Em empate, M = 1.

### Exemplos

| Situação | Placar | M | Resultado |
| --- | --- | --- | --- |
| Dois clãs com 1000 | 5x1 | 1,33 | Vencedor +21, perdedor −21 |
| Dois clãs com 1000 | 3x2 | 1,10 | Vencedor +18, perdedor −18 |
| Clã com 1000 vence clã com 1200 | 3x2 | 1,10 | Vencedor +27, perdedor −27 |
| Clã com 1200 vence clã com 1000 | 5x0 | 1,50 | Vencedor +12, perdedor −12 |

### Regras do ranking

- Um confronto precisa de pelo menos 3 partidas para contar pontos.
- Só o primeiro confronto do dia entre os mesmos dois clãs conta pontos. Os demais entram no histórico e nas estatísticas.
- Empate só acontece quando um clã sai; o ADM decide se registra como empate ou como vitória do clã que ficou.
- Para aparecer no ranking da temporada, o clã precisa de 3 confrontos aprovados nela.
- Desempate: pontos, depois aproveitamento de confrontos, depois saldo de partidas.

### Temporadas

- Temporadas trimestrais, criadas e encerradas pelo ADM. O ADM encerra a atual e abre a próxima no mesmo passo; só dá para encerrar quando não houver resultado aguardando decisão do ADM naquela temporada.
- A posição final de cada clã é a do ranking da temporada no momento do encerramento (mesmas regras: mínimo de 3 confrontos e desempate).
- No reset, cada clã começa a nova temporada com metade da distância que tinha de 1000. Ex.: quem terminou com 1100 começa com 1050; quem terminou com 940 começa com 970.
- O campeão da temporada ganha um título automático no perfil.
- O ranking geral histórico usa um segundo Elo que nunca é resetado, com os totais de todas as temporadas: começa em 1000 e aplica, na ordem de aprovação, todos os confrontos aprovados que valeram pontos.

### Estatísticas do clã

Calculadas por temporada e no geral:

- Confrontos: vitórias, empates, derrotas e aproveitamento.
- Partidas: ganhas, perdidas, saldo e aproveitamento.
- Rounds: ganhos, perdidos e saldo (quando registrados).
- Sequência atual e maior sequência de vitórias.
- Maior vitória (maior margem) e pico de pontos na temporada.
- Rival mais frequente e retrospecto contra cada clã.

## Estrutura do banco de dados

Onze tabelas cobrem tudo desta versão; a última já deixa pronto o espaço para estatísticas de jogadores.

| Tabela | Campos principais |
| --- | --- |
| usuarios | id, nick, email, avatar, papel (jogador ou adm), banido, criado\_em |
| clas | id, nome, tag, logo, bio, redes, fundado\_em, ativo |
| membros\_cla | usuario\_id, cla\_id, cargo (líder, sublíder, membro), entrou\_em, saiu\_em |
| temporadas | id, nome, inicio, fim, ativa |
| pontos\_temporada | cla\_id, temporada\_id, pontos, pico, posicao\_final |
| confrontos | id, temporada\_id, cla\_a\_id, cla\_b\_id, partidas\_a, partidas\_b, data, enviado\_por, status, conta\_pontos, pontos\_a\_antes, pontos\_b\_antes, variacao, observacao, motivo\_contestacao |
| partidas | id, confronto\_id, numero, rounds\_a, rounds\_b |
| prints | id, confronto\_id, partida\_id (opcional), arquivo, hash, tipo (confronto ou partida) |
| campeonatos e titulos | campeonato: id, nome, data, descricao · título: campeonato\_id, cla\_id, colocacao |
| log\_admin | id, adm\_id, acao, alvo, antes, depois, data |
| estatisticas\_jogador (futuro) | partida\_id, usuario\_id, cla\_id, frags, mortes, mvp |

O Elo geral histórico pode ficar como uma coluna em clas ou numa "temporada" especial que nunca fecha. Os últimos 20 confrontos do perfil são só uma consulta com limite; nada é apagado.

## Tecnologia, design e custos

O único custo previsto é o domínio; o resto cabe nos planos gratuitos para 25 clãs.

### Tecnologia

| Parte | Ferramenta | Para quê |
| --- | --- | --- |
| Site | Next.js + Tailwind CSS | Páginas, layout e responsividade |
| Banco, login e arquivos | Supabase | Banco Postgres, contas, armazenamento dos prints e regras de acesso por cargo |
| Hospedagem | Vercel | Publicar o site e atualizar a cada mudança |
| Domínio | registro.br | Endereço .com.br |

### Design

Estrutura inspirada no Brasileirão PB, com identidade própria:

- Tema escuro, menu lateral com ícones e botões Entrar / Cadastrar no rodapé.
- Topo do ranking com selo "Temporada atual" e título grande em fonte condensada.
- Pódio com os 3 primeiros em cards grandes, logo do clã em anel colorido (ouro, prata, bronze), tag, pontos e V/D.
- Abaixo do pódio, tabela compacta com o restante dos clãs.
- Paleta própria, sem o verde e amarelo do Brasileirão. Sugestão para o tema faca: grafite com detalhes em aço e uma cor de destaque (vermelho ou dourado).
- Fontes do Google Fonts: uma condensada para títulos (ex.: Bebas Neue ou Oswald) e Inter para textos.
- Pensado primeiro para celular, já que muitos jogadores vão enviar e consultar pelo telefone.

### Custos

| Item | Custo |
| --- | --- |
| Domínio .com.br | em torno de R$ 40 por ano (confirmar no registro.br) |
| Supabase | plano gratuito |
| Vercel | plano gratuito |

No plano gratuito, o Supabase pode pausar o projeto depois de um período sem nenhum acesso; com uso semanal da comunidade isso não deve acontecer.

## Fases de construção

Construir em quatro fases, cada uma testada com a comunidade antes da próxima. A fase 1 já coloca o ranking no ar.

1. **Fase 1 — Base no ar**
   - [ ] Cadastro e login de jogadores
   - [ ] Cadastro de clãs pelo ADM, com líder e sublíder
   - [ ] Formulário de envio de resultado com prints e rounds
   - [ ] Painel ADM com fila de aprovação
   - [ ] Cálculo de pontos (Elo) na aprovação
   - [ ] Página de ranking com pódio e tabela
   - [ ] Perfil básico do clã com últimos 20 confrontos
2. **Fase 2 — Competição completa**
   - [x] Confirmação e contestação pelo clã adversário, com prazo de 12h
   - [x] Temporadas trimestrais com reset e ranking geral histórico
   - [x] Página de comparação clã x clã
   - [x] Estatísticas completas do clã (sequências, rounds, rivais, pico)
   - [x] Página "Como funciona"
3. **Fase 3 — Comunidade**
   - [x] Campeonatos e títulos no perfil
   - [ ] Aviso automático no Discord quando um confronto é aprovado (adiado: não é necessário no momento)
   - [x] Líder edita perfil do clã e gerencia membros
   - [ ] Sistema de desafio entre clãs (adiado: não é necessário no momento)
4. **Fase 4 — Jogadores**
   - [ ] Estatísticas individuais (frags, mortes, MVP) a partir dos prints das partidas
   - [ ] Ranking de jogadores — por enquanto, lista dos jogadores com o clã ao lado do nome (ordem alfabética, busca e filtro por clã); a ordem por estatísticas vem junto com elas

### Como usar com o Claude Code

1. Crie contas gratuitas no GitHub, Supabase e Vercel antes de começar.
2. Exporte este documento como Markdown e salve na pasta do projeto como `ESPECIFICACAO.md`.
3. Na primeira conversa, peça ao Claude Code para ler a especificação, criar o arquivo `CLAUDE.md` do projeto e montar só a Fase 1.
4. Peça uma parte por vez (ex.: "agora o formulário de envio") e teste no navegador antes de seguir.
5. Peça para ele salvar no Git a cada parte funcionando, assim dá para voltar atrás se algo quebrar.
6. Quando uma regra mudar, atualize este documento primeiro e depois peça a mudança no código.

## Pendências a definir

- [x] Nome do site: **Elite Knifers** (domínio ainda a definir)
- [x] Logo e cor de destaque: kukri de aço com chamas laranja/amarelo e cabo com amarração de couro; destaque laranja-fogo (#f06a1c) sobre grafite
- [x] Texto das regras do @79 (facas e itens permitidos) para a página "Como funciona" — ver "Modos de jogo"
- [x] Confrontos @mix e @79 contam no mesmo ranking? Sim, contam juntos.
- [ ] Quem serão os ADMs (o usuário configura depois, em Table Editor › usuarios › papel = adm)
- [ ] Datas da primeira temporada (o usuário ajusta depois em Painel ADM › Temporadas)
- [ ] Confirmar os números da pontuação (K = 32, mínimo de 3 partidas, 3 confrontos para aparecer no ranking)
- [ ] Lista inicial dos clãs, com tag, líder e sublíder
