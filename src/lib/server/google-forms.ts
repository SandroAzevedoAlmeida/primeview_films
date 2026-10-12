export interface GoogleEnv {
  CONTACT_NOTIFICATION_PROVIDER?: string;
  GOOGLE_APPS_SCRIPT_URL?: string;
  GOOGLE_FORMS_SHARED_SECRET?: string;
  RESEND_API_KEY?: string;
  NTFY_TOPIC?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_TO_EMAIL?: string;
}
export interface GoogleResult {
  ok: boolean;
  code?: string;
  requestId?: string;
  googleResponseId?: string;
  emailState?: string;
  values?: Record<string, string>;
  mailFrom?: string;
  mailTo?: string;
  pendingRequestIds?: string[];
}
export class IntegrationError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}

export function configuredGoogle(env: GoogleEnv): boolean {
  try {
    const url = new URL(env.GOOGLE_APPS_SCRIPT_URL ?? '');
    return url.protocol === 'https:' && url.hostname === 'script.google.com' && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) && !url.search && !url.username && !url.password && /^[A-Za-z0-9_-]{43,128}$/.test(env.GOOGLE_FORMS_SHARED_SECRET ?? '');
  } catch { return false; }
}

export async function callGoogle(env: GoogleEnv, action: string, requestId: string, extra: Record<string, unknown> = {}): Promise<GoogleResult> {
  if (!configuredGoogle(env)) throw new IntegrationError('configuration');
  const payload = JSON.stringify({ ...extra, version: 1, action, requestId, sentAt: Date.now(), nonce: crypto.randomUUID() });
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.GOOGLE_FORMS_SHARED_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
  const signature = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  const signal = AbortSignal.timeout(20000);
  // Apps Script ContentService redirects the result to googleusercontent.com.
  // Follow only that documented GET redirect; never replay the signed POST elsewhere.
  let response: Response;
  try {
    response = await fetch(env.GOOGLE_APPS_SCRIPT_URL!, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload, signature }), redirect: 'manual', signal });
  } catch { throw new IntegrationError(signal.aborted ? 'google_timeout' : 'google_post_transport'); }
  if ([302, 303].includes(response.status)) {
    let target: URL;
    try { target = new URL(response.headers.get('Location') ?? ''); }
    catch { throw new IntegrationError('redirect'); }
    if (target.protocol !== 'https:' || target.hostname !== 'script.googleusercontent.com' || target.username || target.password) throw new IntegrationError('redirect');
    try {
      response = await fetch(target, { method: 'GET', redirect: 'manual', signal });
    } catch { throw new IntegrationError(signal.aborted ? 'google_timeout' : 'google_result_transport'); }
    if (response.status >= 300 && response.status < 400) throw new IntegrationError('google_result_redirect');
  }
  if (!response.ok) throw new IntegrationError('google_unavailable');
  let text: string;
  try { text = await response.text(); }
  catch { throw new IntegrationError(signal.aborted ? 'google_timeout' : 'google_result_read'); }
  if (text.length > 20000) throw new IntegrationError('response_size');
  let result: GoogleResult;
  try { result = JSON.parse(text); } catch { throw new IntegrationError('response_format'); }
  if (!result || typeof result !== 'object' || result.requestId !== requestId || result.ok !== true) throw new IntegrationError(typeof result?.code === 'string' ? result.code : 'google_rejected');
  return result;
}

