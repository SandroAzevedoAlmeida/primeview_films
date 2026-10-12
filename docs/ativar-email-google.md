# Aviso por e-mail como canal principal

Destinatario confirmado pelo proprietario: primeviewfilmes@gmail.com.

## Ativacao na conta Google

1. Substituir Code.gs no editor pelo arquivo integrations/google-apps-script/Code.gs deste repositorio e salvar.
2. Substituir appsscript.json pelo arquivo integrations/google-apps-script/appsscript.json atualizado e salvar. A nova permissao e https://www.googleapis.com/auth/script.send_mail . As anteriores permanecem.
3. Executar autorizarETestarEmail no editor, conceder as permissoes e executar novamente se necessario. Envia uma unica mensagem generica para o destinatario confirmado, sem contato novo nem requisicao ntfy. A propriedade EMAIL_SETUP_TEST_STATE impede repetir o teste. Nao apagar essa propriedade se a entrega estiver incerta.
4. Conferir a caixa de entrada e spam. Mensagem esperada: Teste de aviso - PrimeView Filmes. O registro email_teste_aceito_pelo_google_confira_caixa_e_spam significa aceitacao pelo MailApp, nao confirmacao na caixa.
5. Apos confirmar recebimento: Implantar > Gerenciar implantacoes > App para a Web existente > Editar > Nova versao > Implantar. Preservar URL /exec e executar como proprietario.
6. Fazer um unico teste do site e conferir Forms, e-mail e aba AvisosEmail na planilha de controle. A coluna email_state desta nova aba e a fonte do estado de e-mail. A aba Controle conserva o historico ntfy e o registro Forms.

## Operacao

CONTACT_NOTIFICATION_PROVIDER ausente agora seleciona google_email. NTFY_TOPIC pode permanecer salvo, mas nao interfere nem dispara aviso nesse modo. Modos explicitos ntfy e resend permanecem disponiveis; nao enviar dois canais sobre o mesmo controle antigo. Nenhuma chave Resend e necessaria para MailApp.

Google envia um aviso generico ao endereco confirmado; nao encaminha dados pessoais do contato. A nova aba AvisosEmail reaproveita o formato de controle com metadados, mas tem estados independentes. A autenticacao HMAC e o registro confirmado no Forms sao obrigatorios antes de enviar.

MailApp nao oferece idempotencia nem ID de entrega. sent / mailapp-accepted significam envio aceito pelo Google; verificar caixa/spam no teste real. Se enviar ou salvar a confirmacao falhar, sending nao e reenviado automaticamente, mesmo depois de 90 segundos. Isso evita duplicatas quando a resposta se perde. Revisar manualmente a caixa de entrada antes de qualquer recuperacao. Contatos com mais de 24 horas nao sao enviados automaticamente. Nao ha agendamento de retries.

O fluxo falha de forma segura com Apps Script antigo: preserva Forms e retorna aviso pendente. A autorizacao e publicacao Google sao obrigatorias. Limites diarios do MailApp sao verificados com getRemainingDailyQuota; nao ha promessa de entrega ilimitada.

Fontes: https://developers.google.com/apps-script/reference/mail/mail-app e https://developers.google.com/apps-script/guides/services/quotas
