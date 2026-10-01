import { useId } from "react";

// Logo do Elite Knifers: kukri de aço com chamas, traçado sobre a faca de referência do usuário.
// "horizontal" = faca deitada; "icone" = faca inclinada num quadrado 64x64.
// O mesmo desenho está no favicon (src/app/icon.svg).

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
      <stop offset="0" stopColor="#e4e3df"/>
      <stop offset="0.55" stopColor="#b9b9b5"/>
      <stop offset="1" stopColor="#8d8f8e"/>
      </linearGradient>
      <linearGradient id={`${id}fogo`} x1="0" y1="0" x2="1" y2="0.3">
      <stop offset="0" stopColor="#ff5a0a"/>
      <stop offset="0.5" stopColor="#ff7d12"/>
      <stop offset="1" stopColor="#ff9c1f"/>
      </linearGradient>
      <linearGradient id={`${id}cabo`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffb23a"/>
      <stop offset="0.6" stopColor="#f07a14"/>
      <stop offset="1" stopColor="#c8500c"/>
      </linearGradient>
      <linearGradient id={`${id}couro`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#6d4a33"/>
      <stop offset="1" stopColor="#3f2819"/>
      </linearGradient>
      <clipPath id={`${id}lamina`}>
      <path d="M420 141 C397 150 372 161 332 168 C292 174 232 162 172 162 C140 162 100 170 68 185 C110 213 170 246 236 253 C300 259 350 232 390 206 C405 198 416 195 430 194 Z"/>
      </clipPath>
      </defs>
      <path d="M420 141 C397 150 372 161 332 168 C292 174 232 162 172 162 C140 162 100 170 68 185 C110 213 170 246 236 253 C300 259 350 232 390 206 C405 198 416 195 430 194 Z"
      fill={`url(#${id}aco)`} stroke="#5f6163" strokeWidth="2.2" strokeLinejoin="round"/>
      <g clipPath={`url(#${id}lamina)`} strokeLinejoin="round">
      <path d="M448 118 L448 192 C430 194 386 206 360 210 C376 202 384 201 378 197 C360 199 360 215 334 219 C350 211 358 205 352 201 C334 203 330 222 304 226 C320 218 332 207 326 203 C308 205 298 230 272 234 C288 226 304 207 298 203 C280 205 266 227 240 231 C256 223 276 204 270 200 C252 202 236 212 210 216 C226 208 248 198 242 194 C224 196 210 197 184 201 C200 193 220 190 214 186 C196 188 178 187 152 191 C168 183 192 180 186 176 L170 160 L170 118 Z"
      fill={`url(#${id}fogo)`} stroke="#d8261a" strokeWidth="2.6"/>
      <g fill="#ffb82e" opacity="0.9">
      <path d="M440 150 L440 172 C422 174 394 186 368 190 C384 182 392 180 386 176 C368 178 362 194 336 198 C352 190 364 184 358 180 C340 182 330 202 304 206 C320 198 336 186 330 182 C312 184 298 206 272 210 C288 202 306 184 300 180 C282 182 266 200 240 204 C256 196 276 180 270 176 C252 178 238 186 212 190 C228 182 246 174 240 170 L230 166 L440 150 Z"/>
      </g>
      <g fill="none" stroke="#ffe27a" strokeWidth="1.6" opacity="0.85" strokeLinecap="round">
      <path d="M430 160 C400 166 372 180 350 196"/>
      <path d="M392 180 C360 188 330 204 310 218"/>
      <path d="M330 186 C300 194 276 210 258 224"/>
      <path d="M268 184 C244 190 222 200 206 210"/>
      </g>
      </g>
      <path d="M80 188 C120 214 172 243 236 249 C292 254 340 232 382 206" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round"/>
      <path d="M418 140 C450 134 490 131 522 136 C560 142 595 147 624 153 L622 181 C598 188 576 189 556 184 C532 178 508 171 486 178 C466 185 446 193 428 197 Z"
      fill={`url(#${id}cabo)`} stroke="#6b2a0a" strokeWidth="2.2" strokeLinejoin="round"/>
      <g fill="#8a3a0c" opacity="0.55">
      <path d="M500 142 Q515 150 532 142 Q520 158 506 156 Z"/>
      <path d="M598 156 Q608 162 618 158 Q612 172 602 170 Z"/>
      </g>
      <path d="M416 141 C438 136 462 133 487 133 L487 177 C468 183 448 191 430 198 Z" fill={`url(#${id}couro)`} stroke="#2a1a0f" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M548 141 L592 147 L592 188 C578 189 562 187 548 182 Z" fill={`url(#${id}couro)`} stroke="#2a1a0f" strokeWidth="1.8" strokeLinejoin="round"/>
      <g stroke="#23150c" strokeWidth="1.6" opacity="0.85">
      <path d="M425 139 L437 195 M434 137 L446 192 M443 136 L455 188 M452 135 L463 185 M461 134 L471 182 M470 133 L479 180 M479 133 L486 178"/>
      <path d="M556 142 L558 184 M565 143 L566 186 M574 144 L575 187 M583 146 L584 188"/>
      </g>
      <path d="M612 151 C626 144 643 150 641 164 C640 174 632 180 629 190 C626 201 614 206 605 198 C612 190 613 180 613 170 Z"
      fill="#4b3526" stroke="#241710" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M618 154 C628 151 636 155 636 162" fill="none" stroke="#7a5a44" strokeWidth="1.6" strokeLinecap="round"/>
    </>
  );

  return variante === "icone" ? (
    <svg viewBox="0 0 64 64" className={className} {...acessivel}>
      <g transform="translate(32 33) rotate(-32) scale(0.106) translate(-355 -195)">{faca}</g>
    </svg>
  ) : (
    <svg viewBox="60 122 590 146" className={className} {...acessivel}>
      {faca}
    </svg>
  );
}
