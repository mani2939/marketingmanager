import { z } from 'zod';
import { access } from '@/lib/auth';
import { readyDatabase } from '@/lib/db';
import { emailConfig, validSchedule } from '@/lib/email/policy';
import { createBroadcast, ResendError, verifySegment } from '@/lib/email/resend';
import { isWorkspace } from '@/lib/workspaces';
const schema=z.object({workspace:z.enum(['foxyavenue','shapes-and-pieces']),contentId:z.string().uuid(),mode:z.enum(['now','schedule'])});
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export const maxDuration=60;
export async function GET(request:Request){
 const session=await access();if(!session.ok)return reply({error:session.error},session.status);
 const workspace=new URL(request.url).searchParams.get('workspace')||'';
 if(!isWorkspace(workspace))return reply({error:'Unknown workspace'},400);
 try{const sql=await readyDatabase();const records=await sql`SELECT content_id AS "contentId",resend_id AS "resendId",state,subject,sender,scheduled_at AS "scheduledAt",last_error AS "lastError",created_at AS "createdAt" FROM email_dispatches WHERE workspace=${workspace} ORDER BY created_at DESC LIMIT 100`;
 return reply(records);}catch{return reply({error:'Could not load broadcast history.'},503);}
}
export async function POST(request:Request){
 const session=await access();if(!session.ok)return reply({error:session.error},session.status);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid request origin'},403);
 let data:unknown;try{const text=await request.text();if(text.length>1000)return reply({error:'Request too large'},413);data=JSON.parse(text);}catch{return reply({error:'Invalid request'},400);}
 const parsed=schema.safeParse(data);if(!parsed.success)return reply({error:'Invalid campaign or website.'},400);
 const {workspace,contentId,mode}=parsed.data,config=emailConfig(workspace);
 if(!config)return reply({error:'Configure Resend API key, verified sender and this website’s segment in Vercel first.'},503);
 let sql;try{sql=await readyDatabase();}catch{return reply({error:'Database unavailable.'},503);}

 try{
 const [row]=await sql`SELECT title,body,scheduled_at FROM marketing_content WHERE id=${contentId} AND workspace=${workspace} AND kind='email'`;
 if(!row)return reply({error:'Save the campaign draft in this website first.'},404);
 if(!row.title.trim()||!row.body.trim())return reply({error:'Add a subject and message before sending.'},400);
 if(mode==='schedule'&&!validSchedule(row.scheduled_at))return reply({error:'Save a planned date at least one minute in the future.'},400);
 }catch{return reply({error:'Could not read this campaign.'},503);}
 // Fail before recording an attempt if the segment is missing or the API key cannot read it.
 try{await verifySegment(config);}catch(e){return reply({error:e instanceof ResendError?e.message:'Could not verify the Resend segment.'},503);}
 let claimed=false;let snapshot:{title:string;body:string;scheduledAt:string|null}|null=null;
 try{await sql.begin(async tx=>{
 const [row]=await tx`SELECT title,body,scheduled_at FROM marketing_content WHERE id=${contentId} AND workspace=${workspace} AND kind='email' FOR UPDATE`;
 if(!row||!row.title.trim()||!row.body.trim())return;
 const scheduledAt=mode==='schedule'?validSchedule(row.scheduled_at):null;
 if(mode==='schedule'&&!scheduledAt)return;
 snapshot={title:row.title,body:row.body,scheduledAt};
 const result=await tx`INSERT INTO email_dispatches(content_id,workspace,state,subject,sender,segment_id,scheduled_at) VALUES(${contentId},${workspace},'submitting',${row.title},${config.from},${config.segmentId},${scheduledAt}) ON CONFLICT(content_id) DO NOTHING RETURNING content_id`;
 claimed=result.length>0;
 });}catch{return reply({error:'Could not save the send attempt.'},503);}
 if(!claimed)return reply({error:'This campaign was already submitted or changed. Refresh before trying again; do not resend an uncertain campaign.'},409);
 if(!snapshot)return reply({error:'Campaign changed; save and try again.'},409);
 const current=snapshot as {title:string;body:string;scheduledAt:string|null};
 try{
 const id=await createBroadcast(config,{subject:current.title,body:current.body,scheduledAt:current.scheduledAt});
 await sql`UPDATE email_dispatches SET resend_id=${id},state=${current.scheduledAt?'scheduled':'queued'},updated_at=now() WHERE content_id=${contentId} AND workspace=${workspace}`;
 return reply({id,state:current.scheduledAt?'scheduled':'queued',scheduledAt:current.scheduledAt});
 }catch(e){
 const rejected=e instanceof ResendError&&e.rejected;
 const message=e instanceof ResendError?e.message:'Resend returned an uncertain result. Check Resend before creating another campaign.';
 try{await sql`UPDATE email_dispatches SET state=${rejected?'rejected':'unknown'},last_error=${message},updated_at=now() WHERE content_id=${contentId} AND workspace=${workspace}`;}catch{}
 return reply({error:message,uncertain:!rejected},rejected?422:502);
 }
}
