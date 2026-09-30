"use client";

import { Check, LogOut, X } from "lucide-react";
import { useActionState, useState } from "react";
import { AvisoAdmin as Aviso } from "@/app/admin/aviso";
import { CampoLogo } from "@/components/campo-logo";
import { NOME_CARGO, type Cargo, type Cla } from "@/lib/tipos";
import {
  cancelarPedido,
  editarPerfilCla,
  nomearSublider,
  pedirEntrada,
  removerMembro,
  responderPedido,
  sairDoCla,
  type EstadoCla,
} from "./actions";

type Acao = (estado: EstadoCla, formData: FormData) => Promise<EstadoCla>;

/** Formulário de um botão só, com os campos escondidos e o aviso do resultado. */
function FormSimples({
  acao,
  campos,
  children,
  confirmar,
  className,
}: {
  acao: Acao;
  campos: Record<string, string>;
  children: (enviando: boolean) => React.ReactNode;
  confirmar?: string;
  className?: string;
}) {
  const [estado, executar, enviando] = useActionState<EstadoCla, FormData>(acao, {});
  return (
    <form
      action={executar}
      className={className}
      onSubmit={(e) => {
        if (confirmar && !confirm(confirmar)) e.preventDefault();
      }}
    >
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      {children(enviando)}
      {(estado.erro || estado.mensagem) && (
        <div className="mt-2">
          <Aviso estado={estado} />
        </div>
      )}
    </form>
  );
}

export function BotaoPedirEntrada({ claId }: { claId: string }) {
  return (
    <FormSimples acao={pedirEntrada} campos={{ cla: claId }}>
      {(enviando) => (
        <button type="submit" className="btn-destaque" disabled={enviando}>
          {enviando ? "Enviando…" : "Pedir para entrar"}
        </button>
      )}
    </FormSimples>
  );
}

export function BotaoCancelarPedido({ pedidoId }: { pedidoId: string }) {
  return (
    <FormSimples acao={cancelarPedido} campos={{ pedido: pedidoId }}>
      {(enviando) => (
        <button type="submit" className="text-sm text-aco-400 underline hover:text-aco-50" disabled={enviando}>
          cancelar pedido
        </button>
      )}
    </FormSimples>
  );
}

export function BotaoSair() {
  return (
    <FormSimples acao={sairDoCla} campos={{}} confirmar="Sair do clã? Para voltar, você precisa pedir entrada de novo.">
      {(enviando) => (
        <button type="submit" className="btn-perigo" disabled={enviando}>
          <LogOut className="size-4" /> {enviando ? "Saindo…" : "Sair do clã"}
        </button>
      )}
    </FormSimples>
  );
}

export function RespostaPedido({ pedidoId }: { pedidoId: string }) {
  const [estado, executar, enviando] = useActionState<EstadoCla, FormData>(responderPedido, {});
  if (estado.mensagem) return <span className="text-sm text-vitoria">{estado.mensagem}</span>;
  return (
    <form action={executar} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="pedido" value={pedidoId} />
      <button type="submit" name="acao" value="aceitar" className="btn-destaque px-3 py-1.5" disabled={enviando}>
        <Check className="size-4" /> Aceitar
      </button>
      <button type="submit" name="acao" value="recusar" className="btn-perigo px-3 py-1.5" disabled={enviando}>
        <X className="size-4" /> Recusar
      </button>
      {estado.erro && <span className="w-full text-sm text-derrota">{estado.erro}</span>}
    </form>
  );
}

export function BotaoRemover({ claId, usuarioId, nick }: { claId: string; usuarioId: string; nick: string }) {
  return (
    <FormSimples acao={removerMembro} campos={{ cla: claId, usuario: usuarioId }} confirmar={`Remover ${nick} do clã?`}>
      {(enviando) => (
        <button type="submit" className="text-xs text-derrota hover:underline disabled:opacity-50" disabled={enviando}>
          remover
        </button>
      )}
    </FormSimples>
  );
}

export function FormSublider({ membros, atual }: { membros: { id: string; nick: string; cargo: Cargo }[]; atual: string }) {
  const [estado, executar, enviando] = useActionState<EstadoCla, FormData>(nomearSublider, {});
  const candidatos = membros.filter((m) => m.cargo !== "lider");
  return (
    <form action={executar} className="cartao space-y-3 p-4">
      <label htmlFor="sublider" className="rotulo">
        {NOME_CARGO.sublider}
      </label>
      <div className="flex flex-wrap gap-2">
        <select id="sublider" name="usuario" defaultValue={atual} className="campo flex-1">
          <option value="">Ninguém</option>
          {candidatos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nick}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secundario" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
      </div>
      <p className="text-xs text-aco-500">O sublíder também envia resultados e responde contestações.</p>
      <Aviso estado={estado} />
    </form>
  );
}

export function FormPerfilCla({ cla }: { cla: Cla }) {
  const [estado, executar, salvando] = useActionState<EstadoCla, FormData>(editarPerfilCla, {});
  const [subindo, setSubindo] = useState(false);
  return (
    <form action={executar} className="cartao space-y-4 p-5">
      <input type="hidden" name="cla" value={cla.id} />
      <CampoLogo tag={cla.tag} inicial={cla.logo} pasta={`clas/${cla.id}`} aoMudarEnvio={setSubindo} />
      <div>
        <label htmlFor="bio" className="rotulo">
          Bio
        </label>
        <textarea id="bio" name="bio" rows={4} maxLength={1000} defaultValue={cla.bio ?? ""} className="campo" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {(["discord", "instagram", "youtube"] as const).map((rede) => (
          <div key={rede}>
            <label htmlFor={rede} className="rotulo capitalize">
              {rede === "youtube" ? "YouTube" : rede}
            </label>
            <input id={rede} name={rede} type="url" defaultValue={cla.redes?.[rede] ?? ""} placeholder="https://…" className="campo" />
          </div>
        ))}
      </div>
      <p className="text-xs text-aco-500">Nome e tag do clã só o ADM altera.</p>
      <Aviso estado={estado} />
      <button type="submit" className="btn-destaque" disabled={salvando || subindo}>
        {salvando ? "Salvando…" : "Salvar perfil"}
      </button>
    </form>
  );
}
