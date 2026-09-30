import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="py-16 text-center">
      <p className="font-display text-8xl text-destaque">404</p>
      <h1 className="mt-2 font-display text-4xl tracking-wide uppercase">Página não encontrada</h1>
      <Link href="/" className="btn-secundario mt-6">
        Voltar ao início
      </Link>
    </div>
  );
}
