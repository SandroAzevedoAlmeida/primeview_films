# Revisão do layout no celular — 12/10/2026

A regra final de `.contact-layout` reaplicava duas colunas depois da regra
responsiva. Em celulares, a coluna de 300px dos cartões e o espaço entre colunas
reduziam o formulário a 50px, com campos e cartões sobrepostos.

A correção até 767px coloca formulário e cartões em uma coluna, remove os
deslocamentos e rotações dos cartões e permite quebra de textos longos.
Até 400px, o Turnstile usa o tamanho compacto antes de carregar sua API.
Os tamanhos seguem a [documentação do Turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/).

## Verificação

- Navegador em 320, 360, 390, 400, 401, 430, 600 e 767px: campos contidos,
  cartões separados do formulário e entre si, rodapé abaixo dos cartões,
  textos sem transbordamento. Repetido com confirmação longa e textarea ampliada.
- Geometria anterior e posterior idêntica em 768, 800, 1024 e 1440px.
- Capturas da seção de contato em 768 e 1440px idênticas byte a byte,
  com movimento reduzido para uma comparação estável.
- 29 testes de contato, testes de validação no navegador, build e Astro check passaram.
- Nenhum contato real, e-mail ou aviso foi enviado durante os testes.

`tests/mobile-layout.cjs` usa Chrome isolado na porta 9437 e Astro na 4321.
Inicie o Astro com a chave pública de teste `1x00000000000000000000AA` na
variável `PUBLIC_TURNSTILE_SITE_KEY`. O teste intercepta a API do Turnstile
e simula apenas suas dimensões; não testa a verificação humana real.
Use `PV_TEST_OUTPUT` para gravar capturas opcionais.
