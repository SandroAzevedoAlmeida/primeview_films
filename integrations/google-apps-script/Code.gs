// Projeto vinculado ao Google Forms: execute configurarIntegracao no editor.
// Segredos ficam em Propriedades do script, nunca neste arquivo nem nos logs.
const PV_FIELDS = ['name', 'email', 'phone', 'profile', 'service', 'message'];
const PV_PROFILES = ['Corretor', 'Imobiliária', 'Construtora/Incorporadora', 'Proprietário', 'Loja/Comércio', 'Gastronomia', 'Empresa/Escritório', 'Saúde/Clínica', 'Escola/Educação', 'Academia/Bem-estar', 'Entretenimento', 'Outro'];
const PV_SERVICES = ['Vídeos institucionais', 'Fotografia profissional', 'Tour Virtual 360°', 'Vídeos para redes sociais', 'Pacote completo', 'Outro'];
const PV_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PV_HEADERS = ['request_id', 'digest', 'google_state', 'response_id', 'created_at', 'email_state', 'first_email_at', 'lease_until', 'mail_from', 'mail_to', 'email_id'];

function configurarIntegracao() {
  const form = FormApp.getActiveForm();
  if (!form) throw new Error('Abra este projeto pelo editor do Google Forms.');
  const titles = { name: 'Nome', email: 'E-mail', phone: 'WhatsApp', profile: 'Perfil do cliente', service: 'Serviço de interesse', message: 'Mensagem' };
  const map = {};
  PV_FIELDS.forEach(function(field) {
    const matches = form.getItems().filter(function(item) { return item.getTitle().trim() === titles[field]; });
    if (matches.length !== 1) throw new Error('Confira a pergunta: ' + titles[field]);
    map[field] = matches[0].getId();
  });
  pvCheckSchema(form, map);
  const props = PropertiesService.getScriptProperties();
  props.setProperty('GOOGLE_FORM_ID', form.getId());
  props.setProperty('FORM_ITEM_MAP', JSON.stringify(map));
  if (!props.getProperty('INTEGRATION_LEDGER_SHEET_ID')) {
    const spreadsheet = SpreadsheetApp.create('PrimeView — Controle privado da integração');
    props.setProperty('INTEGRATION_LEDGER_SHEET_ID', spreadsheet.getId());
  }
  const ledger = pvLedger(props);
  console.log('Configuração concluída. Seis perguntas verificadas. Controle: ' + ledger.getParent().getUrl());
  console.log('Cadastre GOOGLE_FORMS_SHARED_SECRET nas Propriedades do script antes de implantar.');
}

function pvCheckSchema(form, map) {
  if (form.hasLimitOneResponsePerUser()) throw new Error('Desative Limitar a uma resposta nas configurações do Forms.');
  if (form.isPublishingSummary()) throw new Error('Desative a publicação do resumo das respostas para proteger os contatos.');
  const used = [];
  PV_FIELDS.forEach(function(field) {
    const item = form.getItemById(Number(map[field]));
    if (!item || used.indexOf(item.getId()) !== -1) throw new Error('schema');
    used.push(item.getId());
    const type = String(item.getType());
    let question;
    if (field === 'message' && type === 'PARAGRAPH_TEXT') question = item.asParagraphTextItem();
    else if (['name', 'email', 'phone'].indexOf(field) !== -1 && type === 'TEXT') question = item.asTextItem();
    else if (['profile', 'service'].indexOf(field) !== -1 && ['MULTIPLE_CHOICE', 'LIST'].indexOf(type) !== -1) {
      question = type === 'LIST' ? item.asListItem() : item.asMultipleChoiceItem();
      const actual = question.getChoices().map(function(choice) { return choice.getValue(); }).sort();
      const expected = (field === 'profile' ? PV_PROFILES : PV_SERVICES).slice().sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('schema');
    } else throw new Error('schema');
    if (!question.isRequired()) throw new Error('schema');
  });
  form.getItems().forEach(function(item) {
    if (used.indexOf(item.getId()) !== -1) return;
    // Decorative headings are allowed; extra questions must be reviewed explicitly.
    if (['SECTION_HEADER', 'IMAGE', 'VIDEO'].indexOf(String(item.getType())) === -1) throw new Error('schema');
  });
}

function pvValidate(input) {
  const result = {};
  const limits = { name:100, email:160, phone:30, profile:40, service:80, message:2000 };
  if (!input || typeof input !== 'object') throw new Error('validation');
  PV_FIELDS.forEach(function(field) {
    if (typeof input[field] !== 'string') throw new Error('validation');
    let value = input[field].trim();
    if (!value || value.length > limits[field] || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || (field !== 'message' && /[\r\n\t]/.test(value))) throw new Error('validation');
    if (field === 'name' && !/\p{L}/u.test(value)) throw new Error('validation');
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('validation');
    if (field === 'phone') {
      const digits = value.replace(/[+()\s.-]/g, '');
      const national = digits.length === 13 && digits.indexOf('55') === 0 ? digits.slice(2) : digits;
      if (!/^\+?[\d()\s.-]+$/.test(value) || !/^[1-9][1-9]9\d{8}$/.test(national) || /^(\d)\1{8}$/.test(national.slice(2))) throw new Error('validation');
      value = '+55' + national;
    }
    if (field === 'profile' && PV_PROFILES.indexOf(value) === -1) throw new Error('validation');
    if (field === 'service' && PV_SERVICES.indexOf(value) === -1) throw new Error('validation');
    result[field] = value;
  });
  return result;
}

