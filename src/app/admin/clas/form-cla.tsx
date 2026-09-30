"use client";

import { useActionState, useState } from "react";
import { CampoLogo } from "@/components/campo-logo";
import type { Cla } from "@/lib/tipos";
import { salvarCla, type EstadoAdmin } from "../actions";
import { AvisoAdmin } from "../aviso";

export function FormCla({ cla }: { cla?: Cla }) {
  const [estado, acao, salvando] = useActionState<EstadoAdmin, FormData>(salvarCla, {});
  const [tag, setTag] = useState(cla?.tag ?? "");
  const [subindo, setSubindo] = useState(false);

  return (
    <form action={acao} className="cartao space-y-4 p-5">
      {cla && <input type="hidden" name="id" value={cla.id} />}
      <CampoLogo tag={tag} inicial={cla?.logo ?? null} pasta="clas" aoMudarEnvio={setSubindo} />

      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Campo rotulo="Tag" nome="tag" valor={tag} onChange={setTag} required maxLength={12} placeholder="SwK" />
        <Campo rotulo="Nome" nome="nome" padrao={cla?.nome} required maxLength={60} />
      </div>
      <Campo rotulo="Fundado em" nome="fundado_em" tipo="date" padrao={cla?.fundado_em ?? ""} />
      <div>
        <label htmlFor="bio" className="rotulo">
          Bio
        </label>
        <textarea id="bio" name="bio" rows={3} maxLength={1000} defaultValue={cla?.bio ?? ""} className="campo" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Discord" nome="discord" tipo="url" padrao={cla?.redes?.discord} placeholder="https://discord.gg/…" />
        <Campo rotulo="Instagram" nome="instagram" tipo="url" padrao={cla?.redes?.instagram} placeholder="https://instagram.com/…" />
        <Campo rotulo="YouTube" nome="youtube" tipo="url" padrao={cla?.redes?.youtube} placeholder="https://youtube.com/…" />
      </div>
      {cla && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={cla.ativo} className="size-4 accent-destaque" />
          Clã ativo (inativos somem do ranking e da lista de adversários)
        </label>
      )}

      <AvisoAdmin estado={estado} />
      <button type="submit" className="btn-destaque" disabled={salvando || subindo}>
        {salvando ? "Salvando…" : cla ? "Salvar alterações" : "Cadastrar clã"}
      </button>
    </form>
  );
}

function Campo({
  rotulo,
  nome,
  tipo = "text",
  padrao,
  valor,
  onChange,
  ...resto
}: {
  rotulo: string;
  nome: string;
  tipo?: string;
  padrao?: string;
  valor?: string;
  onChange?: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const controle = onChange ? { value: valor, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : { defaultValue: padrao };
  return (
    <div>
      <label htmlFor={nome} className="rotulo">
        {rotulo}
      </label>
      <input id={nome} name={nome} type={tipo} className="campo" {...controle} {...resto} />
    </div>
  );
}
