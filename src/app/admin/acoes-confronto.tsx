"use client";

import { Check, PencilLine, X } from "lucide-react";
import { useActionState, useState } from "react";
import { MAX_PARTIDAS, ajustarRounds, validarPlacar, type RoundsPartida } from "@/lib/confronto";
import type { StatusConfronto } from "@/lib/tipos";
import { aprovarConfronto, corrigirConfronto, manterConfronto, rejeitarConfronto, type EstadoAdmin } from "./actions";
import { AvisoAdmin } from "./aviso";

type Props = {
  id: string;
  status: StatusConfronto;
  partidasA: number;
  partidasB: number;
  rounds: { a: number; b: number }[];
  tagA: string;
  tagB: string;
};

/**
 * Pendente: aprovar, rejeitar ou corrigir.
 * Aprovado com contestação aberta: manter, anular (desfaz os pontos) ou corrigir.
 */
export function AcoesConfronto({ id, status, partidasA, partidasB, rounds, tagA, tagB }: Props) {
  const [aprovacao, aprovar, aprovando] = useActionState<EstadoAdmin, FormData>(aprovarConfronto, {});
  const [manutencao, manter, mantendo] = useActionState<EstadoAdmin, FormData>(manterConfronto, {});
  const [rejeicao, rejeitar, rejeitando] = useActionState<EstadoAdmin, FormData>(rejeitarConfronto, {});
  const [aberto, setAberto] = useState<"rejeitar" | "corrigir" | null>(null);
  const ocupado = aprovando || mantendo || rejeitando;
  const pendente = status === "pendente";

  const alternar = (qual: "rejeitar" | "corrigir") => setAberto((a) => (a === qual ? null : qual));

  return (
    <div className="space-y-3">
      <AvisoAdmin estado={aprovacao} />
      <AvisoAdmin estado={manutencao} />
      <AvisoAdmin estado={rejeicao} />

      <div className="flex flex-wrap gap-2">
        <form action={pendente ? aprovar : manter}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn-destaque" disabled={ocupado}>
            <Check className="size-4" />
            {pendente ? (aprovando ? "Aprovando…" : "Aprovar") : mantendo ? "Mantendo…" : "Manter resultado"}
          </button>
        </form>
        <button type="button" onClick={() => alternar("rejeitar")} className="btn-perigo" disabled={ocupado} aria-expanded={aberto === "rejeitar"}>
          <X className="size-4" /> {pendente ? "Rejeitar" : "Anular"}
        </button>
        <button type="button" onClick={() => alternar("corrigir")} className="btn-secundario" disabled={ocupado} aria-expanded={aberto === "corrigir"}>
          <PencilLine className="size-4" /> Corrigir placar
        </button>
      </div>

      {aberto === "rejeitar" && (
        <form action={rejeitar} className="space-y-2 rounded-lg bg-grafite-850 p-3">
          <input type="hidden" name="id" value={id} />
          {!pendente && <input type="hidden" name="anular" value="1" />}
          {!pendente && <p className="text-xs text-aco-400">Anular desfaz os pontos que este confronto deu aos dois clãs.</p>}
          <textarea name="motivo" required rows={2} maxLength={500} placeholder="Motivo (aparece para os clãs)" className="campo" />
          <button type="submit" className="btn-perigo" disabled={ocupado}>
            {rejeitando ? "Salvando…" : pendente ? "Confirmar rejeição" : "Confirmar anulação"}
          </button>
        </form>
      )}

      {aberto === "corrigir" && (
        <EditorPlacar id={id} aprovado={!pendente} partidasA={partidasA} partidasB={partidasB} rounds={rounds} tagA={tagA} tagB={tagB} />
      )}
    </div>
  );
}

function EditorPlacar({
  id,
  aprovado,
  partidasA,
  partidasB,
  rounds: iniciais,
  tagA,
  tagB,
}: Omit<Props, "status"> & { aprovado: boolean }) {
  const [estado, corrigir, salvando] = useActionState<EstadoAdmin, FormData>(corrigirConfronto, {});
  const [placarA, setPlacarA] = useState(String(partidasA));
  const [placarB, setPlacarB] = useState(String(partidasB));
  const [rounds, setRounds] = useState<RoundsPartida[]>(iniciais);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const pA = num(placarA);
  const pB = num(placarB);
  const validacao = validarPlacar(pA, pB, rounds);

  function mudarPlacar(lado: "a" | "b", valor: string) {
    const a = lado === "a" ? valor : placarA;
    const b = lado === "b" ? valor : placarB;
    if (lado === "a") setPlacarA(valor);
    else setPlacarB(valor);
    const total = (num(a) ?? 0) + (num(b) ?? 0);
    setRounds((r) => ajustarRounds(r, Number.isFinite(total) ? total : 0));
  }

  function mudarRound(i: number, lado: "a" | "b", valor: string) {
    setRounds((r) => r.map((p, j) => (j === i ? { ...p, [lado]: num(valor) } : p)));
  }

  const campoNum = "campo w-14 px-1 py-1.5 text-center font-display text-xl";

  return (
    <form action={corrigir} className="space-y-3 rounded-lg bg-grafite-850 p-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="partidas_a" value={placarA} />
      <input type="hidden" name="partidas_b" value={placarB} />
      <input type="hidden" name="rounds" value={JSON.stringify(rounds)} />

      <div className="flex items-center gap-2">
        <span className="w-14 truncate text-right text-sm font-semibold">{tagA}</span>
        <input type="number" inputMode="numeric" min={0} max={MAX_PARTIDAS} value={placarA} onChange={(e) => mudarPlacar("a", e.target.value)} className={campoNum} aria-label={`Partidas do ${tagA}`} />
        <span className="text-aco-500">x</span>
        <input type="number" inputMode="numeric" min={0} max={MAX_PARTIDAS} value={placarB} onChange={(e) => mudarPlacar("b", e.target.value)} className={campoNum} aria-label={`Partidas do ${tagB}`} />
        <span className="w-14 truncate text-sm font-semibold">{tagB}</span>
      </div>

      <ol className="space-y-1.5">
        {rounds.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-14 text-right text-xs text-aco-400">{i + 1}ª</span>
            <input type="number" inputMode="numeric" min={0} max={9} value={p.a ?? ""} onChange={(e) => mudarRound(i, "a", e.target.value)} className={campoNum} aria-label={`Rounds do ${tagA} na partida ${i + 1}`} />
            <span className="text-aco-500">x</span>
            <input type="number" inputMode="numeric" min={0} max={9} value={p.b ?? ""} onChange={(e) => mudarRound(i, "b", e.target.value)} className={campoNum} aria-label={`Rounds do ${tagB} na partida ${i + 1}`} />
          </li>
        ))}
      </ol>

      {!validacao.ok && (
        <ul className="space-y-0.5 text-xs text-alerta">
          {validacao.erros.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {aprovado && (
        <p className="text-xs text-aco-400">
          Os pontos antigos deste confronto são desfeitos e os do placar corrigido são aplicados.
        </p>
      )}
      <AvisoAdmin estado={estado} />
      <button type="submit" className="btn-destaque" disabled={salvando || !validacao.ok}>
        {salvando ? "Salvando…" : "Salvar correção"}
      </button>
    </form>
  );
}
