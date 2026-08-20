# PrimeView Filmes — Redes Oficiais

Use exatamente estas URLs.

## Instagram
`https://www.instagram.com/primeview_filmes/`
Handle: `@primeview_filmes`

## YouTube
`https://www.youtube.com/@primeview_filmesbr`
Handle: `@primeview_filmesbr`

## Facebook
`https://www.facebook.com/profile.php?id=61593439981615`

## TikTok
`https://www.tiktok.com/@primeview.filmes`
Handle: `@primeview.filmes`

## WhatsApp
`https://wa.me/5527981230085`
Número: `+55 27 98123-0085`

## Threads
`https://www.threads.net/@primeview_filmes`
Handle: `@primeview_filmes`

## Configuração central

Criar `src/config/social.ts`:

```ts
export const social = {
  instagram: "https://www.instagram.com/primeview_filmes/",
  youtube: "https://www.youtube.com/@primeview_filmesbr",
  facebook: "https://www.facebook.com/profile.php?id=61593439981615",
  tiktok: "https://www.tiktok.com/@primeview.filmes",
  whatsapp: "https://wa.me/5527981230085",
  threads: "https://www.threads.net/@primeview_filmes",
};
```

Nenhum componente deve hardcodar essas URLs.

## Regras

- não alterar handles;
- não padronizar nomes;
- não inventar URLs;
- não usar `href="#"`;
- usar aria-label;
- links externos em nova aba quando apropriado com `rel="noopener noreferrer"`.

## Ícones

Preparar:
1. Instagram
2. YouTube
3. Facebook
4. TikTok
5. WhatsApp
6. Threads

Preferir SVG ou solução leve.

Normal: branco/cinza claro.
Hover: dourado.

## Componente

Criar `SocialLinks.astro`.

Se uma URL estiver vazia no futuro, ocultar a rede sem quebrar layout.
