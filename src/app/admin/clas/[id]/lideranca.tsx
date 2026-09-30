"use client";

import { useActionState } from "react";
import { NOME_CARGO, type Cargo } from "@/lib/tipos";
import { definirLideranca, removerMembro, type EstadoAdmin } from "../../actions";
import { AvisoAdmin } from "../../aviso";

type Membro = { cargo: Cargo; usuario: { id: string; nick: string } };

export function FormLideranca({ claId, membros, nicks }: { claId: string; membros: Membro[]; nicks: string[] }) {
  const [estado, acao, salvando] = useActionState<EstadoAdmin, FormData>(definirLideranca, {});
  const atual = (cargo: Cargo) => membros.find((m) => m.cargo === cargo)?.usuario.nick ?? "";

  return (
    <form action={acao} className="cartao space-y-4 p-5">
      <input type="hidden" name="cla" value={claId} />
      <datalist id="nicks">
        {nicks.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["lider", "sublider"] as const).map((cargo) => (
          <div key={cargo}>
            <label htmlFor={cargo} className="rotulo">
              {NOME_CARGO[cargo]} (nick)
            </label>
            <input id={cargo} name={cargo} list="nicks" defaultValue={atual(cargo)} placeholder="Deixe vazio para ninguém" className="campo" autoComplete="off" />
          </div>
        ))}
      </div>
      <p className="text-xs text-aco-500">
        O jogador precisa ter conta no site. Quem perde o cargo continua no clã como membro. Um jogador só pode estar em um clã por vez.
      </p>
      <AvisoAdmin estado={estado} />
      <button type="submit" className="btn-destaque" disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar liderança"}
      </button>
    </form>
  );
}

export function ListaMembros({ claId, membros }: { claId: string; membros: Membro[] }) {
  const [estado, acao, removendo] = useActionState<EstadoAdmin, FormData>(removerMembro, {});
  if (membros.length === 0) return <p className="cartao px-4 py-6 text-center text-sm text-aco-400">Nenhum membro.</p>;

  return (
    <div className="space-y-3">
      <AvisoAdmin estado={estado} />
      <ul className="cartao divide-y divide-grafite-800">
        {membros.map((m) => (
          <li key={m.usuario.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span>
              <span className="font-medium">{m.usuario.nick}</span>
              <span className="ml-2 text-xs text-aco-400">{NOME_CARGO[m.cargo]}</span>
            </span>
            <form action={acao}>
              <input type="hidden" name="cla" value={claId} />
              <input type="hidden" name="usuario" value={m.usuario.id} />
              <button type="submit" className="text-xs text-derrota hover:underline disabled:opacity-50" disabled={removendo}>
                remover do clã
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
