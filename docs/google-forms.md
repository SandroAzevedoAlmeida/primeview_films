# Contato: Google Forms, validação e notificações

## Estado e limites

### Notificações pelo ntfy (configuração atual)

Cadastre `NTFY_TOPIC` como segredo de Produção na Cloudflare, com o nome exato do tópico inscrito no celular em `ntfy.sh` (1 a 64 letras ASCII, números, hífens ou sublinhados). Faça uma nova implantação após salvar. Não é necessário cadastrar `RESEND_API_KEY`. O ntfy tem prioridade quando `NTFY_TOPIC` está definido; o Resend permanece como alternativa somente quando não há tópico configurado.

O aviso contém apenas “Nova solicitação de orçamento recebida. Consulte a planilha.” Nenhum dado do cliente ou link privado é publicado. Um tópico aleatório não equivale a controle de acesso: quem conhece o nome pode ler/publicar nele. O tópico fica no servidor, nunca no navegador.

O registro no Forms independe de ambos os provedores de notificação. Falha ou ausência de configuração deixa o aviso pendente, mas o contato confirmado continua sendo sucesso. O protocolo e as colunas `email_*` do Apps Script existente são reutilizados como controle de notificação; não é necessário atualizar a implantação Google. O estado `sent` indica aceite pelo provedor, não leitura ou entrega comprovada ao celular.

O script `node scripts/retry-contact-email.mjs` também recupera avisos ntfy quando `NTFY_TOPIC` está no ambiente privado. Ele envia avisos reais. Mantém a reserva de 90 segundos e o limite de recuperação de 23 horas. Diferentemente do Resend, não há garantia de idempotência no ntfy: uma resposta perdida ou falha ao confirmar no controle pode duplicar o aviso em uma tentativa posterior, mas não a resposta no Forms. Não alternar provedores para pendências antigas sem revisão operacional.

As referências abaixo a Resend e sua janela de idempotência aplicam-se apenas à alternativa por e-mail. Documentação ntfy: https://docs.ntfy.sh/publish/

O código local está preparado para Astro → Cloudflare Pages Function → Apps Script → Google Forms → Resend. O link público do Forms não é um endpoint de integração. Nenhuma integração real fica ativa até configurar e implantar os serviços na conta do proprietário. `astro dev` não executa Pages Functions: use um Preview da Cloudflare ou o ambiente local do Wrangler já instalado/configurado. Não instalar ferramentas ou publicar automaticamente.

O formulário público foi conferido com seis perguntas. Os IDs de edição e itens são descobertos por `configurarIntegracao()` no projeto vinculado ao Forms; não são extraídos de URLs `formResponse`, `entry.*` ou presumidos a partir do ID público. As opções devem coincidir com `src/lib/contact-validation.ts`.

O aviso em `/privacidade` descreve o fluxo proposto. Antes de publicar, o proprietário deve confirmar sua identificação, base legal, prazo de retenção e procedimento de atendimento/exclusão (Forms, planilha de respostas, e-mail e controle técnico). O texto não constitui uma certificação de conformidade com a LGPD. Não há exclusão automática de registros; decidir e documentar a retenção antes da ativação.

## Instalação guiada no Google

1. Abra **o editor** do formulário correto. No menu de três pontos, abra **Editor de scripts / Apps Script**. Use um projeto vinculado a esse Forms, não um projeto vazio avulso.
   Em Configurações, mantenha **Limitar a uma resposta** e **Ver resumo dos resultados** desativados. O Google documenta que o limite por participante impede o envio via script. Use a pergunta E-mail já existente, sem coleta automática de e-mail verificado por login.
