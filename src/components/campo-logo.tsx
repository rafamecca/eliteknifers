"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { comprimirImagem, subirArquivo, TIPOS_ACEITOS } from "@/lib/imagem";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { LogoCla } from "./logo-cla";

/**
 * Envia o logo (512 px, WebP) para o bucket "logos" na `pasta` indicada e guarda o caminho
 * num input escondido `name="logo"`. `aoMudarEnvio` avisa o formulário enquanto sobe.
 */
export function CampoLogo({
  tag,
  inicial,
  pasta,
  aoMudarEnvio,
}: {
  tag: string;
  inicial: string | null;
  pasta: string;
  aoMudarEnvio?: (subindo: boolean) => void;
}) {
  const [logo, setLogo] = useState(inicial ?? "");
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setSubindo(true);
    aoMudarEnvio?.(true);
    try {
      const imagem = await comprimirImagem(arquivo, 512, 0.9);
      setLogo(await subirArquivo(criarClienteNavegador(), "logos", pasta, imagem));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar o logo.");
    } finally {
      setSubindo(false);
      aoMudarEnvio?.(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="logo" value={logo} />
      <LogoCla cla={{ tag: tag || "?", logo: logo || null }} tamanho={72} />
      <div className="space-y-1">
        <label className="btn-secundario cursor-pointer">
          <input type="file" accept={TIPOS_ACEITOS} className="sr-only" onChange={(e) => escolher(e.target.files?.[0])} />
          {subindo ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {logo ? "Trocar logo" : "Enviar logo"}
        </label>
        {logo && (
          <button type="button" onClick={() => setLogo("")} className="block text-xs text-aco-400 underline">
            remover logo
          </button>
        )}
        {erro && <p className="text-xs text-derrota">{erro}</p>}
      </div>
    </div>
  );
}
