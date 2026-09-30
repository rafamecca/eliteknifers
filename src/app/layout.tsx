import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { Menu } from "@/components/menu";
import { DESCRICAO_SITE, NOME_SITE } from "@/lib/config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", weight: ["500", "600"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: NOME_SITE, template: `%s · ${NOME_SITE}` },
  description: DESCRICAO_SITE,
};

export const viewport: Viewport = {
  themeColor: "#0c0d0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${oswald.variable}`}>
      <body className="min-h-dvh">
        <Menu />
        <main className="px-4 pt-20 pb-12 lg:ml-64 lg:px-10 lg:pt-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </body>
    </html>
  );
}