2. Copie o conteúdo de `integrations/google-apps-script/Code.gs` para `Code.gs` no editor. Não substitua um projeto que já contenha outras automações sem antes revisá-las.
3. Nas configurações do projeto, habilite a exibição de `appsscript.json`. Copie o manifesto fornecido em `integrations/google-apps-script/appsscript.json`.
4. Salve e execute **configurarIntegracao**. Autorize somente no Google, com sua conta proprietária. A função confere perguntas/tipos/opções/obrigatoriedade e cria uma planilha privada de controle técnico. Não envia respostas, não modifica as perguntas e não altera o vínculo da planilha de respostas já existente.
5. Nas **Propriedades do script**, confirme que apareceram `GOOGLE_FORM_ID`, `FORM_ITEM_MAP` e `INTEGRATION_LEDGER_SHEET_ID`. Nenhum desses valores precisa ir ao navegador do site.
6. Gere um segredo aleatório no seu computador. No PowerShell, o comando abaixo o copia diretamente para a área de transferência, sem imprimir no terminal:

   ```powershell
   node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" | Set-Clipboard
   ```

7. Adicione **GOOGLE_FORMS_SHARED_SECRET** nas Propriedades do script e cole o segredo. Guarde a mesma chave no gerenciador privado de segredos para cadastrá-la na Cloudflare. Não envie a chave no chat, não a coloque no código e não salve em arquivos versionados.
8. Escolha **Implantar → Nova implantação → Aplicativo da Web**. Execute como **você (proprietário)**. O endpoint precisa aceitar chamadas externas sem sessão interativa Google; a autenticação de cada operação é feita pela assinatura HMAC do código antes de qualquer acesso aos dados.
9. Se sua organização impedir esse modo de acesso, pare: não enfraqueça a autenticação. Será necessário outro serviço intermediário autenticado ou usar o formulário hospedado pelo Google.
10. Copie a URL `/exec`. A URL `/dev` não serve para a integração do site. Mudanças futuras no script exigem atualizar a versão da implantação. Nunca envie tokens OAuth de edição.

## Configuração privada na Cloudflare

| Nome | Local | Finalidade |
|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | Variável de build | Chave pública do widget; requer rebuild do site |
| `TURNSTILE_SECRET_KEY` | Secret da Function | Verificação do captcha |
| `TURNSTILE_EXPECTED_HOSTNAME` | Ambiente da Function | Host exato permitido, sem `https://` e sem caminho; separado por ambiente |
| `GOOGLE_APPS_SCRIPT_URL` | Ambiente da Function | URL HTTPS `/exec` publicada |
| `GOOGLE_FORMS_SHARED_SECRET` | Secret da Function | Mesma chave privada cadastrada no Apps Script |
| `RESEND_API_KEY` | Secret da Function | Envio de notificações |
| `CONTACT_TO_EMAIL` | Ambiente, opcional | Padrão: `primeviewfilmes@gmail.com` |
| `CONTACT_FROM_EMAIL` | Ambiente, opcional | Padrão temporário: `PrimeView Filmes <onboarding@resend.dev>`; configurar remetente verificado para produção |

O widget envia `action=contact`; o backend valida ação e hostname. Tokens são descartados após uma tentativa e renovados no navegador. Mantenha a planilha de respostas e a de controle privadas. Restrinja os editores do Apps Script: eles podem acessar suas propriedades.

Depois de carregar URL e segredo no ambiente privado local, verifique a autenticação sem enviar contato ou e-mail:

```powershell
node scripts/retry-contact-email.mjs --check
```

Configure proteção de tráfego/rate limiting para `POST /api/contact` na Cloudflare conforme o plano disponível e volume de atendimento. Turnstile, honeypot, validação, limite de 16 KiB, timeouts, trava de concorrência e IDs persistentes já fazem parte do código. A verificação HMAC impede gravações não autenticadas, mas um endpoint público de Apps Script ainda está sujeito a consumo de cota; cache de nonce não é proteção contra exaustão de recursos.

## Contrato de autenticação

POST JSON: `{ "payload": "<JSON serializado>", "signature": "<HMAC-SHA256 hexadecimal>" }`.

O HMAC cobre **os bytes UTF-8 exatos** de `payload`, sem reserializar antes da verificação. A chave é a string UTF-8 do segredo privado. O payload contém versão 1, operação, UUID v4 da solicitação, timestamp em milissegundos e nonce UUID v4, além dos dados da operação. Aceita-se diferença de relógio de no máximo cinco minutos. A comparação da assinatura não encerra no primeiro byte diferente.

