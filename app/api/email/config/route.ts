import { access } from '@/lib/auth';
import { emailConfig } from '@/lib/email/policy';
import { verifySegment, ResendError } from '@/lib/email/resend';
import { isWorkspace } from '@/lib/workspaces';
export async function GET(request:Request){
 const session=await access();if(!session.ok)return Response.json({error:session.error},{status:session.status});
 const workspace=new URL(request.url).searchParams.get('workspace')||'';
 if(!isWorkspace(workspace))return Response.json({error:'Unknown workspace'},{status:400});
 const config=emailConfig(workspace);
 if(new URL(request.url).searchParams.get('verify')==='1' && config) {
  try {const segmentName=await verifySegment(config);return Response.json({configured:true,verified:true,from:config.from,segmentName},{headers:{'Cache-Control':'private, no-store'}});} catch(e){return Response.json({configured:true,verified:false,from:config.from,error:e instanceof ResendError?e.message:'Could not verify Resend.'},{status:503});}
 }
 return Response.json({configured:!!config,from:config?.from||null,segmentConfigured:!!config?.segmentId},{headers:{'Cache-Control':'private, no-store'}});
}
