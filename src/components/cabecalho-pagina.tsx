export function CabecalhoPagina({
  selo,
  titulo,
  subtitulo,
  children,
}: {
  selo?: string;
  titulo: string;
  subtitulo?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {selo && (
          <span className="inline-flex items-center gap-2 rounded-full border border-destaque/40 bg-destaque/10 px-3 py-1 text-xs font-semibold tracking-wider text-destaque-claro uppercase">
            <span className="size-1.5 rounded-full bg-destaque" />
            {selo}
          </span>
        )}
        <h1 className="mt-3 font-display text-5xl leading-none tracking-wide uppercase sm:text-6xl">{titulo}</h1>
        {subtitulo && <p className="mt-2 text-aco-400">{subtitulo}</p>}
      </div>
      {children}
    </header>
  );
}
