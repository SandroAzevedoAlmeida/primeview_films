interface ContactEnv {
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
}

const limits = { name: 100, email: 160, phone: 30, profile: 40, service: 80, message: 2000 };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: Record<string, string>, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

interface ContactContext { request: Request; env: ContactEnv; }

export const onRequestPost = async (context: ContactContext) => {
  try {
    const form = await context.request.formData();
    if (String(form.get('website') ?? '').trim()) return json({ message: 'Solicitação recebida.' });
    const values = Object.fromEntries(['name', 'email', 'phone', 'profile', 'service', 'message'].map((key) => [key, String(form.get(key) ?? '').trim()]));
    for (const [key, limit] of Object.entries(limits)) if (!values[key] || values[key].length > limit) return json({ message: 'Confira os campos e tente novamente.' }, 400);
    if (!emailPattern.test(values.email)) return json({ message: 'Confira o e-mail informado.' }, 400);
    if (!context.env.TURNSTILE_SECRET_KEY || !context.env.RESEND_API_KEY) return json({ message: 'Canal temporariamente indisponível.' }, 503);

    const turnstileToken = String(form.get('cf-turnstile-response') ?? '');
    const turnstileBody = new URLSearchParams({ secret: context.env.TURNSTILE_SECRET_KEY, response: turnstileToken, remoteip: context.request.headers.get('CF-Connecting-IP') ?? '' });
    const turnstile = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: turnstileBody });
    if (!(await turnstile.json() as { success?: boolean }).success) return json({ message: 'Não foi possível validar sua solicitação.' }, 400);

    const destination = context.env.CONTACT_TO_EMAIL ?? 'primeviewfilmes@gmail.com';
    const email = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${context.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'PrimeView Filmes <onboarding@resend.dev>', to: [destination], subject: 'Novo contato pelo site — PrimeView Filmes', text: `NOVO CONTATO — SITE PRIMEVIEW FILMES\n\nNome: ${values.name}\nE-mail: ${values.email}\nWhatsApp: ${values.phone}\nPerfil: ${values.profile}\nServiço: ${values.service}\n\nMensagem:\n${values.message}` }) });
    if (!email.ok) return json({ message: 'Não foi possível enviar sua mensagem agora.' }, 502);
    return json({ message: 'Mensagem enviada com sucesso.' });
  } catch { return json({ message: 'Não foi possível processar sua solicitação.' }, 400); }
};