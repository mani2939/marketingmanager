import { z } from "zod";
import { access } from "@/lib/auth";
import { readyDatabase } from "@/lib/db";
import { submitVideo, VideoProviderError } from "@/lib/ugc/muapi";
const schema=z.object({workspace:z.enum(['foxyavenue','shapes-and-pieces']),id:z.string().uuid()});
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export const maxDuration=60;
export async function POST(request:Request) {
  const session=await access(); if(!session.ok)return reply({error:session.error},session.status);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid request origin.'},403);
  const data=schema.safeParse(await request.json().catch(()=>null));if(!data.success)return reply({error:'Invalid video.'},400);
  if(!process.env.MUAPI_API_KEY)return reply({error:'Configure MUAPI_API_KEY on the server before generating.'},503);
  const {workspace,id}=data.data;
  let sql;try{sql=await readyDatabase();}catch{return reply({error:'Database unavailable.'},503);}
  const [video]=await sql`UPDATE ugc_videos SET state='submitting',error=NULL,updated_at=now() WHERE id=${id} AND workspace=${workspace} AND state='draft' RETURNING image_url,motion_prompt,hook`;
  if(!video)return reply({error:'This draft was already submitted or does not exist. Create a new draft to generate again.'},409);
  try {
    const job=await submitVideo({image_url:String(video.image_url),motion_prompt:String(video.motion_prompt),hook:String(video.hook)});
    await sql`UPDATE ugc_videos SET state='rendering',provider_job_id=${job},updated_at=now() WHERE id=${id} AND workspace=${workspace}`;
    return reply({state:'rendering'});
  } catch(e) {
    const uncertain=!(e instanceof VideoProviderError)||e.uncertain;
    const error=e instanceof Error?e.message:'The generation result is uncertain; check Muapi before trying again.';
    try {await sql`UPDATE ugc_videos SET state=${uncertain?'uncertain':'failed'},error=${error},updated_at=now() WHERE id=${id} AND workspace=${workspace}`;} catch {}
    return reply({error},uncertain?502:422);
  }
}
