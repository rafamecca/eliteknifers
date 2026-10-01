import { Ban, CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { MAX_PARTIDAS, PRAZO_RESPOSTA_HORAS } from "@/lib/confronto";
import {
  K,
  MAX_CONFRONTOS_COM_PONTOS_POR_DIA,
  MIN_CONFRONTOS_NO_RANKING,
  MIN_PARTIDAS_PARA_PONTOS,
  multiplicadorMargem,
  PONTOS_INICIAIS,
  variacaoElo,
} from "@/lib/elo";
import { formatarVariacao } from "@/lib/formato";
import { MODOS } from "@/lib/regras";

export const metadata: Metadata = { title: "Como funciona" };

// Exemplos da especificação, calculados com a mesma fórmula do site (nunca ficam desatualizados).
const EXEMPLOS = [
  { situacao: `Dois clãs com ${PONTOS_INICIAIS}`, a: 1000, b: 1000, pa: 5, pb: 1 },
  { situacao: `Dois clãs com ${PONTOS_INICIAIS}`, a: 1000, b: 1000, pa: 3, pb: 2 },
  { situacao: "Clã com 1000 vence clã com 1200", a: 1000, b: 1200, pa: 3, pb: 2 },
  { situacao: "Clã com 1200 vence clã com 1000", a: 1200, b: 1000, pa: 5, pb: 0 },
];

const decimal = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ComoFunciona() {
  return (
    <>
      <CabecalhoPagina titulo="Como funciona" subtitulo="Regras dos modos, envio de resultados e pontuação do ranking." />

      <nav className="mb-10 flex flex-wrap gap-2 text-sm">
        {[
          ["#modos", "Modos de jogo"],
          ["#envio", "Enviar resultado"],
          ["#contestacao", "Confirmação e contestação"],
          ["#pontuacao", "Pontuação"],
          ["#ranking", "Ranking e temporadas"],
        ].map(([href, rotulo]) => (
          <a key={href} href={href} className="rounded-full border border-grafite-600 px-3 py-1 text-aco-200 hover:border-destaque hover:text-aco-50">
            {rotulo}
          </a>
        ))}
      </nav>

      <Secao id="modos" titulo="Modos de jogo">
        <p>Os clãs combinam entre si qual dos dois modos vão jogar no confronto.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {MODOS.map((modo) => (
            <article key={modo.nome} className="cartao p-5">
              <h3 className="mb-4 font-display text-4xl tracking-wide text-destaque-claro">{modo.nome}</h3>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-vitoria uppercase">Liberado</h4>
              <ul className="mb-5 space-y-1.5">
                {modo.liberado.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-vitoria" /> {item}
                  </li>
                ))}
              </ul>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-derrota uppercase">Proibido</h4>
              <ul className="space-y-1.5">
                {modo.proibido.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Ban className="mt-0.5 size-4 shrink-0 text-derrota" /> {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Secao>

      <Secao id="envio" titulo="Enviar resultado">
        <p>
          Só o <strong>líder</strong> ou o <strong>sublíder</strong> do clã envia, pela página <em>Enviar resultado</em>. Só um
          dos dois clãs envia cada confronto: se o outro tentar mandar o mesmo, o site avisa que já existe um pendente.
        </p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Clã adversário, data e hora do confronto. O prazo é de <strong>24h</strong> depois do confronto.</li>
          <li>Placar em partidas ganhas (ex.: 5x1), com até {MAX_PARTIDAS} partidas.</li>
          <li>Rounds de cada partida: quem vence faz <strong>9</strong>, o outro de 0 a 8. O site confere se bate com o placar.</li>
          <li>
            <strong>Print do placar do confronto</strong> (obrigatório) e, se possível, o print do final de cada partida, com
            rounds e frags.
          </li>
          <li>Observação, se precisar (ex.: &quot;clã adversário saiu na 6ª partida&quot;).</li>
        </ol>
        <p className="text-sm text-aco-400">Um print que já foi usado em outro resultado é bloqueado.</p>
      </Secao>

      <Secao id="contestacao" titulo="Confirmação e contestação">
        <p>
          O ADM avalia e aprova o resultado; ele não precisa esperar o adversário, e o resultado aprovado já conta no ranking.
        </p>
        <p>
          O líder ou sublíder do clã adversário tem <strong>{PRAZO_RESPOSTA_HORAS}h a partir do envio</strong> para{" "}
          <strong>confirmar</strong> ou <strong>contestar</strong> (explicando o motivo), em <em>Minhas pendências</em>. Depois
          disso o resultado fica como &quot;Sem resposta&quot; e segue valendo.
        </p>
        <p>
          Um resultado contestado continua no ranking com o aviso <strong className="text-destaque-claro">Contestado</strong>{" "}
          até o ADM avaliar. O ADM pode:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Manter</strong> o resultado: o aviso some.</li>
          <li><strong>Anular</strong>: o confronto deixa de contar e os pontos que ele deu são desfeitos.</li>
          <li><strong>Corrigir</strong> placar ou rounds: os pontos são recalculados com o placar certo.</li>
        </ul>
      </Secao>

      <Secao id="pontuacao" titulo="Pontuação">
        <p>
          A pontuação usa um sistema <strong>Elo</strong>: todo clã começa com <strong>{PONTOS_INICIAIS} pontos</strong>, e cada
          confronto aprovado tira pontos de um clã e passa para o outro. Ganhar de um clã forte vale mais do que ganhar de um
          fraco, e vencer com folga vale um pouco mais. Jogar mais partidas no mesmo confronto não dá pontos extras.
        </p>
        <div className="cartao space-y-2 p-4 text-sm">
          <p>
            <strong>1. Chance de vencer:</strong> calculada pela diferença de pontos. Com pontos iguais, cada clã tem 50%; quem
            tem 200 pontos a mais tem cerca de 76%.
          </p>
          <p>
            <strong>2. Margem:</strong> 1 + 0,5 × (diferença de partidas ÷ total de partidas). Vai de 1,0 a 1,5; em empate é 1.
          </p>
          <p>
            <strong>3. Variação:</strong> {K} × margem × (resultado − chance). Resultado = 1 na vitória, 0,5 no empate e 0 na
            derrota. O perdedor perde exatamente o que o vencedor ganha.
          </p>
        </div>
        <div className="cartao overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-grafite-700 text-left text-xs tracking-wider text-aco-400 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-2 py-3 text-center font-medium">Placar</th>
                <th className="px-2 py-3 text-center font-medium">Margem</th>
                <th className="px-4 py-3 text-right font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grafite-800">
              {EXEMPLOS.map((e) => {
                const d = variacaoElo(e.a, e.b, e.pa, e.pb);
                return (
                  <tr key={`${e.situacao}-${e.pa}x${e.pb}`}>
                    <td className="px-4 py-2.5">{e.situacao}</td>
                    <td className="px-2 py-2.5 text-center font-display text-lg">{e.pa}x{e.pb}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums">{decimal(multiplicadorMargem(e.pa, e.pb))}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
                      <span className="text-vitoria">{formatarVariacao(d)}</span> /{" "}
                      <span className="text-derrota">{formatarVariacao(-d)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>O confronto precisa de pelo menos <strong>{MIN_PARTIDAS_PARA_PONTOS} partidas</strong> para valer pontos.</li>
          <li>
            Só o <strong>primeiro confronto do dia</strong> entre os mesmos dois clãs vale pontos. Os outros entram no histórico e
            nas estatísticas.
          </li>
          <li>
            Cada clã tem no máximo <strong>{MAX_CONFRONTOS_COM_PONTOS_POR_DIA} confrontos valendo pontos por dia</strong>, somando
            todos os adversários. Do 4º em diante o confronto conta na tabela (vitórias, empates e derrotas), no histórico e nas
            estatísticas, mas não mexe nos pontos — nem do adversário. Isso evita que um clã “farme” pontos jogando o dia
            inteiro.
          </li>
          <li>
            Empate só acontece quando um clã sai; o ADM decide se fica como empate ou como vitória do clã que ficou.
          </li>
        </ul>
      </Secao>

      <Secao id="ranking" titulo="Ranking e temporadas">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Para aparecer no ranking da temporada, o clã precisa de <strong>{MIN_CONFRONTOS_NO_RANKING} confrontos aprovados</strong>{" "}
            nela. Antes disso ele fica em &quot;Em classificação&quot;.
          </li>
          <li>
            Desempate: <strong>pontos</strong>, depois <strong>aproveitamento</strong> de confrontos (vitórias + metade dos
            empates, dividido pelos confrontos), depois <strong>saldo de partidas</strong>.
          </li>
          <li>As temporadas duram 3 meses. O campeão da temporada ganha um título no perfil do clã.</li>
          <li>
            Na virada da temporada, cada clã começa com metade da distância que tinha de {PONTOS_INICIAIS}. Ex.: quem terminou
            com 1100 começa com 1050; quem terminou com 940 começa com 970.
          </li>
        </ul>
      </Secao>
    </>
  );
}

function Secao({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-20 space-y-4 text-aco-200">
      <h2 className="font-display text-3xl tracking-wide text-aco-50 uppercase">{titulo}</h2>
      {children}
    </section>
  );
}
