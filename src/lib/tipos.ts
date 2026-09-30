// Formato das linhas do banco (supabase/migrations). Mantenha em sincronia com o SQL.

export type Papel = "jogador" | "adm";
export type Cargo = "lider" | "sublider" | "membro";
/** Decisão do ADM. */
export type StatusConfronto = "pendente" | "aprovado" | "rejeitado";
/** Resposta do adversário (o "sem resposta" é calculado pelo prazo, ver src/lib/confronto.ts). */
export type RespostaAdversario = "aguardando" | "confirmado" | "contestado";
export type ResolucaoContestacao = "mantido" | "anulado" | "corrigido";

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
  enviado_em: string;
  status: StatusConfronto;
  resposta: RespostaAdversario;
  contestacao_resolvida: ResolucaoContestacao | null;
  partidas_a: number;
  partidas_b: number;
  conta_pontos: boolean | null;
  variacao: number | null;
  pontos_a_antes: number | null;
  pontos_b_antes: number | null;
  cla_a: ClaResumo;
  cla_b: ClaResumo;
};

export const NOME_STATUS: Record<StatusConfronto, string> = {
  pendente: "Aguardando ADM",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export const NOME_CARGO: Record<Cargo, string> = {
  lider: "Líder",
  sublider: "Sublíder",
  membro: "Membro",
};

export type Campeonato = { id: string; nome: string; data: string | null; descricao: string | null };

export type Colocacao = { colocacao: number; cla: ClaResumo };

/** Campeonato com as colocações dos clãs, como vem de SELECT_CAMPEONATO (src/lib/dados.ts). */
export type CampeonatoComColocacoes = Campeonato & { colocacoes: Colocacao[] };

/** "Campeão", "Vice", "3º lugar"… */
export function nomeColocacao(colocacao: number): string {
  return colocacao === 1 ? "Campeão" : colocacao === 2 ? "Vice" : `${colocacao}º lugar`;
}
