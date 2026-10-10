import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { fields, profiles, services, validateContact } from '../src/lib/contact-validation.ts';
import { onRequestPost } from '../functions/api/contact.ts';
import { callGoogle, notifyContact } from '../src/lib/server/google-forms.ts';

const contact = { name:'Maria de Souza', email:'maria@example.com', phone:'(27) 98765-4321', profile:'Gastronomia', service:'Vídeos institucionais', message:'Gostaria de apresentar meu café.' };
const secret = 'test-only-shared-secret-never-use-in-production-0123456789';
const env = { GOOGLE_APPS_SCRIPT_URL:'https://script.google.com/macros/s/test-deployment/exec', GOOGLE_FORMS_SHARED_SECRET:secret, TURNSTILE_SECRET_KEY:'test-only-turnstile', TURNSTILE_EXPECTED_HOSTNAME:'primeview.test', RESEND_API_KEY:'test-only-resend' };

function googleFixture() {
  const state = { now:Date.now(), rows:[], responses:new Map(), submissions:0, failSubmit:false, failSaveAfterSubmit:false, emailCalls:0, googleCalls:0, turnstileCalls:0, turnstile:true, hostname:'primeview.test', action:'contact', emailOk:true, emailThrows:false, responseLost:false, redirects:false, nextRedirect:null };
  const properties = new Map([['GOOGLE_FORMS_SHARED_SECRET',secret],['GOOGLE_FORM_ID','test-form'],['FORM_ITEM_MAP',JSON.stringify(Object.fromEntries(fields.map((f,i)=>[f,i+1])))],['INTEGRATION_LEDGER_SHEET_ID','test-ledger']]);
  const titles = ['Nome','E-mail','WhatsApp','Perfil do cliente','Serviço de interesse','Mensagem'];
  const items = fields.map((field,i)=>{
    const item = { getId:()=>i+1,getTitle:()=>titles[i],getType:()=>field==='message'?'PARAGRAPH_TEXT':['profile','service'].includes(field)?'MULTIPLE_CHOICE':'TEXT',isRequired:()=>true,getChoices:()=> (field==='profile'?profiles:services).map(value=>({getValue:()=>value})),createResponse:value=>({getItem:()=>item,getResponse:()=>value}) };
    item.asTextItem=item.asParagraphTextItem=item.asListItem=item.asMultipleChoiceItem=()=>item;
    return item;
  });
  const form = {getItems:()=>items,getItemById:id=>items[id-1],isAcceptingResponses:()=>true,hasLimitOneResponsePerUser:()=>false,isPublishingSummary:()=>false,getId:()=> 'test-form',getResponse:id=>state.responses.get(id),createResponse:()=>{
    const responses=[];const draft={withItemResponse:r=>{responses.push(r);return draft},submit:()=>{
      state.submissions++;if(state.failSubmit)throw Error('simulated uncertainty');const id='form-response-'+state.submissions;const saved={getId:()=>id,getItemResponses:()=>responses};state.responses.set(id,saved);return saved;
    }};return draft;
  }};
  const sheet={getLastRow:()=>state.rows.length,appendRow:r=>state.rows.push([...r]),setFrozenRows:()=>{},getParent:()=>({getUrl:()=> 'https://example.test/ledger'}),getRange:(row,col,count=1,width=1)=>({
    getValues:()=>state.rows.slice(row-1,row-1+count).map(r=>r.slice(col-1,col-1+width)),
    setValues:rows=>{if(state.failSaveAfterSubmit&&state.submissions){state.failSaveAfterSubmit=false;throw Error('Simulated ledger write failure')}rows.forEach((r,i)=>{state.rows[row-1+i]=[...r]})},
    createTextFinder:id=>({matchEntireCell(){return this},findNext:()=>{const i=state.rows.findIndex((r,n)=>n>=row-1&&r[col-1]===id);return i<0?null:{getRow:()=>i+1}}})
  })};
  const spreadsheet={getSheetByName:()=>sheet,insertSheet:()=>sheet};let locked=false;const nonces=new Map();
  const ctx=vm.createContext({ console:{log(){}}, Date:class extends Date{static now(){return state.now}},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v),deleteProperty:k=>properties.delete(k)})},
    FormApp:{openById:()=>form,getActiveForm:()=>form}, SpreadsheetApp:{openById:()=>spreadsheet,flush(){}},
    LockService:{getScriptLock:()=>({tryLock:()=>{locked=true;return true},waitLock:()=>{locked=true},hasLock:()=>locked,releaseLock:()=>{locked=false}})},
    CacheService:{getScriptCache:()=>({get:k=>nonces.get(k),put:(k,v)=>nonces.set(k,v)})},
    Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_algo,v)=>Array.from(createHash('sha256').update(v).digest()),computeHmacSha256Signature:(v,k)=>Array.from(createHmac('sha256',k).update(v).digest())},
    ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({setMimeType:()=>text})}
  });
  vm.runInContext(fs.readFileSync(new URL('../integrations/google-apps-script/Code.gs',import.meta.url),'utf8'),ctx);
  const raw=envelope=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(envelope),length:Buffer.byteLength(JSON.stringify(envelope))}}));
  const signed=(action,id,extra={},overrides={})=>{
    const payload=JSON.stringify({version:1,action,requestId:id,sentAt:state.now,nonce:randomUUID(),...extra,...overrides});
    return {payload,signature:createHmac('sha256',secret).update(payload).digest('hex')};
  };
  const invoke=(action,id,extra={},overrides={})=>raw(signed(action,id,extra,overrides));
  const mockFetch=async(url,init={})=>{
    const target=String(url);
    if(target.includes('siteverify')){state.turnstileCalls++;return Response.json({success:state.turnstile,hostname:state.hostname,action:state.action})}
    if(target===env.GOOGLE_APPS_SCRIPT_URL){state.googleCalls++;const response=raw(JSON.parse(init.body));if(state.responseLost&&JSON.parse(JSON.parse(init.body).payload).action==='submit')throw Error('lost response');if(state.redirects){state.nextRedirect=response;return new Response(null,{status:302,headers:{Location:'https://script.googleusercontent.com/macros/echo?test=1'}})}return Response.json(response)}
    if(target.startsWith('https://script.googleusercontent.com/')){assert.equal(init.method,'GET');assert.equal(init.body,undefined);return Response.json(state.nextRedirect)}
    if(target==='https://api.resend.com/emails'){state.emailCalls++;assert.match(init.headers['Idempotency-Key'],/^primeview-contact\//);if(state.emailThrows)throw Error('lost email response');return Response.json(state.emailOk?{id:'email-test-id'}:{message:'test failure'},{status:state.emailOk?200:502})}
    throw Error('Unexpected external request: '+target);
  };
  return {state,ctx,raw,signed,invoke,mockFetch,properties};
}

test('all 63 missing-field combinations, whitespace, and supported options',()=>{
  for(let mask=1;mask<64;mask++)for(const empty of ['', '   ']){
    const values={...contact};const expected=[];fields.forEach((f,i)=>{if(mask&(1<<i)){values[f]=empty;expected.push(f)}});
    assert.deepEqual(validateContact(values).errors.map(e=>e.field),expected);
  }
  for(const profile of profiles)for(const service of services)assert.deepEqual(validateContact({...contact,profile,service}).errors,[]);
  assert.equal(validateContact(contact).values.phone,'+5527987654321');
});
test('invalid formats, unavailable services, type and size limits',()=>{
  for(const bad of [{name:'123'},{name:'a'.repeat(101)},{email:'x@@example.com'},{email:' x y@example.com '},{phone:'27999999999'},{phone:'123'},{phone:'+1 212 555 0100'},{phone:'abc27987654321'},{profile:'Inventado'},{service:'Imagens aéreas — em breve'},{service:'Visualização com IA — em breve'},{message:'x'.repeat(2001)},{name:new Blob(['file'])}])assert(validateContact({...contact,...bad}).errors.length);
  assert.deepEqual(validateContact({...contact,name:'Érica D’Ávila',phone:'+55 (27) 98765-4321'}).errors,[]);
});
test('Apps Script validation agrees with shared validation',()=>{
  const g=googleFixture();for(const profile of profiles)for(const service of services){const values={...contact,profile,service};assert.deepEqual(JSON.parse(JSON.stringify(g.ctx.pvValidate(values))),validateContact(values).values)}
  for(const field of fields)assert.throws(()=>g.ctx.pvValidate({...contact,[field]:' '}));
});
test('HMAC, freshness, replay and tampering rejected before submission',()=>{
  const g=googleFixture();const id=randomUUID();const envelope=g.signed('submit',id,{values:contact});
  assert.equal(g.raw({...envelope,signature:'0'.repeat(64)}).ok,false);
  assert.equal(g.raw({...envelope,payload:envelope.payload.replace('Maria','Outra')}).ok,false);
  assert.equal(g.invoke('health',id,{}, {sentAt:g.state.now-300001}).ok,false);
  assert.equal(g.invoke('health',id,{}, {sentAt:g.state.now+300001}).ok,false);
  const health=g.signed('health',id);assert.equal(g.raw(health).ok,true);assert.equal(g.raw(health).code,'replay');assert.equal(g.state.submissions,0);
});
test('Google idempotency and changed request payload',()=>{
  const g=googleFixture(),id=randomUUID();const data={values:contact,mailFrom:'PrimeView <onboarding@resend.dev>',mailTo:'primeviewfilmes@gmail.com'};
  const first=g.invoke('submit',id,data);assert.equal(first.ok,true);assert(first.googleResponseId);
  assert.equal(g.invoke('submit',id,data).googleResponseId,first.googleResponseId);assert.equal(g.state.submissions,1);
  assert.equal(g.invoke('submit',id,{...data,values:{...contact,message:'Different'}}).code,'request_conflict');assert.equal(g.state.submissions,1);
});
test('uncertain Forms submission is never blindly resubmitted',()=>{
  const g=googleFixture(),id=randomUUID();g.state.failSubmit=true;const data={values:contact,mailFrom:'PrimeView <onboarding@resend.dev>',mailTo:'primeviewfilmes@gmail.com'};
  assert.equal(g.invoke('submit',id,data).code,'verification_pending');g.state.failSubmit=false;assert.equal(g.invoke('submit',id,data).code,'verification_pending');assert.equal(g.state.submissions,1);
});
test('email lease, persistent success, and 23-hour automatic retry cutoff',()=>{
  const g=googleFixture(),id=randomUUID();g.invoke('submit',id,{values:contact,mailFrom:'PrimeView <onboarding@resend.dev>',mailTo:'primeviewfilmes@gmail.com'});
  assert.equal(g.invoke('claim_email',id).emailState,'claimed');assert.equal(g.invoke('claim_email',id).emailState,'sending');
  g.state.now+=23*3600000+1;assert.equal(g.invoke('claim_email',id).emailState,'expired');
  g.invoke('email_result',id,{delivered:true,emailId:'confirmed-id'});g.invoke('email_result',id,{delivered:false});assert.equal(g.invoke('claim_email',id).emailState,'sent');
});
test('Forms success followed by ledger failure requires verified reconciliation',()=>{
  const g=googleFixture(),id=randomUUID();g.state.failSaveAfterSubmit=true;
  const data={values:contact,mailFrom:'PrimeView <onboarding@resend.dev>',mailTo:'primeviewfilmes@gmail.com'};
  assert.equal(g.invoke('submit',id,data).code,'verification_pending');
  assert.equal(g.state.responses.size,1);assert.equal(g.invoke('submit',id,data).code,'verification_pending');assert.equal(g.state.submissions,1);
  g.properties.set('RECONCILE_REQUEST_ID',id);g.properties.set('RECONCILE_RESPONSE_ID','form-response-1');g.ctx.reconciliarSolicitacao();
  assert.equal(g.invoke('submit',id,data).googleResponseId,'form-response-1');assert.equal(g.state.submissions,1);
});

async function sendContact(overrides={},config=env,headers={}){
  const data=new FormData();Object.entries({...contact,requestId:randomUUID(),website:'','cf-turnstile-response':'test-token',...overrides}).forEach(([k,v])=>data.set(k,v));
  return onRequestPost({request:new Request('https://primeview.test/api/contact',{method:'POST',body:data,headers}),env:config});
}
test('Cloudflare full flow + signed Apps Script + Resend, no actual network',async t=>{
  const g=googleFixture();t.mock.method(globalThis,'fetch',g.mockFetch);g.state.redirects=true;const id=randomUUID();
  const response=await sendContact({requestId:id});assert.equal(response.status,200);assert.deepEqual(await response.json(),{success:true,status:'recorded',requestId:id,notification:'sent',message:'Solicitação registrada com sucesso.'});
  assert.equal((await sendContact({requestId:id})).status,200);assert.equal(g.state.submissions,1);assert.equal(g.state.emailCalls,1);
});
test('invalid form, origin, captcha and missing configuration never reach Google',async t=>{
  const g=googleFixture();t.mock.method(globalThis,'fetch',g.mockFetch);
  for(const fields of [{name:''},{service:'Outro não permitido'},{phone:'123'},{requestId:'bad'},{website:'spam'},{'cf-turnstile-response':''}])assert.equal((await sendContact(fields)).status,400);
  assert.equal((await sendContact({},{})).status,503);assert.equal((await sendContact({},env,{Origin:'https://attacker.test'})).status,403);
  g.state.hostname='wrong.test';assert.equal((await sendContact()).status,400);g.state.hostname='primeview.test';g.state.action='wrong';assert.equal((await sendContact()).status,400);
  assert.equal(g.state.googleCalls,0);assert.equal(g.state.emailCalls,0);
});
test('body limits include requests without Content-Length',async()=>{
  const response=await onRequestPost({request:new Request('https://primeview.test/api/contact',{method:'POST',body:'x'.repeat(17000)}),env});assert.equal(response.status,400);
});

test('Google diagnostics expose only allowlisted codes, never upstream error text',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  const g=googleFixture();
  for(const upstream of ['authentication','configuration','private-secret-and-client-data']) {
    const mock=t.mock.method(globalThis,'fetch',async(url,init)=>String(url)===env.GOOGLE_APPS_SCRIPT_URL?Response.json({ok:false,code:upstream}):g.mockFetch(url,init));
    const response=await sendContact();assert.equal(response.status,503);
    assert.equal((await response.json()).code,'verification_pending');
    assert.deepEqual(logs.at(-1),['contact_google_failure',{code:upstream.startsWith('private-')?'unexpected':upstream}]);
    assert(!JSON.stringify(logs).includes('private-secret-and-client-data'));
    assert.equal(g.state.submissions,0);assert.equal(g.state.emailCalls,0);
    mock.mock.restore();
  }
});

