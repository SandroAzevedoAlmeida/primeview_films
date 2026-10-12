# Ponto de retomada — integração Google Forms

Atualizado a pedido do proprietário em 10/10/2026 (America/Sao_Paulo). Pedido atual: “Salve aqui.” Retomar da conferência da planilha de controle, sem repetir envios.

## Concluído na conta Google, conforme confirmação do proprietário

- Código e manifesto adicionados ao Apps Script vinculado ao formulário.
- Função `configurarIntegracao` executada e autorizada.
- Propriedades `GOOGLE_FORM_ID`, `FORM_ITEM_MAP` e `INTEGRATION_LEDGER_SHEET_ID` confirmadas.
- Chave privada salva na propriedade `GOOGLE_FORMS_SHARED_SECRET`. O valor não foi compartilhado no chat e não consta neste arquivo.
- Implantação criada e URL `/exec` fornecida pelo proprietário:

  https://script.google.com/macros/s/AKfycbz6BUSGMLichzezMfhCfN1jRhkyL_4JlCr9JMuZl284TOFbsGNLwAAZKKovWrfkZsxy/exec

Formulário público: https://forms.gle/rokyeGjsfmNVVkmg9

## Ponto exato para continuar

### Último avanço — formulário confirmado, aviso ntfy pendente

Após a correção do retorno Google, o proprietário realizou o teste final e confirmou sucesso no site e registro no Forms/planilha, mas nenhum aviso no celular. A linha desse teste mostrou `email_state=sending`.

Inspeção encontrou `redirect: 'error'` também no POST do ntfy, o mesmo modo que gerou TypeError na comparação real da Cloudflare. Foi substituído por `manual`; respostas não OK, inclusive 3xx, não são seguidas e deixam a notificação pendente. Testes simulados verificam envio, falhas e redirecionamentos sem vazamento do tópico para outro host. Não foi enviada notificação real automaticamente e não foi recuperada pendência antiga. A confirmação de entrega ntfy ainda precisa do teste real após implantação.

### Atualização de 11/10/2026 — diagnóstico automatizado concluído

O usuário autorizou diagnosticar da forma mais automatizada possível, sem envolver dados sensíveis. Confirmou `google_state=submitted`, `email_state=pending` e `response_id` preenchido. Log real da implantação `68eb9b6` retornou `contact_google_failure: unexpected`.

Commit `4ab8090` alterou a leitura GET do retorno Apps Script de `redirect: 'error'` para `redirect: 'manual'`, rejeitando redirecionamentos adicionais e distinguindo falhas de transporte. 21 testes passaram. Um endpoint temporário autenticado com token descartável (sem ler credenciais do usuário) permitiu executar apenas `health` na própria Cloudflare. Resultado comparativo: modo atual `healthy`, modo antigo `type_error`. Causa reproduzida no runtime Cloudflare, correção validada para a consulta de saúde.

O endpoint temporário foi removido do código depois do diagnóstico. Ver `docs/diagnostico-retorno-google.md`. Não foi enviado nenhum contato nem aviso ntfy por esse procedimento. Próximo passo é confirmar o fluxo real do formulário com o proprietário, preservando o identificador anterior se disponível; não recuperar notificações antigas automaticamente. As instruções abaixo descrevem o histórico e não devem fazer o usuário voltar à coleta de prints ou às chaves já validadas.

**Estado atual (substitui o diagnóstico antigo abaixo):** o proprietário confirmou que o último teste foi gravado no Google Forms, com mensagem “Teste!” e horário `10/10/26, 00:07`, mas o site respondeu:

```json
{"success":false,"code":"verification_pending","message":"Não foi possível confirmar o recebimento. Seus dados foram mantidos."}
```

O envio passou pela validação inicial e pelo Turnstile. A confirmação do registro Google falhou; causa exata ainda não identificada. Não assumir falha no ntfy nem repetir submissões às cegas. Ainda não há confirmação de aviso no celular.

**Próxima ação:** conferir a última linha preenchida da aba `Controle` na planilha **“PrimeView — Controle privado da integração”**. O proprietário já encontrou essa planilha no Drive (segunda linha selecionada em azul na captura 288) e foi orientado a abri-la com dois cliques.

