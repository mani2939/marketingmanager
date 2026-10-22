import 'server-only';
import type { EmailConfig } from './policy';
export class ResendError extends Error { constructor(public rejected:boolean, public code:'auth'|'quota'|'segment'|'other'='other'){super(code==='auth'?'Resend rejected the API key.':code==='quota'?'Resend quota or rate limit reached.':code==='segment'?'The configured Resend segment was not found or cannot be accessed.':'Resend could not complete the request.');} }
async function call(path:string,config:EmailConfig,init:RequestInit={}) {
 let response:Response;
 try{response=await fetch(`https://api.resend.com${path}`,{...init,headers:{Authorization:`Bearer ${config.key}`,...init.headers},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});}catch{throw new ResendError(false);}
 let data:Record<string,unknown>={};try{data=await response.json();}catch{}
 if(!response.ok) throw new ResendError(response.status<500,response.status===401||response.status===403?'auth':response.status===429?'quota':response.status===404?'segment':'other');
 return data;
}
export async function verifySegment(config:EmailConfig) {const data=await call(`/segments/${encodeURIComponent(config.segmentId)}`,config);if(data.id!==config.segmentId)throw new ResendError(true,'segment');return typeof data.name==='string'?data.name:'Selected segment';}
export async function createBroadcast(config:EmailConfig,input:{subject:string;body:string;scheduledAt:string|null}) {
 const {renderBroadcast}=await import('./policy');
 const message=renderBroadcast(input.body);
 const data=await call('/broadcasts',config,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({segment_id:config.segmentId,from:config.from,subject:input.subject,...message,send:true,...(input.scheduledAt?{scheduled_at:input.scheduledAt}:{})})});
 if(typeof data.id!=='string'||!data.id)throw new ResendError(false);
 return data.id;
}
export async function getBroadcast(config:EmailConfig,id:string) {const data=await call(`/broadcasts/${encodeURIComponent(id)}`,config);return typeof data.status==='string'?data.status:'unknown';}
