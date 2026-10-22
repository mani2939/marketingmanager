import type { WorkspaceId } from '../workspaces';
export type EmailConfig = { key:string; from:string; segmentId:string };
export function emailConfig(workspace: WorkspaceId, env: Record<string, string | undefined> = process.env): EmailConfig | null {
 const suffix=workspace==='foxyavenue'?'FOXYAVENUE':'SHAPES_AND_PIECES';
 const key=env.RESEND_API_KEY,from=env[`RESEND_FROM_${suffix}`],segmentId=env[`RESEND_SEGMENT_ID_${suffix}`];
 if(!key||!from||!segmentId||!/^.+ <[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$/.test(from)||!/^[0-9a-f-]{36}$/i.test(segmentId)) return null;
 return {key,from,segmentId};
}
export function renderBroadcast(message:string) {
 const escaped=message.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
 return {html:`<main><p>${escaped.replace(/\r?\n/g,'<br>')}</p><p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p></main>`,text:`${message}\n\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`};
}
export function validSchedule(value:string|Date|null,now=Date.now()) {
 if(!value) return null;
 const date=new Date(value).getTime();
 return Number.isFinite(date)&&date>now+60000?new Date(date).toISOString():null;
}
