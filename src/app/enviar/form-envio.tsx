"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoCla } from "@/components/logo-cla";
import { ajustarRounds, MAX_PARTIDAS, validarPlacar, vencedorDaPartida, type RoundsPartida } from "@/lib/confronto";
import { comprimirImagem, hashArquivo, subirArquivo, TAMANHO_MAXIMO_ORIGINAL, TIPOS_ACEITOS } from "@/lib/imagem";
import { criarClienteNavegador } from "@/lib/supabase/client";
import type { ClaResumo } from "@/lib/tipos";
import { enviarConfronto, verificarPrints } from "./actions";

type Props = { uid: string; meuCla: ClaResumo; adversarios: ClaResumo[] };

/** "2026-09-30T21:40" no horário do aparelho, para o input datetime-local. */
function paraInputLocal(data: Date): string {
  const d = new Date(data.getTime() - data.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

function numero(valor: string): number | null {
  return valor.trim() === "" ? null : Number(valor);
}

export function FormEnvio({ uid, meuCla, adversarios }: Props) {
  const router = useRouter();
  const [agora] = useState(() => new Date());

  const [adversarioId, setAdversarioId] = useState("");
  const [dataHora, setDataHora] = useState(() => paraInputLocal(agora));
  const [placarA, setPlacarA] = useState("");
  const [placarB, setPlacarB] = useState("");
  const [rounds, setRounds] = useState<RoundsPartida[]>([]);
  const [printPlacar, setPrintPlacar] = useState<File | null>(null);
  const [printsPartida, setPrintsPartida] = useState<Record<number, File>>({});
  const [observacao, setObservacao] = useState("");

  const [erros, setErros] = useState<string[]>([]);
  const [progresso, setProgresso] = useState<string | null>(null);

  const adversario = adversarios.find((c) => c.id === adversarioId);
  const tagAdv = adversario?.tag ?? "Adversário";
  const pA = numero(placarA);
  const pB = numero(placarB);
  const total = (pA ?? 0) + (pB ?? 0);

  function mudarPlacar(lado: "a" | "b", valor: string) {
    const novoA = lado === "a" ? valor : placarA;
    const novoB = lado === "b" ? valor : placarB;
    if (lado === "a") setPlacarA(valor);
    else setPlacarB(valor);
    const n = (numero(novoA) ?? 0) + (numero(novoB) ?? 0);
    setRounds((r) => ajustarRounds(r, Number.isFinite(n) ? n : 0));
    setPrintsPartida((p) => Object.fromEntries(Object.entries(p).filter(([k]) => Number(k) <= n)));
  }

  function mudarRound(indice: number, lado: "a" | "b", valor: string) {
    setRounds((atual) =>
      atual.map((p, i) => {
        if (i !== indice) return p;
        const novo = { ...p, [lado]: numero(valor) };
        // Digitou menos de 9 de um lado e o outro está vazio: o outro venceu com 9.
        const outro = lado === "a" ? "b" : "a";
        const v = novo[lado];
        if (v !== null && v < 9 && novo[outro] === null) novo[outro] = 9;
        return novo;
      }),
    );
  }

  const vitoriasPelosRounds = rounds.reduce<{ a: number; b: number }>(
    (acc, p) => {
      const v = vencedorDaPartida(p);
      if (v) acc[v]++;
      return acc;
    },
    { a: 0, b: 0 },
  );

  function escolherArquivo(arquivo: File | undefined, aoEscolher: (f: File) => void) {
    if (!arquivo) return;
    if (!TIPOS_ACEITOS.split(",").includes(arquivo.type)) {
      setErros(["O print precisa ser uma imagem PNG, JPG ou WebP."]);
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_ORIGINAL) {
      setErros(["Imagem grande demais (máx. 20 MB)."]);
      return;
    }
    setErros([]);
    aoEscolher(arquivo);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (progresso) return;

    const problemas: string[] = [];
    if (!adversarioId) problemas.push("Escolha o clã adversário.");
    const data = dataHora ? new Date(dataHora) : null;
    if (!data || Number.isNaN(data.getTime())) problemas.push("Informe a data e a hora do confronto.");
    else if (data.getTime() > Date.now() + 10 * 60_000) problemas.push("A data do confronto não pode estar no futuro.");
    else if (data.getTime() < Date.now() - 24 * 3600_000) problemas.push("O prazo para enviar é de 24h após o confronto.");
    const placar = validarPlacar(pA, pB, rounds);
    if (!placar.ok) problemas.push(...placar.erros);
    if (!printPlacar) problemas.push("Envie o print do placar do confronto.");
    setErros(problemas);
    if (problemas.length || !printPlacar || !data) return;

    const arquivos: { arquivo: File; partida: number | null; nome: string }[] = [
      { arquivo: printPlacar, partida: null, nome: "print do placar" },
      ...Object.entries(printsPartida).map(([n, arquivo]) => ({ arquivo, partida: Number(n), nome: `print da ${n}ª partida` })),
    ];

    const supabase = criarClienteNavegador();
    const enviados: string[] = [];
    try {
      setProgresso("Conferindo prints…");
      const hashes = await Promise.all(arquivos.map((a) => hashArquivo(a.arquivo)));
      const repetidoAqui = hashes.findIndex((h, i) => hashes.indexOf(h) !== i);
      if (repetidoAqui >= 0) throw new Error(`O ${arquivos[repetidoAqui].nome} é a mesma imagem de outro print deste envio.`);
      const jaUsados = new Set(await verificarPrints(hashes));
      const usado = hashes.findIndex((h) => jaUsados.has(h));
      if (usado >= 0) throw new Error(`O ${arquivos[usado].nome} já foi usado em outro resultado.`);

      const prints = [];
      for (const [i, a] of arquivos.entries()) {
        setProgresso(`Enviando prints (${i + 1} de ${arquivos.length})…`);
        const caminho = await subirArquivo(supabase, "prints", uid, await comprimirImagem(a.arquivo));
        enviados.push(caminho);
        prints.push({ arquivo: caminho, hash: hashes[i], partida: a.partida });
      }

      setProgresso("Salvando resultado…");
      const resposta = await enviarConfronto({
        claAdversario: adversarioId,
        data: data.toISOString(),
        partidasA: pA!,
        partidasB: pB!,
        rounds: rounds.map((r) => ({ a: r.a!, b: r.b! })),
        prints,
        observacao,
      });
      if (resposta.erro || !resposta.id) throw new Error(resposta.erro ?? "Não foi possível salvar o resultado.");

      router.push(`/confrontos/${resposta.id}`);
    } catch (erro) {
      if (enviados.length) await supabase.storage.from("prints").remove(enviados);
      setErros([erro instanceof Error ? erro.message : "Algo deu errado. Tente de novo."]);
      setProgresso(null);
    }
  }

  const minimo = paraInputLocal(new Date(agora.getTime() - 24 * 3600_000));

  return (
    <form onSubmit={enviar} className="space-y-6" noValidate>
      {/* 1 e 2: adversário e data */}
      <div className="cartao grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label htmlFor="adversario" className="rotulo">
            Clã adversário
          </label>
          <select id="adversario" value={adversarioId} onChange={(e) => setAdversarioId(e.target.value)} className="campo">
            <option value="">Escolha…</option>
            {adversarios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tag} — {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="data" className="rotulo">
            Data e hora do confronto
          </label>
          <input
            id="data"
            type="datetime-local"
            value={dataHora}
            min={minimo}
            max={paraInputLocal(agora)}
            onChange={(e) => setDataHora(e.target.value)}
            className="campo"
          />
          <p className="mt-1 text-xs text-aco-500">Prazo: até 24h depois do confronto.</p>
        </div>
      </div>

      {/* 3: placar em partidas */}
      <div className="cartao p-5">
        <p className="rotulo">Placar do confronto (partidas ganhas)</p>
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          <LadoPlacar cla={meuCla} nome={meuCla.tag} valor={placarA} onChange={(v) => mudarPlacar("a", v)} />
          <span className="font-display text-4xl text-aco-500">x</span>
          <LadoPlacar cla={adversario ?? { tag: "?", logo: null }} nome={tagAdv} valor={placarB} onChange={(v) => mudarPlacar("b", v)} />
        </div>
        {total > MAX_PARTIDAS && <p className="mt-3 text-center text-sm text-derrota">Máximo de {MAX_PARTIDAS} partidas.</p>}
      </div>

      {/* 4 e 6: rounds e prints de cada partida */}
      {rounds.length > 0 && (
        <div className="cartao p-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className="rotulo mb-0">Rounds de cada partida</p>
            <p className="text-xs text-aco-400">
              Pelos rounds: {vitoriasPelosRounds.a}x{vitoriasPelosRounds.b}
            </p>
          </div>
          <ol className="space-y-2">
            {rounds.map((p, i) => {
              const valida = vencedorDaPartida(p) !== null;
              const incompleta = p.a === null || p.b === null;
              return (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-grafite-850 px-3 py-2">
                  <span className="w-8 text-sm text-aco-400">{i + 1}ª</span>
                  <span className="w-12 truncate text-right text-xs font-semibold">{meuCla.tag}</span>
                  <InputRound valor={p.a} onChange={(v) => mudarRound(i, "a", v)} invalido={!incompleta && !valida} rotulo={`Rounds do ${meuCla.tag} na partida ${i + 1}`} />
                  <span className="text-aco-500">x</span>
                  <InputRound valor={p.b} onChange={(v) => mudarRound(i, "b", v)} invalido={!incompleta && !valida} rotulo={`Rounds do ${tagAdv} na partida ${i + 1}`} />
                  <span className="w-12 truncate text-xs font-semibold">{tagAdv}</span>
                  <SeletorPrint
                    arquivo={printsPartida[i + 1] ?? null}
                    rotulo="print (opcional)"
                    compacto
                    onChange={(f) => escolherArquivo(f, (arq) => setPrintsPartida((atual) => ({ ...atual, [i + 1]: arq })))}
                    onRemover={() =>
                      setPrintsPartida((atual) => Object.fromEntries(Object.entries(atual).filter(([k]) => Number(k) !== i + 1)))
                    }
                  />
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-aco-500">
            Quem vence a partida faz 9 rounds. Os prints do final de cada partida (com rounds e frags) são opcionais, mas recomendados.
          </p>
        </div>
      )}

      {/* 5 e 7: print do placar e observação */}
      <div className="cartao grid gap-4 p-5">
        <div>
          <p className="rotulo">Print do placar do confronto (obrigatório)</p>
          <SeletorPrint
            arquivo={printPlacar}
            rotulo="Escolher imagem"
            onChange={(f) => escolherArquivo(f, setPrintPlacar)}
            onRemover={() => setPrintPlacar(null)}
          />
        </div>
        <div>
          <label htmlFor="observacao" className="rotulo">
            Observação (opcional)
          </label>
          <textarea
            id="observacao"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Ex.: clã adversário saiu na 6ª partida"
            className="campo"
          />
        </div>
      </div>

      {erros.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg border border-derrota/40 bg-derrota/10 px-4 py-3 text-sm text-derrota">
          {erros.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <button type="submit" className="btn-destaque w-full py-3 text-base sm:w-auto sm:px-8" disabled={progresso !== null}>
        {progresso ? (
          <>
            <Loader2 className="size-4 animate-spin" /> {progresso}
          </>
        ) : (
          "Enviar resultado"
        )}
      </button>
      <p className="text-xs text-aco-500">
        O resultado vai para a fila do ADM e só entra no ranking depois de aprovado.
      </p>
    </form>
  );
}

function LadoPlacar({
  cla,
  nome,
  valor,
  onChange,
}: {
  cla: Pick<ClaResumo, "tag" | "logo">;
  nome: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col items-center gap-2">
      <LogoCla cla={cla} tamanho={48} />
      <span className="max-w-24 truncate text-sm font-semibold">{nome}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_PARTIDAS}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="campo w-20 text-center font-display text-3xl"
        aria-label={`Partidas ganhas pelo ${nome}`}
      />
    </label>
  );
}

function InputRound({ valor, onChange, invalido, rotulo }: { valor: number | null; onChange: (v: string) => void; invalido: boolean; rotulo: string }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={9}
      value={valor ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label={rotulo}
      aria-invalid={invalido}
      className={`campo w-14 px-1 py-1.5 text-center font-display text-xl ${invalido ? "border-derrota" : ""}`}
    />
  );
}

function SeletorPrint({
  arquivo,
  rotulo,
  compacto = false,
  onChange,
  onRemover,
}: {
  arquivo: File | null;
  rotulo: string;
  compacto?: boolean;
  onChange: (f: File | undefined) => void;
  onRemover: () => void;
}) {
  if (arquivo) {
    return (
      <span className={`flex min-w-0 items-center gap-2 text-xs ${compacto ? "ml-auto" : ""}`}>
        <span className="max-w-40 truncate text-vitoria">✓ {arquivo.name}</span>
        <button type="button" onClick={onRemover} className="text-aco-400 underline hover:text-aco-50">
          trocar
        </button>
      </span>
    );
  }
  return (
    <label className={`cursor-pointer ${compacto ? "ml-auto text-xs text-destaque-claro hover:underline" : "btn-secundario"}`}>
      <input type="file" accept={TIPOS_ACEITOS} className="sr-only" onChange={(e) => onChange(e.target.files?.[0])} />
      {!compacto && <ImagePlus className="size-4" />}
      {rotulo}
    </label>
  );
}
