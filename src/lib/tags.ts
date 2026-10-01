// Tags de jogador (ESPECIFICACAO.md › Tags de jogador): regras puras usadas na tela.
import type { Tag } from "./tipos";

/** Ao lado do nick em listas aparecem no máximo estas; o perfil mostra todas. */
export const MAX_TAGS_AO_LADO = 2;
export const TAMANHO_NOME_TAG = 20;
export const COR_VALIDA = /^#[0-9a-f]{6}$/;

const TEXTO_ESCURO = "#131518";
const TEXTO_CLARO = "#ffffff";

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

/** Cor do texto sobre o fundo da tag: a que der mais contraste (WCAG). */
export function corDoTexto(fundo: string): string {
  if (!COR_VALIDA.test(fundo)) return TEXTO_CLARO;
  const l = luminancia(fundo);
  const contrasteEscuro = (l + 0.05) / (luminancia(TEXTO_ESCURO) + 0.05);
  const contrasteClaro = 1.05 / (l + 0.05);
  return contrasteEscuro >= contrasteClaro ? TEXTO_ESCURO : TEXTO_CLARO;
}

/** Mais importante primeiro (menor ordem), depois pelo nome. */
export function ordenarTags(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Normaliza o que veio do formulário: nome sem espaços nas pontas e cor "#rrggbb" minúscula. */
export function validarTag(nome: string, cor: string): { nome: string; cor: string } | { erro: string } {
  const n = nome.trim().replace(/\s+/g, " ");
  const c = cor.trim().toLowerCase();
  if (n.length < 1 || n.length > TAMANHO_NOME_TAG) return { erro: `O nome precisa ter de 1 a ${TAMANHO_NOME_TAG} caracteres.` };
  if (!COR_VALIDA.test(c)) return { erro: "Cor inválida." };
  return { nome: n, cor: c };
}
