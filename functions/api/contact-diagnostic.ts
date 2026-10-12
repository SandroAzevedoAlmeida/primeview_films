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
    let legacy = 'not_checked';
    // Compare the old redirect mode using only a signed health operation.
    const payload = JSON.stringify({version:1,action:'health',requestId:crypto.randomUUID(),sentAt:Date.now(),nonce:crypto.randomUUID()});
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw',encoder.encode(env.GOOGLE_FORMS_SHARED_SECRET!),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const signature = [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payload)))].map(b=>b.toString(16).padStart(2,'0')).join('');
    const first = await fetch(env.GOOGLE_APPS_SCRIPT_URL!,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload,signature}),redirect:'manual',signal:AbortSignal.timeout(20000)});
    if ([302,303].includes(first.status)) {
      const target = new URL(first.headers.get('Location') ?? '');
      if(target.protocol !== 'https:' || target.hostname !== 'script.googleusercontent.com' || target.username || target.password) return reply({code:'redirect'},502);
      try {
        const old = await fetch(target,{method:'GET',redirect:'error',signal:AbortSignal.timeout(20000)});
        const body = await old.json() as {ok?:boolean};
        legacy = body.ok === true ? 'healthy' : 'unconfirmed';
      } catch(error) {
        legacy = error instanceof TypeError ? 'type_error' : 'failed';
      }
    }
    return reply({code: result.ok ? 'healthy' : 'unconfirmed',legacy});
  } catch(error) {
    const allowed = ['authentication','configuration','redirect','google_unavailable','response_size','response_format','google_rejected','busy','replay','google_timeout','google_post_transport','google_result_transport','google_result_redirect','google_result_read'];
    return reply({code:error instanceof IntegrationError && allowed.includes(error.code) ? error.code : 'unexpected'}, 502);
  }
};