test('configuration diagnostics identify fields without logging secrets or client data',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  for(const [field,value] of [['TURNSTILE_SECRET_KEY',undefined],['TURNSTILE_EXPECTED_HOSTNAME',undefined],['GOOGLE_APPS_SCRIPT_URL','https://invalid.test/private'],['GOOGLE_FORMS_SHARED_SECRET','private-invalid-value']]) {
    const response=await sendContact({}, {...env,[field]:value});
    assert.equal(response.status,503);
    const diagnostic=logs.at(-1);
    assert.equal(diagnostic[0],'contact_configuration');
    assert.equal(diagnostic[1].issues.length,1);
    assert(diagnostic[1].issues[0].startsWith(field+':'));
    const output=JSON.stringify(diagnostic);
    for(const sensitive of [secret,contact.name,contact.email,'private-invalid-value','https://invalid.test/private']) assert(!output.includes(sensitive));
    const body=await response.json();assert.equal(body.code,'unavailable');assert.equal(body.issues,undefined);
  }
});
test('Google failure is not reported as success; lost response retry deduplicates',async t=>{
  const g=googleFixture();t.mock.method(globalThis,'fetch',g.mockFetch);g.state.responseLost=true;const id=randomUUID();
  assert.equal((await sendContact({requestId:id})).status,503);assert.equal(g.state.emailCalls,0);g.state.responseLost=false;
  assert.equal((await sendContact({requestId:id})).status,200);assert.equal(g.state.submissions,1);
});
test('Google record survives email failure and recovery only resends the email',async t=>{
  const g=googleFixture();t.mock.method(globalThis,'fetch',g.mockFetch);g.state.emailOk=false;const id=randomUUID();
  const response=await sendContact({requestId:id});assert.equal(response.status,200);assert.equal((await response.json()).notification,'pending');assert.equal(g.state.submissions,1);
  g.state.emailOk=true;assert.equal(await notifyContact(env,id),'sent');assert.equal(g.state.submissions,1);assert.equal(g.state.emailCalls,2);
});
test('lost email response retains lease and pending status',async t=>{
  const g=googleFixture();t.mock.method(globalThis,'fetch',g.mockFetch);g.state.emailThrows=true;const id=randomUUID();
  assert.equal((await(await sendContact({requestId:id})).json()).notification,'pending');assert.equal(await notifyContact(env,id),'pending');assert.equal(g.state.emailCalls,1);
});
test('HTML login pages, wrong correlation, and unsafe redirects are rejected',async t=>{
  const id=randomUUID();t.mock.method(globalThis,'fetch',async()=>new Response('<html>Sign in</html>'));await assert.rejects(()=>callGoogle(env,'health',id));
  globalThis.fetch=async()=>Response.json({ok:true,requestId:randomUUID()});await assert.rejects(()=>callGoogle(env,'health',id));
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://attacker.test/collect'}});await assert.rejects(()=>callGoogle(env,'health',id));
});

