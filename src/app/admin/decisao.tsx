"use client";

import { Check, X } from "lucide-react";
import { useActionState } from "react";
import { aprovarConfronto, rejeitarConfronto, type EstadoAdmin } from "./actions";
import { AvisoAdmin } from "./aviso";

export function DecisaoConfronto({ id }: { id: string }) {
  const [aprovacao, aprovar, aprovando] = useActionState<EstadoAdmin, FormData>(aprovarConfronto, {});
  const [rejeicao, rejeitar, rejeitando] = useActionState<EstadoAdmin, FormData>(rejeitarConfronto, {});
  const ocupado = aprovando || rejeitando;

  return (
    <div className="space-y-3">
      <AvisoAdmin estado={aprovacao} />
      <AvisoAdmin estado={rejeicao} />
      <div className="flex flex-wrap items-start gap-3">
        <form action={aprovar}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn-destaque" disabled={ocupado}>
            <Check className="size-4" /> {aprovando ? "Aprovando…" : "Aprovar"}
          </button>
        </form>
        <details className="group min-w-0 flex-1">
          <summary className="btn-perigo cursor-pointer list-none">
            <X className="size-4" /> Rejeitar
          </summary>
          <form action={rejeitar} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={id} />
            <textarea name="motivo" required rows={2} maxLength={500} placeholder="Motivo (aparece para os clãs)" className="campo" />
            <button type="submit" className="btn-perigo" disabled={ocupado}>
              {rejeitando ? "Rejeitando…" : "Confirmar rejeição"}
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
