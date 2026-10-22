"use client";
import { useEffect, useState } from 'react';
import { CalendarDays, Mail, RefreshCw, Send } from 'lucide-react';
import type { ContentItem } from '@/lib/content';
import type { WorkspaceId } from '@/lib/workspaces';
import { workspaces } from '@/lib/workspaces';
type Config={configured:boolean;verified?:boolean;from:string|null;segmentName?:string;error?:string};
type Dispatch={contentId:string;resendId:string|null;state:string;subject:string;sender:string;scheduledAt:string|null;lastError:string|null;createdAt:string};
async function api(url:string,method='GET',body?:unknown){const r=await fetch(url,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'Request failed.');return data;}
const when=(date:string|null)=>date?new Date(date).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'';
export function EmailCampaigns({site,demo,items,compact=false}:{site:WorkspaceId;demo:boolean;items?:ContentItem[];compact?:boolean}){
 const [config,setConfig]=useState<Config|null>(null),[dispatches,setDispatches]=useState<Dispatch[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(''),[loading,setLoading]=useState(true);
 const scope=`workspace=${site}`;
 async function load(){const [c,d]=await Promise.all([api(`/api/email/config?${scope}`),api(`/api/email/dispatch?${scope}`)]);setConfig(c);setDispatches(d);}
 useEffect(()=>{if(demo){setLoading(false);return;}let active=true;Promise.all([api(`/api/email/config?${scope}`),api(`/api/email/dispatch?${scope}`)]).then(([c,d])=>{if(active){setConfig(c);setDispatches(d);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[site,demo,scope]);
 async function action(key:string,fn:()=>Promise<void>){setBusy(key);setError('');setMessage('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Request failed.');}finally{setBusy('');}}
 async function verify(){await action('verify',async()=>{const c=await api(`/api/email/config?${scope}&verify=1`);setConfig(c);setMessage(`Resend can access ${c.segmentName} for ${workspaces[site].name}.`);});}
 async function submit(item:ContentItem,mode:'now'|'schedule'){
 const date=mode==='schedule'&&item.scheduledAt?` on ${when(item.scheduledAt)}`:' now';
 if(!window.confirm(`Send “${item.title}” from ${config?.from} to the ${workspaces[site].name} Resend segment${date}? Confirm the segment contains subscribers who agreed to receive marketing emails.`))return;
 await action(item.id,async()=>{try{const result=await api('/api/email/dispatch','POST',{workspace:site,contentId:item.id,mode});setMessage(mode==='now'?'Broadcast accepted by Resend for sending.':'Broadcast scheduled in Resend for '+when(result.scheduledAt)+'.');}finally{await load();}});
 }
 async function refresh(record:Dispatch){await action(record.contentId,async()=>{try{const d=await api(`/api/email/status?${scope}&contentId=${record.contentId}`,'POST');setMessage(`Resend status: ${d.state}.`);}finally{await load();}});}
 if(demo)return <section className="card email-connect"><h3>Resend email campaigns</h3><p>Sign in to connect a sender and send to your subscribed contacts.</p></section>;
 return <section className="card email-connect">
 <div className="card-header"><div><h3>Resend · {workspaces[site].name}</h3><p>Marketing broadcasts to this brand’s subscribed segment.</p></div><span className={`status ${config?.configured?'planned':'draft'}`}>{config?.configured?'Configured':'Setup required'}</span></div>
 {loading?<p className="email-message">Loading email setup…</p>:<>
 {error&&<div className="notice error-notice" role="alert">{error}</div>}{message&&<div className="notice" role="status">{message}</div>}
 <div className="email-connect-body"><span className="focus-icon"><Mail size={22}/></span><div><strong>{config?.from||'Verified sender needed'}</strong><p>{config?.configured?'Sender and segment are configured. Verify access before sending.':'Set RESEND_API_KEY and this website’s sender and segment ID in Vercel.'}</p></div><button className="button secondary" disabled={!config?.configured||!!busy} onClick={verify}><RefreshCw size={15}/>{busy==='verify'?'Checking…':'Verify connection'}</button></div>
 {!compact&&<div className="email-send-list">{(items||[]).filter(x=>x.kind==='email').map(item=>{
 const record=dispatches.find(d=>d.contentId===item.id);
 const scheduled=!!item.scheduledAt&&Date.parse(item.scheduledAt)>Date.now()+60000;
 return <article className="email-send-row" key={item.id}><div><strong>{item.title}</strong><p>{record?`Resend: ${record.state}${record.scheduledAt?' · '+when(record.scheduledAt):''}`:item.status==='planned'?`Planned in content calendar · ${when(item.scheduledAt)}`:'Saved draft'}</p>{record?.lastError&&<small>{record.lastError}</small>}</div><div className="email-send-actions">{record?<>{record.resendId&&<button className="button secondary" disabled={!!busy} onClick={()=>refresh(record)}><RefreshCw size={14}/>Refresh status</button>}{record.state==='unknown'&&<small>Check Resend before creating another campaign.</small>}</>:<><button className="button secondary" disabled={!config?.configured||!!busy||!item.body.trim()} onClick={()=>submit(item,'now')}><Send size={14}/>Send now</button>{scheduled&&<button className="button primary" disabled={!config?.configured||!!busy||!item.body.trim()} onClick={()=>submit(item,'schedule')}><CalendarDays size={14}/>Schedule in Resend</button>}</>}</div></article>;
 })}</div>}
 {!compact&&<p className="email-message">Resend manages the subscriber list and unsubscribe link. Saved campaign dates in the content calendar do not send emails until you choose Schedule in Resend.</p>}
 </>}
 </section>;
}
