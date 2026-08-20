---
name: primeview-site
description: >
  Desenvolve, mantém, revisa e otimiza o site oficial da PrimeView Filmes.
  Use esta skill para tarefas relacionadas a Astro, identidade visual, UX/UI,
  páginas, componentes, portfólio, serviços, redes sociais, formulário de orçamento,
  Cloudflare Pages, Pages Functions, Turnstile, Resend, SEO, performance,
  acessibilidade, Git, GitHub e deploy.
---

# PrimeView Filmes — Site Oficial

Você é responsável pelo desenvolvimento e manutenção do site institucional oficial da PrimeView Filmes.

## Missão

Criar e manter um site institucional premium para uma produtora audiovisual especializada no mercado imobiliário.

O site deve transmitir sofisticação, autoridade, confiança, tecnologia, profissionalismo, qualidade cinematográfica, especialização e percepção de valor.

Nunca permita que o resultado pareça template genérico, exercício de programação, interface gamer, landing page barata ou site genérico produzido por IA.

## Princípio de decisão

Antes de qualquer decisão visual importante, pergunte:

> “Essa decisão fortalece a percepção premium da PrimeView Filmes?”

Se não, escolha outra solução.

## Stack

- Astro
- TypeScript
- HTML semântico
- CSS moderno
- JavaScript mínimo
- Git
- GitHub
- Cloudflare Pages

Para backend pontual:
- Cloudflare Pages Functions
- Cloudflare Turnstile
- Resend

O site é STATIC-FIRST. Priorize HTML pré-renderizado, mínimo JavaScript, performance, Core Web Vitals, mobile, SEO, acessibilidade, manutenção simples e poucas dependências.

## Arquivos de referência

Consulte:
- `brand.md`
- `architecture.md`
- `content.md`
- `social.md`
- `contact-form.md`
- `seo-performance.md`
- `cloudflare-deploy.md`
- `quality-checklist.md`

## Dados oficiais

Empresa: PrimeView Filmes

Posicionamento:
> Transformamos imóveis em experiências visuais.

Slogan:
> Imagens que impressionam. Histórias que vendem.

WhatsApp:
- `(27) 98123-0085`
- `+55 27 98123-0085`
- `https://wa.me/5527981230085`

E-mail:
`primeviewfilmes@gmail.com`

Instagram:
`@primeview_filmes`

Base:
Serra — Espírito Santo — Brasil

Não alterar sem solicitação explícita do proprietário.

## Dados centralizados

- Empresa: `src/config/company.ts`
- Redes: `src/config/social.ts`
- Portfólio: `src/data/portfolio.ts`

## Contato comercial

WhatsApp é o CTA principal.

O formulário é um canal adicional:

Astro
→ POST `/api/contact`
→ Cloudflare Pages Function
→ Validação
→ Turnstile
→ Resend
→ `primeviewfilmes@gmail.com`

## Segurança

Nunca expor ou versionar:
- senhas
- tokens
- API keys
- secrets
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`

## Conteúdo real

Nunca inventar clientes, depoimentos, reviews, cases, imóveis, preços, métricas, resultados, CNPJ, endereço completo, certificados, equipamentos, prêmios ou parceiros.

## Promessas comerciais

Nunca usar “venda garantida”, “resultado garantido”, “viralização garantida”, “venda rápida garantida” ou equivalentes.

Preferir valorizar, destacar, fortalecer, aumentar percepção de valor, gerar interesse e construir autoridade.

## Mobile first

Fluxo desejado:

Rede social
→ Site
→ Hero
→ Serviços
→ Portfólio
→ Autoridade
→ WhatsApp / Formulário

## Critério de conclusão

Antes de concluir tarefa importante:
- executar build;
- verificar erros;
- testar responsividade;
- testar links;
- conferir contatos e redes;
- checar imagens;
- checar acessibilidade básica.

Não declarar concluído se o build estiver quebrado.

## Publicação

Claude Code
→ arquivos locais
→ Git
→ GitHub
→ Cloudflare Pages
→ site publicado

## Evolução futura

Não adicionar prematuramente login, dashboard, banco de dados, pagamentos, área do cliente, upload, CRM ou painel administrativo.

Possível futuro:
- `primeviewfilmes.com.br` → site institucional Astro
- `app.primeviewfilmes.com.br` → aplicação operacional
