"use client";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <h1 className="font-display text-4xl tracking-wide uppercase">Algo deu errado</h1>
      <p className="mt-2 text-sm text-aco-400">{error.message || "Tente de novo em instantes."}</p>
      <button type="button" onClick={reset} className="btn-secundario mt-6">
        Tentar de novo
      </button>
    </div>
  );
}
