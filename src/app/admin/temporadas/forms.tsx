"use client";

import { useActionState } from "react";
import type { Temporada } from "@/lib/tipos";
import { abrirNovaTemporada, salvarTemporada, type EstadoAdmin } from "../actions";
import { AvisoAdmin } from "../aviso";

function Campos({ nome, inicio, fim }: { nome: string; inicio: string; fim: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <label className="rotulo" htmlFor={`nome-${nome}`}>
          Nome
        </label>
        <input id={`nome-${nome}`} name="nome" defaultValue={nome} required maxLength={60} className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor={`inicio-${nome}`}>
          Início
        </label>
        <input id={`inicio-${nome}`} name="inicio" type="date" defaultValue={inicio} required className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor={`fim-${nome}`}>
          Fim previsto
        </label>
        <input id={`fim-${nome}`} name="fim" type="date" defaultValue={fim} required className="campo" />
      </div>
    </div>
  );
}

export function FormEditarTemporada({ temporada }: { temporada: Temporada }) {
  const [estado, acao, salvando] = useActionState<EstadoAdmin, FormData>(salvarTemporada, {});
  return (
    <form action={acao} className="cartao space-y-4 p-5">
      <input type="hidden" name="id" value={temporada.id} />
      <Campos nome={temporada.nome} inicio={temporada.inicio} fim={temporada.fim} />
      <AvisoAdmin estado={estado} />
      <button type="submit" className="btn-secundario" disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar nome e datas"}
      </button>
    </form>
  );
}

export function FormNovaTemporada({
  nome,
  inicio,
  fim,
  encerrando,
  bloqueado,
}: {
  nome: string;
  inicio: string;
  fim: string;
  encerrando: string | null;
  bloqueado: boolean;
}) {
  const [estado, acao, salvando] = useActionState<EstadoAdmin, FormData>(abrirNovaTemporada, {});
  if (estado.mensagem) return <AvisoAdmin estado={estado} />;
  return (
    <form action={acao} className="cartao space-y-4 p-5">
      <Campos nome={nome} inicio={inicio} fim={fim} />
      {encerrando && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="confirmar" required className="mt-0.5 size-4 accent-destaque" />
          <span>
            Entendi que a <strong>{encerrando}</strong> será encerrada agora, com as posições e os pontos de agora. Isso não pode
            ser desfeito pelo site.
          </span>
        </label>
      )}
      {!encerrando && <input type="hidden" name="confirmar" value="on" />}
      <AvisoAdmin estado={estado} />
      <button type="submit" className="btn-destaque" disabled={salvando || bloqueado}>
        {salvando ? "Salvando…" : encerrando ? `Encerrar ${encerrando} e abrir a nova` : "Abrir temporada"}
      </button>
    </form>
  );
}
