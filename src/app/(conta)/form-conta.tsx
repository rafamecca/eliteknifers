"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cadastrar, entrar, type EstadoForm } from "./actions";

export function FormEntrar({ proximo }: { proximo: string }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(entrar, {});
  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="proximo" value={proximo} />
      <Campo nome="email" rotulo="E-mail" tipo="email" autoComplete="email" />
      <Campo nome="senha" rotulo="Senha" tipo="password" autoComplete="current-password" />
      <Aviso estado={estado} />
      <button type="submit" className="btn-destaque w-full" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-aco-400">
        Ainda não tem conta?{" "}
        <Link href="/cadastrar" className="font-semibold text-destaque-claro hover:underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}

export function FormCadastrar() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(cadastrar, {});
  if (estado.mensagem) {
    return (
      <div className="space-y-2 text-center">
        <p className="font-semibold text-vitoria">{estado.mensagem}</p>
        <p className="text-sm text-aco-400">Abra o link do e-mail para ativar a conta e depois entre.</p>
      </div>
    );
  }
  return (
    <form action={acao} className="space-y-4">
      <Campo nome="nick" rotulo="Nick no jogo" autoComplete="nickname" minLength={2} maxLength={24} />
      <Campo nome="email" rotulo="E-mail" tipo="email" autoComplete="email" />
      <Campo nome="senha" rotulo="Senha (mín. 8 caracteres)" tipo="password" autoComplete="new-password" minLength={8} />
      <Aviso estado={estado} />
      <button type="submit" className="btn-destaque w-full" disabled={enviando}>
        {enviando ? "Criando conta…" : "Criar conta"}
      </button>
      <p className="text-center text-sm text-aco-400">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-destaque-claro hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function Campo({
  nome,
  rotulo,
  tipo = "text",
  ...resto
}: { nome: string; rotulo: string; tipo?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={nome} className="rotulo">
        {rotulo}
      </label>
      <input id={nome} name={nome} type={tipo} required className="campo" {...resto} />
    </div>
  );
}

function Aviso({ estado }: { estado: EstadoForm }) {
  if (!estado.erro) return null;
  return (
    <p role="alert" className="rounded-lg border border-derrota/40 bg-derrota/10 px-3 py-2 text-sm text-derrota">
      {estado.erro}
    </p>
  );
}
