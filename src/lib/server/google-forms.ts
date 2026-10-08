export interface GoogleEnv {
  GOOGLE_APPS_SCRIPT_URL?: string;
  GOOGLE_FORMS_SHARED_SECRET?: string;
  RESEND_API_KEY?: string;
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
  let response = await fetch(env.GOOGLE_APPS_SCRIPT_URL!, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload, signature }), redirect: 'manual', signal });
  if ([302, 303].includes(response.status)) {
    const target = new URL(response.headers.get('Location') ?? '');
    if (target.protocol !== 'https:' || target.hostname !== 'script.googleusercontent.com' || target.username || target.password) throw new IntegrationError('redirect');
    response = await fetch(target, { method: 'GET', redirect: 'error', signal });
  }
  if (!response.ok) throw new IntegrationError('google_unavailable');
  const text = await response.text();
  if (text.length > 20000) throw new IntegrationError('response_size');
  let result: GoogleResult;
  try { result = JSON.parse(text); } catch { throw new IntegrationError('response_format'); }
  if (!result || typeof result !== 'object' || result.requestId !== requestId || result.ok !== true) throw new IntegrationError(typeof result?.code === 'string' ? result.code : 'google_rejected');
  return result;
}

export async function notifyContact(env: GoogleEnv, requestId: string): Promise<'sent' | 'pending'> {
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
