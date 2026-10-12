# Ativar ntfy pelo Google Apps Script

O site ja foi adaptado para solicitar `notify_ntfy` ao Apps Script. O topico continua no segredo NTFY_TOPIC da Cloudflare: nao precisa copia-lo para o Google nem envia-lo no chat. A chamada e assinada com o segredo compartilhado existente.

## Na conta Google (etapa manual obrigatoria)

1. Abra o Apps Script vinculado ao formulario, no menu de tres pontos do Google Forms > Apps Script.
2. Substitua todo o conteudo de Code.gs pelo arquivo `integrations/google-apps-script/Code.gs` deste projeto. Salve.
3. Em Configuracoes do projeto, habilite a exibicao do manifesto appsscript.json. Substitua seu conteudo pelo arquivo `integrations/google-apps-script/appsscript.json` deste projeto. Salve. A nova permissao e script.external_request.
4. No editor, selecione `autorizarNotificacoes` e clique Executar. Autorize o acesso solicitado na sua conta. A funcao apenas consulta a saude do ntfy, sem publicar aviso ou criar contato. Resultado esperado: ntfy_health_status 200; isso ainda nao comprova publicacao.
5. Implantar > Gerenciar implantacoes > selecione o aplicativo da Web em uso > Editar (lapis) > Nova versao > Implantar. Preserve executar como proprietario e acesso existente. Atualize a implantacao existente para manter a mesma URL /exec.
6. Aguarde a publicacao mais recente da Cloudflare. Envie UM teste no site. Confira sucesso no site, uma resposta no Forms, aviso no aplicativo e email_state=sent na linha correspondente.

Nao execute configurarIntegracao novamente, nao crie outra planilha e nao reenvie os testes antigos. Nao publique capturas com segredos. Se falhar, os logs Google usam somente ntfy_http_status (numero), ntfy_ack_invalid ou ntfy_delivery_unconfirmed.

## Comportamento e limites

Somente mensagens genericas sao publicadas, sem dados do cliente. A resposta deve confirmar o topico e ID da mensagem antes de registrar sent. O Google mantem o bloqueio durante a publicacao e respeita registros ja enviados e a reserva de 90 segundos. Entrega incerta conserva sending; uma tentativa posterior pode duplicar um aviso se o ntfy aceitou mas a resposta se perdeu. Nao ha reenvio automatico agendado. O registro do Forms nao e recriado.

Uma versao antiga do Apps Script rejeita a nova acao: o site ainda confirma o contato registrado, mas o aviso fica pendente ate atualizar o Google. Os testes locais simulam UrlFetchApp; a conectividade real Google -> ntfy e a permissao so podem ser confirmadas depois da atualizacao na conta.

Referencia: https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
