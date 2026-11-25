import { put } from "@vercel/blob";
import { z } from "zod";
import { access } from "@/lib/auth";
import { readyDatabase } from "@/lib/db";
import { trustedOutputUrl, videoResult } from "@/lib/ugc/muapi";
const schema=z.object({workspace:z.enum(['foxyavenue','shapes-and-pieces']),id:z.string().uuid()});
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export const maxDuration=60;
const limit=50*1024*1024;
export async function POST(request:Request) {
  const session=await access();if(!session.ok)return reply({error:session.error},session.status);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid request origin.'},403);
  const data=schema.safeParse(await request.json().catch(()=>null));if(!data.success)return reply({error:'Invalid video.'},400);
  const {workspace,id}=data.data;
  try {
    const sql=await readyDatabase();
    const [row]=await sql`SELECT state,provider_job_id FROM ugc_videos WHERE id=${id} AND workspace=${workspace}`;
    if(!row)return reply({error:'Video not found.'},404);
    if(row.state==='ready')return reply({state:'ready'});
    if(!row.provider_job_id)return reply({error:'No provider job is available for this draft.'},409);
    if(!['rendering','failed','storing'].includes(row.state))return reply({state:row.state},409);
    const result=await videoResult(row.provider_job_id);
    if(result.status==='failed'||result.status==='cancelled') {
      await sql`UPDATE ugc_videos SET state='failed',error='Muapi could not finish this clip.',updated_at=now() WHERE id=${id} AND workspace=${workspace}`;
      return reply({state:'failed'});
    }
    if(!result.output)return reply({state:'rendering'});
    if(!trustedOutputUrl(result.output))return reply({error:'The output host needs review. Add it to MUAPI_OUTPUT_HOSTS after verifying it in Muapi.'},422);
    const [claimed]=await sql`UPDATE ugc_videos SET state='storing',updated_at=now() WHERE id=${id} AND workspace=${workspace} AND (state IN ('rendering','failed') OR (state='storing' AND updated_at<now()-interval '2 minutes')) RETURNING id`;
    if(!claimed)return reply({state:'storing'},409);
    try {
      const response=await fetch(result.output,{redirect:'error',signal:AbortSignal.timeout(45000)});
      if(!response.ok||!response.body||Number(response.headers.get('content-length')||0)>limit)throw new Error('Video download failed or exceeds 50 MB.');
      let bytes=0;
      const bounded=response.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){bytes+=chunk.byteLength;if(bytes>limit)throw new Error('Video exceeds 50 MB.');controller.enqueue(chunk);}}));
      const blob=await put(`ugc/${workspace}/${id}.mp4`,bounded,{access:'public',contentType:'video/mp4',addRandomSuffix:true});
      await sql`UPDATE ugc_videos SET state='ready',video_url=${blob.url},error=NULL,updated_at=now() WHERE id=${id} AND workspace=${workspace}`;
      return reply({state:'ready',videoUrl:blob.url});
    } catch {
      await sql`UPDATE ugc_videos SET state='failed',error='The clip rendered, but could not be saved to Vercel Blob. Check Blob configuration and refresh status.',updated_at=now() WHERE id=${id} AND workspace=${workspace}`;
      return reply({error:'The clip rendered, but storage failed. Check Blob configuration and retry Refresh status.'},503);
    }
  } catch { return reply({error:'Could not refresh this video. Try again later.'},503); }
}
