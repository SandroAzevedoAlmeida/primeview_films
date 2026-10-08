# PrimeView Filmes

Site institucional oficial da PrimeView Filmes, produtora audiovisual para imóveis, empresas e negócios locais. O projeto usa Astro com geração estática, CSS moderno e JavaScript nativo apenas onde há interação necessária.

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

O Hero e a identidade visual atuais estão aprovados. Preserve `public/assets/images/hero-primeview.webp`, seu recorte, sobreposição e composição. Os dois cartões virtuais são protegidos: não alterar `src/components/VirtualBusinessCard.astro`, os arquivos de `public/assets/cards/`, `src/styles/global.css` ou o bloco de contato e seu layout em `src/pages/index.astro`. Mudanças nesses elementos exigem autorização específica.

Posicionamento: “Transformamos espaços, marcas e negócios em experiências visuais.” O mercado imobiliário continua como especialização. Imagens aéreas e Visualização com IA permanecem “Em breve” e indisponíveis para contratação pelo formulário. O portfólio permanece sem trabalhos fictícios.

As referências antigas em `.claude/skills/primeview-site/` ainda descrevem o foco imobiliário anterior. Para conteúdo comercial, prevalece o posicionamento multissetorial aprovado; as regras de identidade, segurança e dados oficiais continuam válidas.

## Formulário, Turnstile e Resend

O navegador valida todos os campos e apresenta os erros em um único diálogo acessível. O envio usa `POST /api/contact`: a Function valida novamente os dados e o Turnstile, autentica a chamada ao Apps Script por HMAC, confirma o registro no Google Forms e tenta a notificação pelo Resend. Nenhum segredo é enviado ao navegador.

A integração só fica ativa após configuração privada e implantação pelo proprietário. Siga [o guia de Google Forms](docs/google-forms.md), incluindo descoberta automática das perguntas, controle de duplicidade e recuperação de notificações. O Google Form público e sua planilha vinculada, sozinhos, não conectam o site.

Testes locais: `node --test tests/contact.test.mjs`. Eles usam serviços simulados, sem envio real.

Configure as variáveis no ambiente privado conforme o guia de integração:

- `PUBLIC_TURNSTILE_SITE_KEY`: site key pública do Turnstile.
- `TURNSTILE_SECRET_KEY`: secret do Turnstile, somente na Function.
- `RESEND_API_KEY`: chave do Resend, somente na Function.
- `CONTACT_TO_EMAIL`: opcional; por padrão, `primeviewfilmes@gmail.com`.
- `CONTACT_FROM_EMAIL`: remetente verificado do Resend para produção.
- `TURNSTILE_EXPECTED_HOSTNAME`: hostname exato do ambiente, sem protocolo.
- `GOOGLE_APPS_SCRIPT_URL`: URL `/exec` do aplicativo da Web.
- `GOOGLE_FORMS_SHARED_SECRET`: secret compartilhado exclusivamente entre Function e Apps Script.

A origem usada no e-mail é temporária (`onboarding@resend.dev`). Depois de verificar um domínio próprio no Resend, configure `CONTACT_FROM_EMAIL` com um remetente desse domínio.

Sem as variáveis configuradas, o formulário mantém a estrutura, mas a Function responde com indisponibilidade de canal. O WhatsApp continua sendo o CTA principal.

## SEO e acessibilidade

A Home possui title, description, canonical, Open Graph, Twitter Card, Schema Organization, favicon, `robots.txt`, sitemap, `lang="pt-BR"`, foco visível, labels de formulário, HTML semântico e suporte a movimento reduzido. A URL canônica deve ser revisada quando o domínio definitivo for definido.

## Cloudflare Pages

1. Crie ou conecte o projeto no Workers & Pages.
2. Conecte o repositório GitHub e a branch `master`.
3. Use `npm run build` como comando de build.
4. Use `dist` como diretório de saída.
5. Cadastre `PUBLIC_TURNSTILE_SITE_KEY` como variável pública de build.
6. Cadastre `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY` e, se necessário, `CONTACT_TO_EMAIL` como secrets/variáveis da Function.
7. Teste o formulário em Preview antes da produção.

O código foi enviado a `https://github.com/SandroAzevedoAlmeida/primeview_films`, na branch `master`. A configuração do domínio `primeviewfilmes.com.br` e da publicação na Cloudflare deve ser verificada antes do deploy; a presença do domínio nos arquivos não confirma sua ativação.

## Git e manutenção

```bash
git status
git add .
git commit -m "atualiza site PrimeView Filmes"
git push origin master
```

Antes de publicar, execute `npm run build`, confira links, imagens, dados de contato e versões mobile. Não versione `.env`, `.dev.vars`, tokens ou chaves.

## Próximas evoluções

A arquitetura está preparada para portfólio real, páginas de serviços e blog com Astro Content Collections. Essas áreas devem ser adicionadas quando houver conteúdo aprovado, sem inventar informação comercial.

O aviso em `/privacidade` deve ser revisado pelo proprietário antes da publicação, incluindo retenção, identificação e procedimentos operacionais.
