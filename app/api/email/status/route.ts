import { access } from '@/lib/auth';
import { readyDatabase } from '@/lib/db';
import { emailConfig } from '@/lib/email/policy';
import { getBroadcast, ResendError } from '@/lib/email/resend';
import { isWorkspace } from '@/lib/workspaces';
export async function POST(request:Request){
 const session=await access();if(!session.ok)return Response.json({error:session.error},{status:session.status});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid request origin'},{status:403});
 const url=new URL(request.url),workspace=url.searchParams.get('workspace')||'',contentId=url.searchParams.get('contentId')||'';
 if(!isWorkspace(workspace)||!zUuid.test(contentId))return Response.json({error:'Invalid campaign or website'},{status:400});
 const config=emailConfig(workspace);if(!config)return Response.json({error:'Resend is not configured.'},{status:503});
 try{const sql=await readyDatabase();const [record]=await sql`SELECT resend_id FROM email_dispatches WHERE content_id=${contentId} AND workspace=${workspace}`;
 if(!record?.resend_id)return Response.json({error:'No Resend receipt. Check the Resend dashboard for this campaign.'},{status:409});
 const raw=await getBroadcast(config,record.resend_id);
 const state=['scheduled','queued','sent','canceled'].includes(raw)?raw:raw==='draft'?'canceled':'unknown';
 await sql`UPDATE email_dispatches SET state=${state},updated_at=now() WHERE content_id=${contentId} AND workspace=${workspace}`;
 return Response.json({state},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return Response.json({error:e instanceof ResendError?e.message:'Could not refresh the broadcast status.'},{status:503});}
}
const zUuid=/^[0-9a-f-]{36}$/i;
