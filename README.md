# Elite Knifers — Ranking de Clãs @79

Site de ranking dos clãs da comunidade Knifer no modo @79 do Point Blank.
A especificação completa está em [`ESPECIFICACAO.md`](ESPECIFICACAO.md).

**Fase 1 (base no ar):** cadastro e login, clãs cadastrados pelo ADM com líder e sublíder,
envio de resultado com prints e rounds, fila de aprovação do ADM, Elo calculado na aprovação,
ranking com pódio e tabela, perfil do clã com os últimos 20 confrontos.

Feito com Next.js 16 + Tailwind CSS 4 + Supabase (banco, login e arquivos), hospedado na Vercel.

## Colocar no ar (primeira vez)

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito).
2. Abra **SQL Editor**, cole todo o conteúdo de
   [`supabase/migrations/20260930000000_fase1.sql`](supabase/migrations/20260930000000_fase1.sql) e clique em **Run**.
   Isso cria as tabelas, as regras de acesso, os buckets de imagens e a "Temporada 1"
   (começando hoje e durando 3 meses — ajuste nome e datas em **Table Editor › temporadas** se quiser).
3. Em **Authentication › URL Configuration**:
   - **Site URL**: o endereço do site (ex.: `https://seu-site.vercel.app`).
   - **Redirect URLs**: adicione `https://seu-site.vercel.app/**` e `http://localhost:3000/**`.
4. (Recomendado) Em **Authentication › Emails › Confirm signup**, troque o link do e-mail por:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirmar minha conta</a>
   ```
   Assim a confirmação funciona mesmo se o jogador abrir o e-mail em outro aparelho.
5. Em **Project Settings › API** copie a **Project URL** e a **Publishable key** (ou a antiga *anon key*).

### 2. Rodar no computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
cp .env.example .env.local   # e preencha com a URL e a chave do Supabase
npm install
npm run dev                  # abre em http://localhost:3000
```

### 3. Primeiro ADM

Cadastre-se pelo site e confirme o e-mail. Depois, no **SQL Editor** do Supabase:

```sql
update usuarios set papel = 'adm' where nick = 'SEU_NICK';
```

Recarregue o site: o item **Painel ADM** aparece no menu. Por lá você cadastra os clãs e,
na página de cada clã, define líder e sublíder (eles precisam ter conta no site).

### 4. Publicar na Vercel

1. Em [vercel.com](https://vercel.com), **Add New › Project** e importe este repositório do GitHub.
2. Em **Environment Variables**, cadastre `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL` (o endereço do site).
3. **Deploy**. A cada push no GitHub a Vercel publica de novo sozinha.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Site em modo de desenvolvimento |
| `npm run build` | Build de produção |
| `npm test` | Testes das regras (Elo, placar, ranking) |
| `npm run test:sql` | Testa a migração num Postgres local descartável (precisa do PostgreSQL instalado) |
| `npm run lint` / `npm run typecheck` | Conferências de código |