O segredo nunca é transmitido. O Apps Script autentica antes de acessar Forms/Sheets. O cache de nonce é apenas uma camada adicional; os estados persistentes da planilha continuam protegendo reenvios se o cache expirar. O cliente segue exclusivamente o redirecionamento documentado para `script.googleusercontent.com`, usando GET e sem reenviar o POST assinado. HTML de login, resultado sem `ok=true`, correlação divergente e resposta sem identificador confirmado do Forms nunca são tratados como sucesso.

## Estados, concorrência e recuperação

- Navegador: um envio por vez. Somente UUID e hash do conteúdo ficam em `sessionStorage`; os campos preenchidos não são salvos no armazenamento do navegador. Repetir o mesmo conteúdo após falha usa o mesmo UUID.
- Google: planilha `Controle` registra UUID, digest, estados, ID da resposta e metadados da notificação. Não copia nome, telefone, mensagem ou e-mail do cliente.
- `processing` / `uncertain`: não criar nova resposta automaticamente. Há uma janela não transacional entre a gravação no Forms e a confirmação no controle. Verificar o registro real antes de reconciliar.
- `submitted`: Forms confirmou uma resposta; esse registro é a condição obrigatória para sucesso ao visitante.
- E-mail `pending` / `sending` / `sent`: falha de notificação não apaga o contato nem solicita ao cliente outro envio. A reserva dura 90 segundos. A chave Resend é `primeview-contact/<UUID>`, sempre com o mesmo conteúdo e remetente/destinatário gravados na primeira solicitação.
- Após 23 horas da primeira tentativa de e-mail, a recuperação automática para (`expired`), antes de expirar a proteção de 24 horas do Resend. Conferir o provedor antes de qualquer recuperação manual; não inventar outra chave para contornar a deduplicação.
- Não há garantia de deduplicação entre navegadores/dispositivos ou depois de apagar o armazenamento do navegador. Não há promessa de transação exatamente uma vez entre Google e Resend.

Para recuperar notificações, carregue os secrets no ambiente privado do processo (nunca na linha de comando ou em arquivo versionado) e execute com Node >=22.18:

```powershell
node scripts/retry-contact-email.mjs
```

O comando processa até 20 pendências elegíveis e imprime somente UUID/estado. Também aceita um UUID específico. **Ele envia e-mails reais**: use apenas com autorização operacional. Nunca chama a operação `submit` do Forms e não possui agendamento automático.

Para reconciliar um envio Google incerto, confira manualmente a resposta e cadastre `RECONCILE_REQUEST_ID` e `RECONCILE_RESPONSE_ID` nas propriedades do script. Execute `reconciliarSolicitacao`. A função compara o conteúdo com o digest original e apenas associa uma resposta existente; não cria outra. Se não existir resposta confirmada, não altere o estado para sucesso nem reenvie às cegas.

## Validação e testes

```powershell
node --test tests/contact.test.mjs
npm run build
npm run astro -- check
```

Os testes de integração usam o código real `Code.gs` em um simulador local com serviços Google/Resend substituídos por mocks. Não comprovam permissões, cotas, entrega de e-mail ou sincronização na conta real. O teste de navegador documentado em `tests/contact-browser.cjs` usa Chrome com porta de depuração local e nenhuma dependência adicional.

Antes de ativar: revisar privacidade/retenção, verificar HMAC em implantação real, executar um contato de teste autorizado, conferir uma única resposta no Forms e na planilha vinculada, conferir a notificação Resend e repetir com falhas controladas em ambiente de teste. Preservar integralmente cartões, assets, CSS global e bloco pai de contato. Problemas responsivos preexistentes no contato ficam fora desta alteração.

## Referências oficiais

- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/reference/forms/form-response
- https://developers.google.com/apps-script/reference/utilities/utilities
- https://developers.google.com/apps-script/guides/content
- https://developers.google.com/apps-script/reference/lock/lock-service
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
