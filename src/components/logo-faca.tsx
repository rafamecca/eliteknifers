import { useId } from "react";

// Logo do Elite Knifers: kukri de aço com chamas (inspirado na faca de referência do usuário).
// "horizontal" = faca deitada (viewBox 122x44); "icone" = faca inclinada num quadrado 64x64.

export function LogoFaca({
  variante = "horizontal",
  className,
  titulo = "Elite Knifers",
}: {
  variante?: "horizontal" | "icone";
  className?: string;
  titulo?: string;
}) {
  const id = useId().replace(/:/g, "");
  // Sem título (ex.: ao lado do nome escrito), o desenho é só decoração para leitores de tela.
  const acessivel = titulo ? { role: "img", "aria-label": titulo } : { "aria-hidden": true };
  const faca = (
    <>
      <defs>
        <linearGradient id={`${id}aco`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f4f6" />
          <stop offset="0.5" stopColor="#bcc3cb" />
          <stop offset="1" stopColor="#78818b" />
        </linearGradient>
        <linearGradient id={`${id}fogo`} x1="1" y1="0" x2="0" y2="0.4">
          <stop offset="0" stopColor="#ffd84a" />
          <stop offset="0.5" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#ea4a0e" />
        </linearGradient>
        <linearGradient id={`${id}cabo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb640" />
          <stop offset="1" stopColor="#d24a10" />
        </linearGradient>
        <clipPath id={`${id}lamina`}>
          <path d={LAMINA} />
        </clipPath>
      </defs>
      <path d={LAMINA} fill={`url(#${id}aco)`} stroke="#555d66" strokeWidth="0.9" strokeLinejoin="round" />
      <g clipPath={`url(#${id}lamina)`} strokeLinejoin="round">
        <path
          d="M86 10 L86 25.2 C80 24.8 74 25.2 67 26.6 C70.5 24.6 72.5 23.6 74 23 C66 24 58 26.6 49.5 30.2 C55 26 58.6 24 61.4 22.8 C53 23.8 45.4 26 37 29.4 C43 24.6 47 22.4 51 20.8 C43 21.2 35 22.8 24.5 26.4 C33 20.4 41.5 17.6 50 15.4 L62 9 Z"
          fill={`url(#${id}fogo)`}
          stroke="#c7231a"
          strokeWidth="1"
        />
        <path
          d="M86 13.6 L86 21.6 C80 21.6 76 22 70.5 23 C73.5 21.4 75 20.8 76 20.4 C70 20.6 64 21.6 57 23.6 C62 20.6 66 19 70 18 C64 18 58 18.8 52 20 C58 17 64 15.6 70 14.8 Z"
          fill="#ffe27a"
          stroke="#ff9d2e"
          strokeWidth="0.5"
        />
      </g>
      <path d="M9 30.9 C20 34 32 35.6 43 34.2" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" strokeLinecap="round" />
      <path
        d="M78 14.6 C88 13.4 100 11.8 110 11 L112 10.4 L112 21.2 L110 20.6 C100 21.6 90 24.2 78 27 Z"
        fill={`url(#${id}cabo)`}
        stroke="#6b2a0a"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <g fill="#5a3a24" stroke="#2c1b10" strokeWidth="0.5" strokeLinejoin="round">
        <path d="M80 14.4 L89 13.3 L89 24.6 L80 26.6 Z" />
        <path d="M99 12.2 L105 11.6 L105 21.4 L99 22.4 Z" />
      </g>
      <path d="M82.2 14.1 V26.1 M84.5 13.8 V25.6 M86.8 13.6 V25.1 M101 12 V22.1 M103 11.8 V21.8" stroke="#2c1b10" strokeWidth="0.6" />
      <path d="M111 10.6 C116.4 9.4 119.8 12.6 119.4 16 C119.2 19.6 116.4 22.2 111 21 Z" fill="#4a3526" stroke="#2c1b10" strokeWidth="0.7" />
    </>
  );

  return variante === "icone" ? (
    <svg viewBox="0 0 64 64" className={className} {...acessivel}>
      <g transform="translate(32 33) rotate(-35) scale(0.5) translate(-62 -22)">{faca}</g>
    </svg>
  ) : (
    <svg viewBox="0 0 122 44" className={className} {...acessivel}>
      {faca}
    </svg>
  );
}

const LAMINA =
  "M80 15.4 C70 14.8 62 14.6 54 16 C42 18 24 20.4 4 30.6 C18 34.2 32 36.6 44 35 C56 33.4 62 27.6 70 26.7 C74 26.3 77 26.5 80 26.5 Z";