Solicitar somente:
- `google_state`: valor da última linha preenchida;
- `email_state`: valor da mesma linha;
- `response_id`: apenas informar se preenchido ou vazio.

O proprietário enviou somente os cabeçalhos da tabela; nenhum estado de linha foi recebido. Isso NÃO prova que a planilha esteja vazia. Ele perguntou se pode enviar um print e foi orientado a mostrar títulos e última linha, ocultando identificadores e e-mails. Paramos aguardando essa captura/esses valores. Se realmente não houver linhas, confirmar explicitamente esse fato.

Não editar células do controle manualmente nem marcar sucesso sem verificar a resposta correspondente. Se houver estado `processing`/`uncertain`, consultar o procedimento de reconciliação em `docs/google-forms.md`; não criar nova resposta. Se `submitted` e ID preenchido, investigar transporte/retorno/timeout com os logs.

## Avanços em 09–10/10/2026

- Proprietário copiou o segredo do Apps Script para a variável secreta `GOOGLE_FORMS_SHARED_SECRET` na Cloudflare.
- Ele repetiu todos os deploys, fazendo uma versão antiga (`26dda67`, ainda dependente do Resend) voltar a Produção. Foi orientado a repetir somente `dd0df47`.
- Capturas 284/285 confirmaram `dd0df47` ativo. Diagnóstico remoto sem captcha passou a retornar `400 / turnstile`, eliminando o erro de configuração inicial naquele momento.
- Resposta real obtida pelo usuário em DevTools → Network → contact → Response: `verification_pending`, transcrita acima.
- Código completo do Apps Script foi enviado pelo proprietário; a chave é lida de Propriedades do script, não consta no código enviado.
- Teste não autenticado do endpoint Apps Script com `{}` retornou 302 para `script.googleusercontent.com`; não gravou dados. Isso verifica alcance/redirecionamento, não autenticação HMAC nem confirmação de submissão.
- Adicionado diagnóstico seguro `contact_google_failure` com códigos permitidos (`authentication`, `configuration`, `redirect`, `google_unavailable`, `response_size`, `response_format`, `google_rejected`, `busy`, `replay`, `closed`, `validation`, `request_conflict`, `verification_pending`, `timeout`, `unexpected`). Não registra valores, dados do cliente ou exceções brutas.
- Commit **`68eb9b6`** enviado para `origin/master`. Esta é a versão mais recente esperada, substituindo `dd0df47`. Conclusão da implantação deste novo commit ainda não confirmada pelo usuário.
- Última validação: **20 testes passaram**, build concluído, Astro check sem erros/avisos. Nenhum log real `contact_google_failure` recebido até agora.
- O Forms mostrou 3 respostas no resumo. Proprietário confirmou individualmente que a mais recente corresponde ao teste que falhou no site; não presumir que as três sejam desse mesmo envio.

## Histórico anterior — erro de configuração já superado

**Causa confirmada nos logs de execução da Cloudflare:**

```text
contact_configuration
issues: ["GOOGLE_FORMS_SHARED_SECRET:missing_or_invalid"]
```

Na etapa anterior, o endpoint `https://primeview-films.pages.dev/api/contact` retornava HTTP 503 / `unavailable`. O segredo compartilhado estava ausente ou fora do formato aceito na implantação. Esse erro não apareceu no teste posterior com a versão correta; ver avanços acima.

**Procedimento anterior, já realizado segundo o proprietário (não repetir como próximo passo):**

1. Abrir Apps Script → Configurações do projeto → Propriedades do script.
2. Copiar diretamente o valor de `GOOGLE_FORMS_SHARED_SECRET`.
3. Na Cloudflare → projeto `primeview-films` → Configurações → Variáveis e segredos → Produção, conferir o nome exato `GOOGLE_FORMS_SHARED_SECRET`, tipo Segredo, e substituir o valor pelo mesmo do Apps Script, sem espaços/quebras de linha.
4. Salvar e repetir a implantação; aguardar sucesso.
5. Repetir o diagnóstico sem captcha. Com a configuração aceita, a chamada sem token deve retornar `400 / turnstile`, em vez de `503 / unavailable`. Isso não comprova autenticação Google nem entrega ntfy.
6. Só então orientar o proprietário a enviar um teste pelo formulário no navegador, conferir a resposta no Forms/planilha e o aviso no celular.

