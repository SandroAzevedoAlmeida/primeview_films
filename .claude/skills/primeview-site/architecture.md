# PrimeView Filmes — Arquitetura

## Princípio

STATIC-FIRST, organizado para Astro e Cloudflare Pages.

Dinamicidade apenas onde houver necessidade real, como formulário comercial.

## Stack

- Astro
- TypeScript
- HTML semântico
- CSS moderno
- JavaScript mínimo
- Git / GitHub
- Cloudflare Pages
- Pages Functions
- Turnstile
- Resend

## Estrutura sugerida

```text
src/
├── components/
├── config/
├── data/
├── layouts/
├── pages/
├── sections/
├── styles/
├── types/
└── utils/

public/
└── assets/
    ├── brand/
    ├── images/
    └── portfolio/

functions/
└── api/
    └── contact.ts
```

## Componentes e seções

Componentes pequenos:
- Button.astro
- SocialLinks.astro
- ServiceCard.astro
- PortfolioCard.astro
- WhatsAppButton.astro

Seções:
- Hero.astro
- About.astro
- Services.astro
- WhyPrimeView.astro
- Audience.astro
- Portfolio.astro
- Process.astro
- Tour360.astro
- Testimonials.astro
- CTA.astro
- Contact.astro

## Rotas futuras

Criar quando houver necessidade real:
- `/servicos`
- `/portfolio`
- `/videos-imobiliarios`
- `/drone`
- `/fotografia-imobiliaria`
- `/tour-360`
- `/para-corretores`
- `/para-imobiliarias`
- `/para-construtoras`
- `/sobre`
- `/contato`
- `/blog`
- `/politica-de-privacidade`

## Company config

Criar `src/config/company.ts`:

```ts
export const company = {
  name: "PrimeView Filmes",
  slogan: "Imagens que impressionam. Histórias que vendem.",
  positioning: "Transformamos imóveis em experiências visuais.",
  phone: "(27) 98123-0085",
  whatsapp: "5527981230085",
  whatsappDisplay: "+55 27 98123-0085",
  email: "primeviewfilmes@gmail.com",
  instagramHandle: "@primeview_filmes",
  city: "Serra",
  state: "Espírito Santo",
  country: "Brasil",
  serviceRegion: "Serra e região — Espírito Santo",
};
```

## Portfólio

Criar `src/data/portfolio.ts`.

```ts
export type PortfolioCategory = "video" | "drone" | "fotografia" | "tour360";

export interface PortfolioItem {
  title: string;
  slug: string;
  category: PortfolioCategory;
  description?: string;
  thumbnail: string;
  videoUrl?: string;
  tourUrl?: string;
  location?: string;
  featured?: boolean;
}
```

Não inventar projetos reais.

## WhatsApp

Criar helper `src/utils/whatsapp.ts` se útil.

Mensagem padrão:
> Olá! Vim pelo site da PrimeView Filmes e gostaria de solicitar um orçamento.

## Formulário

Frontend Astro
→ `/api/contact`
→ Pages Function
→ validação
→ Turnstile
→ Resend
→ `primeviewfilmes@gmail.com`

Secrets apenas no ambiente:
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`

## Assets

Brand:
- logo-primeview.png
- logo-primeview-white.png
- favicon.png
- og-image.jpg

Hero:
- hero-primeview.webp

## Vídeos

Preferir thumbnail → clique → player.

## JavaScript

Somente quando necessário:
- menu mobile;
- Header no scroll;
- modal de vídeo;
- filtro simples;
- estado do formulário.

Não instalar state manager.

## Build

Esperado:
```bash
npm install
npm run dev
npm run build
```

O Astro normalmente gera `dist/`; confirmar no projeto real.
