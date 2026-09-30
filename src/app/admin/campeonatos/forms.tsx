"use client";

import { useActionState } from "react";
import type { Campeonato, ClaResumo } from "@/lib/tipos";
import { adicionarColocacao, excluirCampeonato, removerColocacao, salvarCampeonato, type EstadoAdmin } from "../actions";
import { AvisoAdmin } from "../aviso";

export function FormCampeonato({ campeonato }: { campeonato?: Campeonato }) {
  const [estado, acao, salvando] = useActionState<EstadoAdmin, FormData>(salvarCampeonato, {});
  return (
    <form action={acao} className="cartao space-y-4 p-5">
      {campeonato && <input type="hidden" name="id" value={campeonato.id} />}
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="nome" className="rotulo">
            Nome
          </label>
          <input id="nome" name="nome" required maxLength={80} defaultValue={campeonato?.nome} className="campo" placeholder="Copa Knifer 2026" />
        </div>
        <div>
          <label htmlFor="data" className="rotulo">
            Data
          </label>
          <input id="data" name="data" type="date" defaultValue={campeonato?.data ?? ""} className="campo" />
        </div>
      </div>
      <div>
        <label htmlFor="descricao" className="rotulo">
          Descrição (opcional)
        </label>
        <textarea id="descricao" name="descricao" rows={3} maxLength={2000} defaultValue={campeonato?.descricao ?? ""} className="campo" />
      </div>
      <AvisoAdmin estado={estado} />
      <button type="submit" className="btn-destaque" disabled={salvando}>
        {salvando ? "Salvando…" : campeonato ? "Salvar alterações" : "Cadastrar campeonato"}
      </button>
    </form>
  );
}

export function FormColocacao({ campeonatoId, clas, proxima }: { campeonatoId: string; clas: ClaResumo[]; proxima: number }) {
  const [estado, acao, salvando] = useActionState<EstadoAdmin, FormData>(adicionarColocacao, {});
  return (
    <form action={acao} className="cartao space-y-3 p-4" key={proxima}>
      <input type="hidden" name="campeonato" value={campeonatoId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
        <div>
          <label htmlFor="cla" className="rotulo">
            Clã
          </label>
          <select id="cla" name="cla" required className="campo" defaultValue="">
            <option value="">Escolha…</option>
            {clas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tag} — {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="colocacao" className="rotulo">
            Colocação
          </label>
          <input id="colocacao" name="colocacao" type="number" min={1} max={64} required defaultValue={proxima} className="campo" />
        </div>
        <button type="submit" className="btn-destaque" disabled={salvando}>
          {salvando ? "Salvando…" : "Adicionar"}
        </button>
      </div>
      <AvisoAdmin estado={estado} />
    </form>
  );
}

export function BotaoRemoverColocacao({ campeonatoId, claId }: { campeonatoId: string; claId: string }) {
  const [estado, acao, removendo] = useActionState<EstadoAdmin, FormData>(removerColocacao, {});
  return (
    <form action={acao}>
      <input type="hidden" name="campeonato" value={campeonatoId} />
      <input type="hidden" name="cla" value={claId} />
      <button type="submit" className="text-xs text-derrota hover:underline disabled:opacity-50" disabled={removendo}>
        remover
      </button>
      {estado.erro && <span className="ml-2 text-xs text-derrota">{estado.erro}</span>}
    </form>
  );
}

export function BotaoExcluirCampeonato({ id }: { id: string }) {
  const [estado, acao, excluindo] = useActionState<EstadoAdmin, FormData>(excluirCampeonato, {});
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm("Excluir este campeonato e todas as colocações dele?")) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-perigo" disabled={excluindo}>
        {excluindo ? "Excluindo…" : "Excluir campeonato"}
      </button>
      <AvisoAdmin estado={estado} />
    </form>
  );
}
