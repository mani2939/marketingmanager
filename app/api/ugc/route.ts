import { randomUUID } from "node:crypto";
import { access } from "@/lib/auth";
import { readyDatabase } from "@/lib/db";
import { videoDraft } from "@/lib/ugc/policy";
import { isWorkspace } from "@/lib/workspaces";

const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request) {
  const session=await access(); if(!session.ok) return reply({error:session.error},session.status);
  const workspace=new URL(request.url).searchParams.get('workspace')||'';
  if(!isWorkspace(workspace)) return reply({error:'Unknown website.'},400);
  try {
    const sql=await readyDatabase();
    const videos=await sql`SELECT id,workspace,title,image_url AS "imageUrl",motion_prompt AS "motionPrompt",hook,voiceover,caption,state,video_url AS "videoUrl",error,created_at AS "createdAt",updated_at AS "updatedAt" FROM ugc_videos WHERE workspace=${workspace} ORDER BY created_at DESC LIMIT 50`;
    return reply({videos,configured:Boolean(process.env.MUAPI_API_KEY)});
  } catch { return reply({error:'Video library is unavailable. Check the database migration.'},503); }
}
export async function POST(request:Request) {
  const session=await access(); if(!session.ok) return reply({error:session.error},session.status);
  if(request.headers.get('origin')!==new URL(request.url).origin) return reply({error:'Invalid request origin.'},403);
  let value:unknown;
  try { const body=await request.text(); if(body.length>10000)return reply({error:'Request too large.'},413); value=JSON.parse(body); }
  catch { return reply({error:'Invalid request.'},400); }
  const parsed=videoDraft.safeParse(value);
  if(!parsed.success)return reply({error:parsed.error.issues[0].message},400);
  const d=parsed.data,id=randomUUID();
  try {
    const sql=await readyDatabase();
    await sql`INSERT INTO ugc_videos(id,workspace,title,image_url,motion_prompt,hook,voiceover,caption) VALUES(${id},${d.workspace},${d.title},${d.imageUrl},${d.motionPrompt},${d.hook},${d.voiceover},${d.caption})`;
    return reply({id},201);
  } catch {return reply({error:'Could not save video concept.'},503);}
}