function pvHex(bytes) { return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function pvDigest(values) { return pvHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(values), Utilities.Charset.UTF_8)); }
function pvEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function pvReply(body) { return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON); }
function pvLedger(props) {
  const spreadsheet = SpreadsheetApp.openById(props.getProperty('INTEGRATION_LEDGER_SHEET_ID'));
  let sheet = spreadsheet.getSheetByName('Controle');
  if (!sheet) sheet = spreadsheet.insertSheet('Controle');
  if (sheet.getLastRow() === 0) { sheet.appendRow(PV_HEADERS); sheet.setFrozenRows(1); }
  if (JSON.stringify(sheet.getRange(1, 1, 1, PV_HEADERS.length).getValues()[0]) !== JSON.stringify(PV_HEADERS)) throw new Error('ledger');
  return sheet;
}
function pvFind(sheet, id) {
  if (sheet.getLastRow() < 2) return null;
  const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  if (!match) return null;
  return { row:match.getRow(), data:sheet.getRange(match.getRow(), 1, 1, PV_HEADERS.length).getValues()[0] };
}
function pvSave(sheet, record) { sheet.getRange(record.row, 1, 1, PV_HEADERS.length).setValues([record.data]); SpreadsheetApp.flush(); }
function pvStoredValues(form, map, responseId) {
  const values = {};
  const responses = form.getResponse(responseId).getItemResponses();
  PV_FIELDS.forEach(function(field) {
    const matches = responses.filter(function(response) { return response.getItem().getId() === Number(map[field]); });
    if (matches.length !== 1) throw new Error('response');
    values[field] = matches[0].getResponse();
  });
  return pvValidate(values);
}

