# PrimeView Filmes — Formulário Comercial

## Objetivo

Formulário real de orçamento como canal adicional ao WhatsApp.

Destino:
`primeviewfilmes@gmail.com`

WhatsApp continua como CTA primário.

## Campos

- Nome
- E-mail
- WhatsApp
- Perfil do cliente
- Serviço de interesse
- Mensagem

### Perfis
- Corretor
- Imobiliária
- Construtora
- Incorporadora
- Proprietário
- Outro

### Serviços
- Vídeo imobiliário
- Drone 4K
- Fotografia imobiliária
- Tour Virtual 360°
- Conteúdo para corretor
- Pacote completo
- Outro

## Arquitetura

Astro frontend
→ POST `/api/contact`
→ Cloudflare Pages Function
→ validação
→ Turnstile
→ Resend
→ `primeviewfilmes@gmail.com`

## Endpoint

Sugestão:
`functions/api/contact.ts`

Confirmar o formato atual suportado pelo ambiente Cloudflare no momento da implementação.

## Turnstile

Validar server-side.

Secret:
`TURNSTILE_SECRET_KEY`

A site key pública pode ficar no frontend conforme documentação.

## Resend

Secret:
`RESEND_API_KEY`

Destino:
`primeviewfilmes@gmail.com`

Opcional:
`CONTACT_TO_EMAIL`

Nunca chamar Resend direto do navegador.

## Segurança

Aplicar:
- validação de tipos;
- limites de tamanho;
- validação de e-mail;
- sanitização;
- honeypot se apropriado;
- prevenção de envio duplicado;
- rate limiting quando disponível/necessário.

Não expor stack traces.

## UX

Inicial:
> ENVIAR SOLICITAÇÃO

Durante:
> ENVIANDO...

Sucesso:
> Mensagem enviada com sucesso. A PrimeView Filmes recebeu sua solicitação e entrará em contato.

Erro:
> Não foi possível enviar sua mensagem agora. Tente novamente ou fale conosco pelo WhatsApp.

Em erro, manter campos preenchidos.

## E-mail recebido

```text
NOVO CONTATO — SITE PRIMEVIEW FILMES

Nome: ...
E-mail: ...
WhatsApp: ...
Perfil: ...
Serviço: ...

Mensagem:
...
```

Assunto:
`Novo contato pelo site — PrimeView Filmes`

## Remetente

Enquanto não houver domínio próprio verificado, seguir as regras atuais do serviço de e-mail.

Com domínio próprio, avaliar:
- `contato@primeviewfilmes.com.br`
- `site@primeviewfilmes.com.br`

## Fallback

WhatsApp:
`https://wa.me/5527981230085`