test('ntfy replaces Resend, sends no client data, and confirmed retries do not notify twice',async t=>{
  const g=googleFixture(), id=randomUUID(), config={...env,RESEND_API_KEY:undefined,NTFY_TOPIC:'test-only-topic'};
  let calls=0;
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    if(String(url)==='https://ntfy.sh/test-only-topic') {
      calls++;assert.equal(init.redirect,'error');
      assert.equal(init.body,'Nova solicitação de orçamento recebida. Consulte a planilha.');
      return Response.json({id:'ntfy-test-id',event:'message',topic:config.NTFY_TOPIC});
    }
    return g.mockFetch(url,init);
  });
  assert.equal((await(await sendContact({requestId:id},config)).json()).notification,'sent');
  assert.equal((await(await sendContact({requestId:id},config)).json()).notification,'sent');
  assert.equal(calls,1);assert.equal(g.state.submissions,1);assert.equal(g.state.emailCalls,0);
});

test('ntfy failure, malformed acknowledgement, and timeout preserve the Google record',async t=>{
  for(const mode of ['failure','malformed','timeout']) {
    const g=googleFixture(),id=randomUUID(),config={...env,RESEND_API_KEY:undefined,NTFY_TOPIC:'test-only-topic'};
    let calls=0;
    const mock=t.mock.method(globalThis,'fetch',async(url,init)=>{
      if(String(url).startsWith('https://ntfy.sh/')) {
        calls++;
        if(mode==='timeout') throw Error('timeout');
        return mode==='failure'?new Response('',{status:429}):Response.json({id:'wrong-ack'});
      }
      return g.mockFetch(url,init);
    });
    const response=await sendContact({requestId:id},config);
    assert.equal(response.status,200);assert.equal((await response.json()).notification,'pending');
    assert.equal(g.state.submissions,1);assert.equal(g.state.emailCalls,0);
    if(mode!=='failure') { assert.equal(await notifyContact(config,id),'pending');assert.equal(calls,1); }
    mock.mock.restore();
  }
});

test('missing notification provider or invalid ntfy topic does not block Forms or publish',async t=>{
  const g=googleFixture();t.mock.method(globalThis,'fetch',g.mockFetch);
  for(const topic of [undefined,'bad/topic','with spaces','a'.repeat(65)]) {
    const response=await sendContact({}, {...env,RESEND_API_KEY:undefined,NTFY_TOPIC:topic});
    assert.equal(response.status,200);assert.equal((await response.json()).notification,'pending');
  }
  assert.equal(g.state.submissions,4);assert.equal(g.state.emailCalls,0);
});
