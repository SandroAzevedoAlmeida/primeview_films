import {publishNtfyJson,callGoogle,type GoogleEnv} from '../../src/lib/server/google-forms.ts';
export const onRequestPost=async({request,env}:{request:Request;env:GoogleEnv})=>{
 const reply=(body:object,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'')??'';
 if(Date.now()>1791849800559||!/^[a-f0-9]{64}$/.test(token))return reply({code:'denied'},403);
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!=='e160291734450a48cad19e5473ea275c3df31562d0e18926b012f3d17a1933c5')return reply({code:'denied'},403);
 try{await callGoogle(env,'health',crypto.randomUUID());}catch{return reply({code:'google_health_failed'});}
 const result=await publishNtfyJson(env);
 return reply({code:result.code,httpStatus:result.httpStatus,googleHealth:true});
};
