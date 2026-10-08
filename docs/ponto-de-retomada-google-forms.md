# Ponto de retomada — integração Google Forms

Salvo a pedido do proprietário em 08/10/2026. Horário informado: 02:41 (America/Sao_Paulo).

## Concluído na conta Google, conforme confirmação do proprietário

- Código e manifesto adicionados ao Apps Script vinculado ao formulário.
- Função `configurarIntegracao` executada e autorizada.
- Propriedades `GOOGLE_FORM_ID`, `FORM_ITEM_MAP` e `INTEGRATION_LEDGER_SHEET_ID` confirmadas.
- Chave privada salva na propriedade `GOOGLE_FORMS_SHARED_SECRET`. O valor não foi compartilhado no chat e não consta neste arquivo.
- Implantação criada e URL `/exec` fornecida pelo proprietário:

  https://script.google.com/macros/s/AKfycbz6BUSGMLichzezMfhCfN1jRhkyL_4JlCr9JMuZl284TOFbsGNLwAAZKKovWrfkZsxy/exec

Formulário público: https://forms.gle/rokyeGjsfmNVVkmg9

## Ponto exato para continuar

Na Cloudflare, usaremos:

- `GOOGLE_APPS_SCRIPT_URL`: a URL `/exec` acima.
- `GOOGLE_FORMS_SHARED_SECRET`: a mesma chave salva no Apps Script, cadastrada como segredo. Não gerar outra sem atualizar os dois lados; não solicitar a chave pelo chat.

Pergunta pendente ao proprietário:

**Você já tem o site PrimeView cadastrado na Cloudflare ou, por enquanto, ele está somente no seu computador e no GitHub?**

A resposta define o próximo passo. A integração ainda precisa da configuração da Cloudflare e de um teste real. A URL recebida, por si só, não comprova autenticação ou funcionamento ponta a ponta.

## Referência para continuidade

Consultar `docs/google-forms.md` para as demais variáveis, instalação e validação. O código local foi preparado e validado com testes simulados; a ativação real continua pendente. Não registrar segredos no código, Git ou conversa. Este checkpoint não autoriza publicação, commit ou push.
