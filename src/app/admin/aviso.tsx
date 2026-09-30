import type { EstadoAdmin } from "./actions";

export function AvisoAdmin({ estado }: { estado: EstadoAdmin }) {
  if (estado.erro) {
    return (
      <p role="alert" className="rounded-lg border border-derrota/40 bg-derrota/10 px-3 py-2 text-sm text-derrota">
        {estado.erro}
      </p>
    );
  }
  if (estado.mensagem) {
    return <p className="rounded-lg border border-vitoria/40 bg-vitoria/10 px-3 py-2 text-sm text-vitoria">{estado.mensagem}</p>;
  }
  return null;
}
