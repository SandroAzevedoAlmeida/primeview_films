import { validateContact, requestIdPattern } from '../../src/lib/contact-validation.ts';
import { callGoogle, configuredGoogle, notifyContact, IntegrationError, type GoogleEnv } from '../../src/lib/server/google-forms.ts';

interface ContactEnv extends GoogleEnv {
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
}
interface ContactContext { request: Request; env: ContactEnv; }
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const maxBody = 16384;

async function boundedForm(request: Request): Promise<FormData> {
  if (Number(request.headers.get('Content-Length') ?? 0) > maxBody) throw new Error('body_size');
  if (!request.body) throw new Error('body_missing');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBody) { await reader.cancel(); throw new Error('body_size'); }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return new Request(request.url, { method: 'POST', headers: request.headers, body }).formData();
}

export const onRequestPost = async ({ request, env }: ContactContext) => {
  let form: FormData;
  try {
    const origin = request.headers.get('Origin');
    if (origin && origin !== new URL(request.url).origin) return json({ success: false, code: 'origin' }, 403);
    form = await boundedForm(request);
  } catch { return json({ success: false, code: 'invalid_request', message: 'Confira os campos e tente novamente.' }, 400); }
  // Never claim a Google submission for a honeypot request.
  if (form.get('website')) return json({ success: false, code: 'invalid_request' }, 400);
  const { values, errors } = validateContact(Object.fromEntries(form.entries()));
  if (errors.length) return json({ success: false, code: 'validation', errors }, 400);
  const requestId = form.get('requestId');
  if (typeof requestId !== 'string' || !requestIdPattern.test(requestId)) return json({ success: false, code: 'invalid_request' }, 400);
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_EXPECTED_HOSTNAME || !configuredGoogle(env)) {
    // Fixed labels only: never log values, request bodies, or raw exceptions.
    const issues: string[] = [];
    if (!env.TURNSTILE_SECRET_KEY) issues.push('TURNSTILE_SECRET_KEY:missing');
    if (!env.TURNSTILE_EXPECTED_HOSTNAME) issues.push('TURNSTILE_EXPECTED_HOSTNAME:missing');
    if (!configuredGoogle({ ...env, GOOGLE_FORMS_SHARED_SECRET: 'x'.repeat(64) })) issues.push('GOOGLE_APPS_SCRIPT_URL:missing_or_invalid');
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(env.GOOGLE_FORMS_SHARED_SECRET ?? '')) issues.push('GOOGLE_FORMS_SHARED_SECRET:missing_or_invalid');
    console.error('contact_configuration', { issues });
    return json({ success: false, code: 'unavailable', message: 'Canal temporariamente indisponível. Fale conosco pelo WhatsApp.' }, 503);
  }
  const token = form.get('cf-turnstile-response');
  if (typeof token !== 'string' || !token || token.length > 2048) return json({ success: false, code: 'turnstile' }, 400);
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, idempotency_key: crypto.randomUUID() });
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) body.set('remoteip', ip);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body, signal: AbortSignal.timeout(10000) });
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    if (!response.ok || result.success !== true || result.hostname !== env.TURNSTILE_EXPECTED_HOSTNAME || result.action !== 'contact') return json({ success: false, code: 'turnstile' }, 400);
  } catch { return json({ success: false, code: 'turnstile_unavailable' }, 503); }
  try {
    const result = await callGoogle(env, 'submit', requestId, {
      values,
      mailFrom: env.CONTACT_FROM_EMAIL ?? 'PrimeView Filmes <onboarding@resend.dev>',
      mailTo: env.CONTACT_TO_EMAIL ?? 'primeviewfilmes@gmail.com',
    });
    if (typeof result.googleResponseId !== 'string' || !result.googleResponseId) throw new IntegrationError('verification_pending');
    const notification = await notifyContact(env, requestId);
    return json({ success: true, status: 'recorded', requestId, notification, message: 'Solicitação registrada com sucesso.' });
  } catch (error) {
    const knownCodes = ['authentication', 'configuration', 'redirect', 'google_unavailable', 'response_size', 'response_format', 'google_rejected', 'busy', 'replay', 'closed', 'validation', 'request_conflict', 'verification_pending'];
    const diagnostic = error instanceof IntegrationError && knownCodes.includes(error.code) ? error.code : error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'unexpected';
    // Never include raw error messages, signatures, URLs, secrets or contact data.
    console.error('contact_google_failure', { code: diagnostic });
    const code = error instanceof IntegrationError && error.code === 'request_conflict' ? 'request_conflict' : 'verification_pending';
    return json({ success: false, code, message: 'Não foi possível confirmar o recebimento. Seus dados foram mantidos.' }, code === 'request_conflict' ? 409 : 503);
  }
};
