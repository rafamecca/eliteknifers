"use client";

import { Check, TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { responderConfronto, type EstadoResposta } from "@/app/pendencias/actions";

/** Botões do adversário: confirmar o resultado ou contestar com motivo. */
export function ResponderConfronto({ id, prazo }: { id: string; prazo: string | null }) {
  const [estado, acao, enviando] = useActionState<EstadoResposta, FormData>(responderConfronto, {});
  const [contestando, setContestando] = useState(false);

  if (estado.mensagem) {
    return <p className="rounded-lg border border-vitoria/40 bg-vitoria/10 px-3 py-2 text-sm text-vitoria">{estado.mensagem}</p>;
  }

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {prazo && <p className="text-xs text-aco-400">Você tem {prazo} para responder.</p>}
      {contestando && (
        <div>
          <label htmlFor={`motivo-${id}`} className="rotulo">
            Por que você contesta?
          </label>
          <textarea
            id={`motivo-${id}`}
            name="motivo"
            required
            rows={3}
            maxLength={500}
            placeholder="Ex.: o placar foi 2x1, não 3x0"
            className="campo"
            autoFocus
          />
        </div>
      )}
      {estado.erro && (
        <p role="alert" className="rounded-lg border border-derrota/40 bg-derrota/10 px-3 py-2 text-sm text-derrota">
          {estado.erro}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {contestando ? (
          <>
            <button type="submit" name="acao" value="contestar" className="btn-perigo" disabled={enviando}>
              <TriangleAlert className="size-4" /> {enviando ? "Enviando…" : "Enviar contestação"}
            </button>
            <button type="button" onClick={() => setContestando(false)} className="btn-secundario" disabled={enviando}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button type="submit" name="acao" value="confirmar" className="btn-destaque" disabled={enviando}>
              <Check className="size-4" /> {enviando ? "Enviando…" : "Confirmar resultado"}
            </button>
            <button type="button" onClick={() => setContestando(true)} className="btn-perigo" disabled={enviando}>
              <TriangleAlert className="size-4" /> Contestar
            </button>
          </>
        )}
      </div>
    </form>
  );
}
