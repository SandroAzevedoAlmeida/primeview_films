# PrimeView Filmes — GitHub e Cloudflare

## Fluxo

Claude Code
→ arquivos locais
→ Git
→ GitHub
→ Cloudflare Pages
→ site publicado

## Local

```bash
npm install
npm run dev
npm run build
```

Executar `check`/`lint` se configurados.

## Git

```bash
git status
git add .
git commit -m "descrição clara"
git push
```

## Segurança

Nunca versionar:
- `.env` com secrets;
- `.dev.vars` com valores reais;
- API keys;
- tokens;
- credenciais.

## Cloudflare Pages

Documentar no README do projeto, conforme a interface atual:
1. acessar Cloudflare;
2. abrir Workers & Pages;
3. criar/conectar projeto;
4. conectar GitHub;
5. selecionar repositório;
6. selecionar branch principal;
7. configurar Astro;
8. build;
9. output;
10. publicar.

Para Astro, normalmente:
- build: `npm run build`
- output: `dist`

Confirmar no projeto real.

## Deploy automático

Após integração:
`git push`
→ novo build
→ novo deploy.

## Functions

O formulário usa `/api/contact`.

Manter o restante do site static-first.

## Variáveis de ambiente

- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- opcional `CONTACT_TO_EMAIL`

## Turnstile

Site key no frontend; secret apenas no ambiente.

## Domínio

Pode começar no domínio da Cloudflare.

Preparar futuro domínio próprio, por exemplo:
`primeviewfilmes.com.br`

Não presumir que já foi comprado.

## Antes do deploy

- executar build;
- confirmar `dist/`;
- testar rotas;
- testar assets;
- testar links;
- testar formulário quando configurado.
