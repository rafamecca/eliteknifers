import { TriangleAlert } from "lucide-react";
import { contestacaoAberta, estadoResposta, tempoRestante, type EstadoResposta } from "@/lib/confronto";
import { NOME_STATUS, type ConfrontoComClas, type StatusConfronto } from "@/lib/tipos";

const COR_STATUS: Record<StatusConfronto, string> = {
  pendente: "border-alerta/40 bg-alerta/10 text-alerta",
  aprovado: "border-vitoria/40 bg-vitoria/10 text-vitoria",
  rejeitado: "border-derrota/40 bg-derrota/10 text-derrota",
};

const selo = "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

/** Decisão do ADM. */
export function StatusConfrontoSelo({ status }: { status: StatusConfronto }) {
  return <span className={`${selo} ${COR_STATUS[status]}`}>{NOME_STATUS[status]}</span>;
}

const RESPOSTA: Record<EstadoResposta, { nome: string; cor: string }> = {
  aguardando: { nome: "Aguardando adversário", cor: "border-grafite-600 bg-grafite-800 text-aco-200" },
  confirmado: { nome: "Confirmado pelo adversário", cor: "border-vitoria/40 bg-vitoria/10 text-vitoria" },
  contestado: { nome: "Contestado", cor: "border-destaque/50 bg-destaque/15 text-destaque-claro" },
  sem_resposta: { nome: "Sem resposta", cor: "border-grafite-600 bg-grafite-800 text-aco-400" },
};

type ComResposta = Pick<ConfrontoComClas, "enviado_em" | "status" | "resposta" | "contestacao_resolvida">;

/** Resposta do adversário (com o tempo que falta, se ainda dá para responder). */
export function RespostaSelo({ confronto }: { confronto: ComResposta }) {
  const estado = estadoResposta(confronto);
  const { nome, cor } = RESPOSTA[estado];
  const falta = estado === "aguardando" ? tempoRestante(confronto.enviado_em) : null;
  const resolvida = estado === "contestado" && !contestacaoAberta(confronto);
  return (
    <span className={`${selo} ${resolvida ? RESPOSTA.sem_resposta.cor : cor}`}>
      {estado === "contestado" && !resolvida && <TriangleAlert className="size-3" />}
      {resolvida ? "Contestação avaliada" : nome}
      {falta && <span className="font-normal opacity-80">· {falta}</span>}
    </span>
  );
}

/** Aviso ao lado de um resultado que conta no ranking mas foi contestado e o ADM ainda não avaliou. */
export function AvisoContestado({ compacto = false }: { compacto?: boolean }) {
  return (
    <span
      className={`${selo} border-destaque/50 bg-destaque/15 text-destaque-claro`}
      title="O adversário contestou este resultado. O ADM vai avaliar."
    >
      <TriangleAlert className="size-3" />
      {compacto ? <span className="sr-only">Contestado</span> : "Contestado"}
    </span>
  );
}