O formato aceito do segredo é `[A-Za-z0-9_-]{43,128}`; o comando de geração orientado anteriormente produz 64 caracteres hexadecimais. Se o valor no Apps Script não atender ao formato, pedir apenas confirmação disso, nunca o valor. Não gerar outra chave unilateralmente: os dois serviços precisam da mesma chave. Não usar nenhuma das chaves Turnstile como segredo Google.

## Concluído nesta sessão

- Cloudflare Pages criado e conectado a `SandroAzevedoAlmeida/primeview_films`, branch `master`.
- Site publicado em `https://primeview-films.pages.dev`. Domínio personalizado ainda não confirmado/configurado nesta sessão.
- Build Astro, comando `npm run build`, saída `dist`, variável `NODE_VERSION=22.18.0`.
- Widget Turnstile criado. Proprietário cadastrou `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` e `TURNSTILE_EXPECTED_HOSTNAME=primeview-films.pages.dev`.
- Nome de `GOOGLE_APPS_SCRIPT_URL` estava sem o L final; proprietário corrigiu e recolou a URL. O último diagnóstico não aponta mais problema nessa variável.
- Proprietário usa ntfy no servidor padrão `ntfy.sh`, criou tópico próprio no celular e cadastrou `NTFY_TOPIC` como segredo na Cloudflare. Não registramos seu valor.
- Integração ntfy implementada; Resend agora é opcional. Aviso genérico sem dados do cliente. Falha de aviso não impede sucesso de registro confirmado no Forms.
- Apps Script existente foi preservado: protocolo/colunas `email_*` reutilizados para notificações. ntfy pode duplicar aviso após resposta perdida e recuperação, mas não uma resposta confirmada do Forms.
- Commit/push autorizados durante a sessão: `26dda67` (integração e conteúdo), `84c6f71` (ntfy), `dd0df47` (diagnóstico seguro). Todos enviados para `origin/master`.
- Última validação local: 19 testes passaram, build concluído, Astro check sem erros/avisos.
- Log de build enviado pelo proprietário confirmou implantação de `dd0df47`, incluindo Functions. Houve aviso de engine: `undici@8.10.0` exige Node >=22.19.0; build concluiu. Ajustar versão de build oportunamente; isso não é a causa apontada pelo diagnóstico atual.

## Diagnóstico e limites

- Mensagem do navegador: “Não foi possível enviar sua mensagem agora. Tente novamente ou fale conosco pelo WhatsApp.”
- Logs de execução: Implantações → Ver detalhes → Functions → Iniciar fluxo de log. Não confundir com log de build.
- Conexão WebSocket inicialmente falhou, mas depois conectou. Proprietário enviou o evento com a única issue acima.
- Diagnósticos do assistente enviaram campos sintéticos válidos, UUID novo e nenhum captcha: não gravaram contatos nem dispararam notificações, pois o código retorna antes desses passos.
- Não solicitar novos reenvios reais repetidos enquanto o erro de configuração persistir.
- Não há acesso autenticado do assistente à Cloudflare ou às propriedades Google; alterações privadas são feitas pelo proprietário no painel.
- Usuário prefere orientação curta, passo a passo, acompanhada por capturas. Para ler as capturas muito largas, usar `view_image` com `detail: original`; campos podem estar apenas cortados/rolados, sem realmente faltar letras.

## Referência para continuidade

Consultar `docs/google-forms.md` para variáveis, instalação, ntfy e recuperação. Integração ponta a ponta ainda não confirmada. Não registrar segredos no código, Git ou conversa. O pedido atual é salvar o ponto de parada localmente, sem novas mudanças operacionais. Autorizações anteriores e mudanças concluídas estão descritas acima.
