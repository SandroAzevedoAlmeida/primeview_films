import {callGoogle, type GoogleEnv} from '../../src/lib/server/google-forms.ts';
const expires=1791776232282;
export const onRequestPost=async({request,env}:{request:Request;env:GoogleEnv})=>{
 const reply=(body:object,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'')??'';
 if(Date.now()>expires||!/^[a-f0-9]{64}$/.test(token))return reply({code:'denied',revision:2},403);
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!=='cbab51e5251b1ea28c6beba6dee3bc2112dc7c907807466b0fbf7aad19abb976')return reply({code:'denied'},403);
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(env.NTFY_TOPIC??''))return reply({code:'topic_invalid'});
 let stage='google_health';
 try{
 await callGoogle(env,'health',crypto.randomUUID());
 if(request.headers.get('X-Diagnostic-Mode')==='network'){
 stage='ntfy_health';
 const health=await fetch('https://ntfy.sh/v1/health',{redirect:'manual',signal:AbortSignal.timeout(25000)});
 return reply({stage,status:health.status,code:health.ok?'reachable':'http_error'});
 }
 stage='ntfy_fetch';
 const r=await fetch('https://ntfy.sh/'+env.NTFY_TOPIC,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'text/plain; charset=utf-8',Title:'PrimeView Filmes'},body:'Teste tecnico PrimeView: verificacao do aviso. Nenhum contato novo foi criado.'});
 if(!r.ok)return reply({stage,status:r.status,code:'http_error'});
 stage='ntfy_body';const body=await r.text();
 let data;try{data=JSON.parse(body)}catch{return reply({stage,status:r.status,code:'invalid_json'})}
 return reply({stage,status:r.status,code:'ack',eventIsMessage:data.event==='message',topicMatches:data.topic===env.NTFY_TOPIC,idValid:typeof data.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(data.id)});
 }catch(error){return reply({stage,code:error instanceof Error&&['TypeError','TimeoutError','AbortError'].includes(error.name)?error.name:'failure'})}
};