export async function notifyContact(env: GoogleEnv, requestId: string): Promise<'sent' | 'pending'> {
  const provider = env.CONTACT_NOTIFICATION_PROVIDER ?? 'google_email';
  if (provider === 'google_email') {
    try {
      const result = await callGoogle(env, 'notify_email', requestId);
      return result.emailState === 'sent' ? 'sent' : 'pending';
    } catch {
      console.error('contact_email_failure', { code: 'google_email_unconfirmed' });
      return 'pending';
    }
  }
  if (provider === 'ntfy') return notifyNtfy(env, requestId);
  if (provider !== 'resend') return 'pending';
  if (!env.RESEND_API_KEY) return 'pending';
  try {
    const claim = await callGoogle(env, 'claim_email', requestId);
    if (claim.emailState === 'sent') return 'sent';
    if (claim.emailState !== 'claimed' || !claim.values || !claim.mailFrom || !claim.mailTo) return 'pending';
    const v = claim.values;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `primeview-contact/${requestId}` },
      body: JSON.stringify({ from: claim.mailFrom, to: [claim.mailTo], subject: 'Novo contato pelo site — PrimeView Filmes', text: `NOVO CONTATO — SITE PRIMEVIEW FILMES\n\nNome: ${v.name}\nE-mail: ${v.email}\nWhatsApp: ${v.phone}\nPerfil: ${v.profile}\nServiço: ${v.service}\n\nMensagem:\n${v.message}` }),
    });
    const body = await response.json() as { id?: unknown };
    if (!response.ok || typeof body.id !== 'string' || !body.id) {
      await callGoogle(env, 'email_result', requestId, { delivered: false });
      return 'pending';
    }
    await callGoogle(env, 'email_result', requestId, { delivered: true, emailId: body.id });
    return 'sent';
  } catch {
    // The Google record remains authoritative. An uncertain email keeps its lease;
    // recovery uses the same Resend key, never a second Forms submission.
    return 'pending';
  }
}

export interface NtfyPublication {
  code: 'sent' | 'topic_invalid' | 'http_error' | 'invalid_ack' | 'timeout' | 'transport';
  httpStatus?: number;
  providerCode?: number;
  retryAfterSeconds?: number;
  id?: string;
}

// A single attempt. No automatic retry after an uncertain POST.
export async function publishNtfyJson(env: GoogleEnv): Promise<NtfyPublication> {
  const topic = env.NTFY_TOPIC;
  if (typeof topic !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(topic)) return { code: 'topic_invalid' };
  const signal = AbortSignal.timeout(25000);
  try {
    const response = await fetch('https://ntfy.sh/', {
      method: 'POST', redirect: 'manual', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, title: 'PrimeView Filmes', message: 'Nova solicitação de orçamento recebida. Consulte a planilha.' }),
    });
    if (!response.ok) {
      const failure: NtfyPublication = { code: 'http_error', httpStatus: response.status };
      const retry = response.headers.get('Retry-After');
      if (retry && /^\d{1,8}$/.test(retry)) failure.retryAfterSeconds = Number(retry);
      try {
        const body = await response.json();
        if (body && Number.isInteger(body.code) && body.code >= 10000 && body.code <= 59999) failure.providerCode = body.code;
      } catch { /* Only numeric provider codes are useful; never expose error text. */ }
      return failure;
    }
    let data;
    try { data = await response.json(); } catch { return { code: 'invalid_ack', httpStatus: response.status }; }
    if (!data || data.event !== 'message' || data.topic !== topic || typeof data.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(data.id)) return { code: 'invalid_ack', httpStatus: response.status };
    return { code: 'sent', httpStatus: response.status, id: data.id };
  } catch (error) {
    return { code: signal.aborted || error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'transport' };
  }
}

async function notifyNtfy(env: GoogleEnv, requestId: string): Promise<'sent' | 'pending'> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(env.NTFY_TOPIC ?? '')) return 'pending';
  let stage = 'claim';
  try {
    const claim = await callGoogle(env, 'claim_email', requestId);
    if (claim.emailState === 'sent') return 'sent';
    if (claim.emailState !== 'claimed') return 'pending';
    stage = 'publish';
    const result = await publishNtfyJson(env);
    if (result.code !== 'sent') {
      console.error('contact_ntfy_failure', { code: result.code, httpStatus: result.httpStatus, providerCode: result.providerCode, retryAfterSeconds: result.retryAfterSeconds });
      if (result.code === 'http_error') await callGoogle(env, 'email_result', requestId, { delivered: false });
      return 'pending';
    }
    stage = 'confirmation';
    await callGoogle(env, 'email_result', requestId, { delivered: true, emailId: result.id });
    return 'sent';
  } catch {
    // Fixed stage only: never log the topic, response body or raw exception.
    console.error('contact_ntfy_failure', { code: 'google_unconfirmed', stage });
    return 'pending';
  }
}