function doPost(event) {
  let requestId = '';
  let lock;
  try {
    if (!event || !event.postData || event.postData.length > 20000) throw new Error('authentication');
    const envelope = JSON.parse(event.postData.contents);
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('GOOGLE_FORMS_SHARED_SECRET') || '';
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(secret) || typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string' || !/^[0-9a-f]{64}$/.test(envelope.signature)) throw new Error('authentication');
    const expected = pvHex(Utilities.computeHmacSha256Signature(envelope.payload, secret, Utilities.Charset.UTF_8));
    if (!pvEqual(expected, envelope.signature)) throw new Error('authentication');
    const payload = JSON.parse(envelope.payload);
    if (payload.version !== 1 || !PV_UUID.test(payload.requestId || '') || !PV_UUID.test(payload.nonce || '') || !Number.isFinite(payload.sentAt) || Math.abs(Date.now() - payload.sentAt) > 300000) throw new Error('authentication');
    requestId = payload.requestId;
    const actions = ['submit', 'claim_email', 'email_result', 'pending_notifications', 'health'];
    if (actions.indexOf(payload.action) === -1) throw new Error('authentication');
    lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return pvReply({ ok:false, requestId:requestId, code:'busy' });
    // Cache is only an extra replay guard. Durable request IDs below remain authoritative.
    const cache = CacheService.getScriptCache();
    if (cache.get('nonce:' + payload.nonce)) return pvReply({ ok:false, requestId:requestId, code:'replay' });
    cache.put('nonce:' + payload.nonce, '1', 300);
    const form = FormApp.openById(props.getProperty('GOOGLE_FORM_ID'));
    const map = JSON.parse(props.getProperty('FORM_ITEM_MAP') || '{}');
    pvCheckSchema(form, map);
    const sheet = pvLedger(props);
    if (payload.action === 'health') return pvReply({ ok:true, requestId:requestId, configured:true });
    if (payload.action === 'pending_notifications') {
      const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow()-1, PV_HEADERS.length).getValues() : [];
      const ids = rows.filter(function(row) { return row[2] === 'submitted' && row[5] !== 'sent' && row[5] !== 'expired' && Number(row[7]) <= Date.now(); }).slice(0, 20).map(function(row) { return row[0]; });
      return pvReply({ ok:true, requestId:requestId, pendingRequestIds:ids });
    }
    let record = pvFind(sheet, requestId);
    if (payload.action === 'submit') {
      const values = pvValidate(payload.values);
      const digest = pvDigest(values);
      if (record && record.data[1] !== digest) return pvReply({ ok:false, requestId:requestId, code:'request_conflict' });
      if (!record) {
        if (!form.isAcceptingResponses()) return pvReply({ ok:false, requestId:requestId, code:'closed' });
        if (typeof payload.mailFrom !== 'string' || payload.mailFrom.length > 200 || /[\r\n]/.test(payload.mailFrom) || typeof payload.mailTo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.mailTo) || payload.mailTo.length > 160) throw new Error('configuration');
        let response = form.createResponse();
        PV_FIELDS.forEach(function(field) {
          const item = form.getItemById(Number(map[field]));
          const type = String(item.getType());
          const typed = type === 'TEXT' ? item.asTextItem() : type === 'PARAGRAPH_TEXT' ? item.asParagraphTextItem() : type === 'LIST' ? item.asListItem() : item.asMultipleChoiceItem();
          response = response.withItemResponse(typed.createResponse(values[field]));
        });
        const data = [requestId, digest, 'processing', '', Date.now(), 'pending', 0, 0, payload.mailFrom, payload.mailTo, ''];
        sheet.appendRow(data);
        record = { row:sheet.getLastRow(), data:data };
        SpreadsheetApp.flush();
        try {
          const submitted = response.submit();
          const responseId = submitted.getId();
          if (!responseId) throw new Error('uncertain');
          record.data[2] = 'submitted'; record.data[3] = responseId;
          pvSave(sheet, record);
        } catch (error) {
          record.data[2] = 'uncertain'; pvSave(sheet, record);
          return pvReply({ ok:false, requestId:requestId, code:'verification_pending' });
        }
      }
      if (record.data[2] !== 'submitted') return pvReply({ ok:false, requestId:requestId, code:'verification_pending' });
      return pvReply({ ok:true, requestId:requestId, googleResponseId:record.data[3], emailState:record.data[5] });
    }
    if (!record || record.data[2] !== 'submitted') return pvReply({ ok:false, requestId:requestId, code:'verification_pending' });
    if (payload.action === 'email_result') {
      if (record.data[5] !== 'sent') {
        if (payload.delivered === true && typeof payload.emailId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(payload.emailId)) {
          record.data[5] = 'sent'; record.data[10] = payload.emailId;
        } else if (payload.delivered === false) record.data[5] = 'pending';
        else throw new Error('validation');
        record.data[7] = 0; pvSave(sheet, record);
      }
      return pvReply({ ok:true, requestId:requestId, emailState:record.data[5] });
    }
    if (record.data[5] === 'sent') return pvReply({ ok:true, requestId:requestId, emailState:'sent' });
    if (Number(record.data[6]) && Date.now() - Number(record.data[6]) > 23 * 60 * 60 * 1000) {
      record.data[5] = 'expired'; pvSave(sheet, record);
      return pvReply({ ok:true, requestId:requestId, emailState:'expired' });
    }
    if (Number(record.data[7]) > Date.now()) return pvReply({ ok:true, requestId:requestId, emailState:'sending' });
    const values = pvStoredValues(form, map, record.data[3]);
    if (pvDigest(values) !== record.data[1]) return pvReply({ ok:false, requestId:requestId, code:'response_changed' });
    if (!Number(record.data[6])) record.data[6] = Date.now();
    record.data[5] = 'sending'; record.data[7] = Date.now() + 90000; pvSave(sheet, record);
    return pvReply({ ok:true, requestId:requestId, emailState:'claimed', googleResponseId:record.data[3], values:values, mailFrom:record.data[8], mailTo:record.data[9] });
  } catch (error) {
    // Never return exception text, credentials, form content, or stack traces.
    return pvReply({ ok:false, requestId:requestId, code:requestId ? 'configuration' : 'authentication' });
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}

// Owner-only recovery: use Script Properties, not a public unauthenticated route.
// Inspect the matching Forms response first. This function never submits a response.
function reconciliarSolicitacao() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('RECONCILE_REQUEST_ID');
  const responseId = props.getProperty('RECONCILE_RESPONSE_ID');
  if (!PV_UUID.test(id || '') || !responseId) throw new Error('Informe os identificadores nas propriedades de reconciliação.');
  const lock = LockService.getScriptLock(); lock.waitLock(5000);
  try {
    const sheet = pvLedger(props); const record = pvFind(sheet, id);
    if (!record || ['processing','uncertain'].indexOf(record.data[2]) === -1) throw new Error('Estado não permite reconciliação.');
    const form = FormApp.openById(props.getProperty('GOOGLE_FORM_ID'));
    const values = pvStoredValues(form, JSON.parse(props.getProperty('FORM_ITEM_MAP')), responseId);
    if (pvDigest(values) !== record.data[1]) throw new Error('A resposta não corresponde à solicitação.');
    record.data[2] = 'submitted'; record.data[3] = responseId; pvSave(sheet, record);
    props.deleteProperty('RECONCILE_REQUEST_ID'); props.deleteProperty('RECONCILE_RESPONSE_ID');
    console.log('Registro reconciliado. Nenhuma resposta foi enviada.');
  } finally { lock.releaseLock(); }
}
