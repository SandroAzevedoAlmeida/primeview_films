# PrimeView Filmes

Site institucional oficial da PrimeView Filmes, produtora audiovisual especializada no mercado imobiliário. O projeto usa Astro com geração estática, CSS moderno e JavaScript nativo apenas onde há interação necessária.

## Visão geral

A Home apresenta posicionamento, serviços, públicos, processo, Tour Virtual 360°, redes sociais, contato e formulário de orçamento. O conteúdo comercial está em pt-BR e os dados oficiais ficam centralizados em `src/config/company.ts` e `src/config/social.ts`.

## Desenvolvimento

Requisitos: Node.js `>=22.12.0`.

```bash
npm install
npm run dev
npm run build
npm run preview
```

O build gera `dist/`, compatível com Cloudflare Pages.

## Estrutura

- `src/pages/index.astro`: Home.
- `src/components/`: Header, redes, formulário e botão de WhatsApp.
- `src/layouts/`: metadados e estrutura base.
- `src/config/`: dados oficiais da empresa e redes.
- `src/data/portfolio.ts`: contrato e coleção de portfólio.
- `src/styles/global.css`: tokens e identidade visual.
- `functions/api/contact.ts`: Function para o formulário.
- `public/assets/brand/`: logo e favicon oficiais.

## Dados e conteúdo

Altere telefone, e-mail, cidade e região somente em `src/config/company.ts`. Altere URLs sociais somente em `src/config/social.ts`. Para inserir um projeto real, adicione o item em `src/data/portfolio.ts` e os arquivos de mídia em `public/assets/portfolio/`. Não cadastre clientes, imóveis, métricas, depoimentos ou resultados sem autorização e material real.

O hero atual usa uma composição discreta com o logo oficial porque ainda não existe uma imagem de hero aprovada. Quando houver uma imagem real, adicione `public/assets/images/hero-primeview.webp`, preserve o original e ajuste a regra `.hero-image`.

## Formulário, Turnstile e Resend

O navegador envia `POST /api/contact`. A Function valida campos e limites, verifica o Turnstile no servidor e envia a mensagem pelo Resend. Nenhum segredo é enviado ao navegador.

Copie `.env.example` para o ambiente apropriado e configure:

- `PUBLIC_TURNSTILE_SITE_KEY`: site key pública do Turnstile.
- `TURNSTILE_SECRET_KEY`: secret do Turnstile, somente na Function.
- `RESEND_API_KEY`: chave do Resend, somente na Function.
- `CONTACT_TO_EMAIL`: opcional; por padrão, `primeviewfilmes@gmail.com`.

A origem usada no e-mail é temporária (`onboarding@resend.dev`). Depois de verificar um domínio próprio no Resend, substitua por um remetente desse domínio em `functions/api/contact.ts`.

Sem as variáveis configuradas, o formulário mantém a estrutura, mas a Function responde com indisponibilidade de canal. O WhatsApp continua sendo o CTA principal.

## SEO e acessibilidade

A Home possui title, description, canonical, Open Graph, Twitter Card, Schema Organization, favicon, `robots.txt`, sitemap, `lang="pt-BR"`, foco visível, labels de formulário, HTML semântico e suporte a movimento reduzido. A URL canônica deve ser revisada quando o domínio definitivo for definido.

## Cloudflare Pages

1. Crie ou conecte o projeto no Workers & Pages.
2. Conecte o repositório GitHub e a branch `main`.
3. Use `npm run build` como comando de build.
4. Use `dist` como diretório de saída.
5. Cadastre `PUBLIC_TURNSTILE_SITE_KEY` como variável pública de build.
6. Cadastre `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY` e, se necessário, `CONTACT_TO_EMAIL` como secrets/variáveis da Function.
7. Teste o formulário em Preview antes da produção.

O domínio próprio `primeviewfilmes.com.br` ainda precisa ser comprado e conectado quando estiver disponível. Não há deploy automático ou push realizado por este projeto.

## Git e manutenção

```bash
git status
git add .
git commit -m "atualiza site PrimeView Filmes"
git push origin main
```

Antes de publicar, execute `npm run build`, confira links, imagens, dados de contato e versões mobile. Não versione `.env`, `.dev.vars`, tokens ou chaves.

## Próximas evoluções

A arquitetura está preparada para portfólio real, páginas de serviços, política de privacidade e blog com Astro Content Collections. Essas áreas devem ser adicionadas quando houver conteúdo aprovado, sem inventar informação comercial.
