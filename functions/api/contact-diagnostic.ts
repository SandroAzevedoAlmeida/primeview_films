import { callGoogle, IntegrationError, type GoogleEnv } from '../../src/lib/server/google-forms.ts';
const tokenHash = '7a159594f2b920a570f8ff35c133be891e92b7409009548f942b35de53aaf8e1';
const expires = 1791774044978;
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export const onRequestPost = async ({request, env}: {request: Request; env: GoogleEnv}) => {
  if (Date.now() > expires) return reply({code:'expired'}, 404);
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  if (!/^[a-f0-9]{64}$/.test(token)) return reply({code:'denied'}, 403);
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(b=>b.toString(16).padStart(2,'0')).join('');
  if (hash !== tokenHash) return reply({code:'denied'}, 403);
  try {
    const result = await callGoogle(env, 'health', crypto.randomUUID());
    return reply({code: result.ok ? 'healthy' : 'unconfirmed'});
  } catch(error) {
    const allowed = ['authentication','configuration','redirect','google_unavailable','response_size','response_format','google_rejected','busy','replay','google_timeout','google_post_transport','google_result_transport','google_result_redirect','google_result_read'];
    return reply({code:error instanceof IntegrationError && allowed.includes(error.code) ? error.code : 'unexpected'}, 502);
  }
};
