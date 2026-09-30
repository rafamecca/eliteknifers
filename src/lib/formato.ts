import { FUSO } from "./config";

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dataCurta = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" });
const dataLonga = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" });

export function formatarDataHora(iso: string): string {
  return dataHora.format(new Date(iso)).replace(",", " às");
}

export function formatarDataCurta(iso: string): string {
  return dataCurta.format(new Date(iso));
}

/** Datas sem hora (colunas date do banco, ex.: "2026-09-30"). */
export function formatarDia(dia: string): string {
  return dataLonga.format(new Date(`${dia}T00:00:00Z`));
}

/** +21, −21 ou 0 (com sinal de menos tipográfico). */
export function formatarVariacao(valor: number): string {
  if (valor > 0) return `+${valor}`;
  if (valor < 0) return `−${Math.abs(valor)}`;
  return "0";
}

const diaBrasilia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

/** "2026-09-30": o dia do horário de Brasília (regra do primeiro confronto do dia). */
export function diaEmBrasilia(iso: string): string {
  return diaBrasilia.format(new Date(iso));
}

/** Hoje no horário de Brasília, "AAAA-MM-DD". */
export function hojeEmBrasilia(): string {
  return diaEmBrasilia(new Date().toISOString());
}

/** Último dia de um período de N meses começando em `dia` (ex.: 2026-10-01 + 3 meses → 2026-12-31). */
export function fimDoPeriodo(dia: string, meses: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const fim = new Date(Date.UTC(a, m - 1 + meses, d) - 86_400_000);
  return fim.toISOString().slice(0, 10);
}
