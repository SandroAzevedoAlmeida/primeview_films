# Diagnóstico automatizado do retorno Google

Verificação realizada em 11/10/2026 (America/Sao_Paulo).

## Evidências

- Usuário confirmou resposta “Teste!” no Google Forms; na planilha Controle, `google_state=submitted`, `response_id` preenchido e `email_state=pending`.
- Log da versão anterior mostrou `contact_google_failure` com `unexpected`.
- Consulta pública sem assinatura, feita localmente: POST redireciona com 302 para `script.googleusercontent.com`; GET retorna JSON de rejeição de autenticação, como esperado. Nenhum contato foi submetido.
- Consulta HMAC `health` executada na própria Cloudflare, usando os segredos já cadastrados, retornou `healthy`.
- Comparação no mesmo ambiente: leitura do retorno usando `redirect: 'manual'` retornou `healthy`; usando o modo anterior `redirect: 'error'`, falhou com `TypeError`.

## Correção

O commit `4ab8090` passou a ler o retorno Google com `redirect: 'manual'`, verificando explicitamente o status. O POST assinado só é enviado ao Apps Script; a leitura continua restrita a HTTPS em `script.googleusercontent.com`. Redirecionamentos adicionais são rejeitados, nunca seguidos livremente. A comparação confirma a falha do modo anterior nesse runtime, sem presumir o texto interno da exceção.

## Proteção do diagnóstico

Foi usado um endpoint temporário protegido por token aleatório de 256 bits, com validade de 30 minutos. Somente o hash foi incluído no código; o token ficou em arquivo local ignorado pelo Git e foi removido ao terminar. A consulta executou somente `health`: não leu respostas de clientes, não submeteu contatos e não enviou notificações. O endpoint foi removido após a comparação. Nenhuma credencial do usuário foi copiada para o computador ou solicitada no chat.

## Limites e próximo passo

O diagnóstico confirmou autenticação, schema e acesso ao controle com o fluxo corrigido. Não confirma sozinho um envio completo pelo navegador, recebimento no ntfy ou recuperação de avisos antigos. Não reenviar automaticamente contatos nem notificações pendentes. Para o teste final, preservar os mesmos campos e identificador na aba original; se isso não estiver disponível, planejar um novo teste identificado com o proprietário. Pendências antigas exigem revisão do estado antes de recuperação.
