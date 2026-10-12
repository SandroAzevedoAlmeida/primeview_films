import {publishNtfyJson,type GoogleEnv} from '../../src/lib/server/google-forms.ts';
export const onRequestPost=async({request,env}:{request:Request;env:GoogleEnv})=>{
 const reply=(body:object,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'')??'';
 if(Date.now()>1791848438461||!/^[a-f0-9]{64}$/.test(token))return reply({code:'denied'},403);
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!=='e172ce241a895eb561e6bbdc8af4c4db7e142df0b0614f4a459baa2c77fb017a')return reply({code:'denied'},403);
 const r=await publishNtfyJson(env);return reply({code:r.code,httpStatus:r.httpStatus,providerCode:r.providerCode,retryAfterSeconds:r.retryAfterSeconds});
};
