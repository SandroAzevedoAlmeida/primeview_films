export const profiles = ['Corretor', 'Imobiliária', 'Construtora/Incorporadora', 'Proprietário', 'Loja/Comércio', 'Gastronomia', 'Empresa/Escritório', 'Saúde/Clínica', 'Escola/Educação', 'Academia/Bem-estar', 'Entretenimento', 'Outro'] as const;
export const services = ['Vídeos institucionais', 'Fotografia profissional', 'Tour Virtual 360°', 'Vídeos para redes sociais', 'Pacote completo', 'Outro'] as const;
export const fields = ['name', 'email', 'phone', 'profile', 'service', 'message'] as const;
export type ContactField = typeof fields[number];
export type ContactValues = Record<ContactField, string>;
export interface FieldError { field: ContactField; message: string; }
export const labels: Record<ContactField, string> = { name: 'Nome', email: 'E-mail', phone: 'WhatsApp', profile: 'Perfil do cliente', service: 'Serviço de interesse', message: 'Mensagem' };
export const limits: Record<ContactField, number> = { name: 100, email: 160, phone: 30, profile: 40, service: 80, message: 2000 };
export const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateContact(input: Record<string, unknown>): { values: ContactValues; errors: FieldError[] } {
  const values = {} as ContactValues;
  const errors: FieldError[] = [];
  for (const field of fields) {
    const raw = input[field];
    const value = typeof raw === 'string' ? raw.trim() : '';
    values[field] = value;
    let message = '';
    if (!value) message = 'Preencha este campo.';
    else if (value.length > limits[field]) message = `Use no máximo ${limits[field]} caracteres.`;
    else if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) message = 'Remova os caracteres inválidos.';
    else if (field !== 'message' && /[\r\n\t]/.test(value)) message = 'Use apenas uma linha.';
    else if (field === 'name' && !/\p{L}/u.test(value)) message = 'Informe seu nome.';
    else if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'Informe um e-mail válido.';
    else if (field === 'phone') {
      const digits = value.replace(/[+()\s.-]/g, '');
      const national = digits.length === 13 && digits.startsWith('55') ? digits.slice(2) : digits;
      if (!/^\+?[\d()\s.-]+$/.test(value) || !/^[1-9][1-9]9\d{8}$/.test(national) || /^(\d)\1{8}$/.test(national.slice(2))) message = 'Informe um celular brasileiro válido com DDD.';
      else values.phone = `+55${national}`;
    } else if (field === 'profile' && !(profiles as readonly string[]).includes(value)) message = 'Selecione um perfil disponível.';
    else if (field === 'service' && !(services as readonly string[]).includes(value)) message = 'Selecione um serviço disponível.';
    if (message) errors.push({ field, message });
  }
  return { values, errors };
}
