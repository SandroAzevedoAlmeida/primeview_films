# Publishes one generic test notice. No Forms request, credentials or transcript.
$ErrorActionPreference = 'Stop'
$pvSecretInput = Read-Host 'Digite o nome EXATO do topico inscrito no celular (entrada oculta)' -AsSecureString
$pvTopic = [System.Net.NetworkCredential]::new('', $pvSecretInput).Password
try {
    if ($pvTopic -cnotmatch '^[A-Za-z0-9_-]{1,64}$') {
        Write-Output 'RESULTADO: topico_invalido. Use somente o nome, sem https://ntfy.sh/.'
        return
    }
    $pvPayload = [System.Text.Encoding]::UTF8.GetBytes('Teste local PrimeView. Nenhum contato novo foi criado.')
    try {
        $pvReply = Invoke-RestMethod -Uri ('https://ntfy.sh/' + $pvTopic) -Method Post -ContentType 'text/plain; charset=utf-8' -Headers @{Title='PrimeView - teste local'} -Body $pvPayload -MaximumRedirection 0 -TimeoutSec 20
        if ($pvReply.event -ceq 'message' -and $pvReply.topic -ceq $pvTopic -and $pvReply.id -cmatch '^[A-Za-z0-9_-]{1,100}$') {
            Write-Output 'RESULTADO: ntfy_confirmou_publicacao. Confira o aplicativo no celular.'
        } else {
            Write-Output 'RESULTADO: resposta_nao_confirmada. Nao repita o envio agora.'
        }
    } catch {
        # Do not print the exception: it may contain the private topic URL.
        $pvStatus = 0
        if ($_.Exception.Response) { $pvStatus = [int]$_.Exception.Response.StatusCode }
        if ($pvStatus -gt 0) { Write-Output ('RESULTADO: http_' + $pvStatus) }
        else { Write-Output 'RESULTADO: falha_de_conexao. A entrega nao foi confirmada; nao repita agora.' }
    }
} finally {
    $pvTopic = $null
    $pvSecretInput.Dispose()
    $pvReply = $null
}
