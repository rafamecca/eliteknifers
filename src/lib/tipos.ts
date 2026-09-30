// Formato das linhas do banco (supabase/migrations). Mantenha em sincronia com o SQL.

export type Papel = "jogador" | "adm";
export type Cargo = "lider" | "sublider" | "membro";
export type StatusConfronto =
  | "aguardando_adversario"
  | "confirmado"
  | "contestado"
  | "sem_resposta"
  | "aprovado"
  | "rejeitado";

export type Usuario = {
  id: string;
  nick: string;
  avatar: string | null;
  papel: Papel;
  banido: boolean;
};

export type Redes = { discord?: string; instagram?: string; youtube?: string };

export type Cla = {
  id: string;
  nome: string;
  tag: string;
  logo: string | null;
  bio: string | null;
  redes: Redes;
  fundado_em: string | null;
  ativo: boolean;
};

export type ClaResumo = Pick<Cla, "id" | "nome" | "tag" | "logo">;

export type Temporada = { id: string; nome: string; inicio: string; fim: string; ativa: boolean };

export type Partida = { id: string; numero: number; rounds_a: number; rounds_b: number };

export type Print = {
  id: string;
  partida_id: string | null;
  arquivo: string;
  tipo: "confronto" | "partida";
};

/** Confronto com os dois clãs, como vem de SELECT_CONFRONTO (src/lib/dados.ts). */
export type ConfrontoComClas = {
  id: string;
  data: string;
  status: StatusConfronto;
  partidas_a: number;
  partidas_b: number;
  conta_pontos: boolean | null;
  variacao: number | null;
  pontos_a_antes: number | null;
  pontos_b_antes: number | null;
  cla_a: ClaResumo;
  cla_b: ClaResumo;
};

export const PENDENTES: StatusConfronto[] = ["aguardando_adversario", "confirmado", "contestado", "sem_resposta"];

export const NOME_STATUS: Record<StatusConfronto, string> = {
  aguardando_adversario: "Aguardando adversário",
  confirmado: "Confirmado",
  contestado: "Contestado",
  sem_resposta: "Sem resposta",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export const NOME_CARGO: Record<Cargo, string> = {
  lider: "Líder",
  sublider: "Sublíder",
  membro: "Membro",
};
