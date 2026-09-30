import { NOME_STATUS, type StatusConfronto } from "@/lib/tipos";

const COR: Record<StatusConfronto, string> = {
  aguardando_adversario: "border-alerta/40 bg-alerta/10 text-alerta",
  confirmado: "border-alerta/40 bg-alerta/10 text-alerta",
  sem_resposta: "border-alerta/40 bg-alerta/10 text-alerta",
  contestado: "border-destaque/50 bg-destaque/15 text-destaque-claro",
  aprovado: "border-vitoria/40 bg-vitoria/10 text-vitoria",
  rejeitado: "border-derrota/40 bg-derrota/10 text-derrota",
};

export function StatusConfrontoSelo({ status }: { status: StatusConfronto }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${COR[status]}`}>
      {NOME_STATUS[status]}
    </span>
  );
}
