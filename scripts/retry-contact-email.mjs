import { callGoogle, notifyContact } from '../src/lib/server/google-forms.ts';
import { requestIdPattern } from '../src/lib/contact-validation.ts';

// Run with Node >=22.18. Secrets must already be in the process environment.
// This authenticated administrative script never invokes the Forms submit operation.
const env = process.env;
const requested = process.argv[2];
if (requested === '--check') {
  await callGoogle(env, 'health', crypto.randomUUID());
  console.log('Autenticação e configuração Google verificadas. Nenhuma resposta ou notificação enviada.');
  process.exit(0);
}
if (!env.RESEND_API_KEY && !env.NTFY_TOPIC) throw new Error('Configure NTFY_TOPIC ou RESEND_API_KEY no ambiente privado.');
if (requested && !requestIdPattern.test(requested)) throw new Error('Identificador inválido.');
const ids = requested ? [requested] : (await callGoogle(env, 'pending_notifications', crypto.randomUUID())).pendingRequestIds;
if (!Array.isArray(ids)) throw new Error('Resposta inválida da integração.');
for (const id of ids) {
  if (typeof id !== 'string' || !requestIdPattern.test(id)) throw new Error('Identificador inválido.');
  console.log(`${id}: ${await notifyContact(env, id)}`);
}
