# Investigacao ntfy - 12/10/2026

## Evidencias

- Permissoes do Apps Script foram concedidas usando requireAllScopes. Execucao informada pelo proprietario: google_status 204, ntfy_failure connection.
- No celular, /v1/health retornou healthy:true.
- Neste computador, duas consultas HTTPS ao mesmo endpoint retornaram 200, healthy:true (aproximadamente 0,9s e 0,5s).
- DNS local, Google e Cloudflare retornaram o mesmo A publico para ntfy.sh. Isso nao mede o DNS interno do Apps Script.
- Diagnostico anterior na Cloudflare: GET health 200; publicacao expirou em 12s e retornou 522 quando o prazo foi ampliado para 25s.
- Relato oficial compativel: https://github.com/binwiederhier/ntfy/issues/1832 . O mantenedor descreve bloqueios temporarios de IPs compartilhados por abuso de terceiros. Hipotese plausivel, nao confirmacao de bloqueio desta conta. Nao usar IPs alternativos, proxies ou desativar TLS para contornar restricoes.

## Proximo teste

scripts/test-ntfy-local.ps1 publica um unico aviso generico a partir do computador. O proprietario informa o topico em entrada oculta; o script nao o salva nem o imprime. Nao precisa de chave Cloudflare/Google e nao cria resposta no Forms. Confirmacao da API nao equivale a entrega ao telefone: conferir o aplicativo.

Ainda nao executado: falta o proprietario informar o topico localmente. Se confirmar publicacao e chegar no celular, o caminho local e a inscricao estao validados; a falha de saida dos servidores continua por resolver. Nao repetir publicacoes indefinidamente. Uma rechecagem de saude posterior pelo Apps Script pode determinar se a falha era temporaria. Uma falha persistente pode ser relatada ao suporte com horarios, metodos, endpoints publicos e status, sem topico nem segredos. Nenhuma mensagem foi enviada ao suporte.
