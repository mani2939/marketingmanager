import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { videoDraft, generationPrompt, publicHttpsUrl } from "../lib/ugc/policy";

test("video concepts require a real public HTTPS image and preserve a separate brand", () => {
  const concept={workspace:"foxyavenue",title:"Necklace close-up",imageUrl:"https://foxyavenue.com/products/necklace.jpg",motionPrompt:"Hand gently tilts the necklace toward the light.",hook:"The sparkle in daylight",voiceover:"Look at this detail.",caption:"Our new necklace. #FoxyAvenue"};
  assert.equal(videoDraft.safeParse(concept).success,true);
  for(const imageUrl of ["http://example.com/a.jpg","https://localhost/a.jpg","https://127.0.0.1/a.jpg","https://user:pass@example.com/a.jpg","https://internal.local/a.jpg"])
    assert.equal(videoDraft.safeParse({...concept,imageUrl}).success,false,imageUrl);
  assert.equal(videoDraft.safeParse({...concept,workspace:"other"}).success,false);
  assert.equal(publicHttpsUrl("https://cdn.muapi.ai/clip.mp4"),true);
  assert.match(generationPrompt({motion_prompt:concept.motionPrompt,hook:concept.hook}),/9:16.*5 seconds/);
});

test("video jobs isolate brands and claim generation only once", async () => {
  const {PGlite}=await import("@electric-sql/pglite"); const db=new PGlite();
  try {
    await db.exec(await readFile("db/005_ugc_videos.sql","utf8"));
    const id="10000000-0000-4000-8000-000000000001";
    await db.query("INSERT INTO ugc_videos(id,workspace,title,image_url,motion_prompt,hook,voiceover,caption) VALUES ($1,'foxyavenue','A','https://example.com/a.jpg','Move the camera','Hook','','Caption')",[id]);
    const claim=()=>db.query("UPDATE ugc_videos SET state='submitting' WHERE id=$1 AND workspace='foxyavenue' AND state='draft' RETURNING id",[id]);
    assert.equal((await claim()).rows.length,1);
    assert.equal((await claim()).rows.length,0);
    assert.equal((await db.query("SELECT * FROM ugc_videos WHERE id=$1 AND workspace='shapes-and-pieces'",[id])).rows.length,0);
  } finally {await db.close();}
});

test("Muapi uses the fixed image-to-video endpoint and only returns a valid video output",async(t)=>{
  process.env.MUAPI_API_KEY="test-key";
  const {submitVideo,videoResult,trustedOutputUrl}=await import("../lib/ugc/muapi");
  const calls:{url:string;init:RequestInit}[]=[];
  t.mock.method(globalThis,"fetch",async (url:string,init:RequestInit)=>{
    calls.push({url,init});
    return Response.json(calls.length===1?{request_id:"job-123"}:{status:"completed",outputs:["https://cdn.muapi.ai/video.mp4"]});
  });
  const job=await submitVideo({image_url:"https://foxyavenue.com/jewel.jpg",motion_prompt:"Gently rotate the necklace in daylight.",hook:"Look at this detail"});
  assert.equal(job,"job-123");
  assert.equal(calls[0].url,"https://api.muapi.ai/api/v1/wan2.2-image-to-video");
  assert.equal(new Headers(calls[0].init.headers).get("x-api-key"),"test-key");
  const body=JSON.parse(String(calls[0].init.body));
  assert.equal(body.aspect_ratio,"9:16");assert.equal(body.duration,5);
  assert.deepEqual(await videoResult(job),{status:"completed",output:"https://cdn.muapi.ai/video.mp4"});
  assert.equal(trustedOutputUrl("https://cdn.muapi.ai/video.mp4"),true);
  assert.equal(trustedOutputUrl("https://unknown.example/video.mp4"),false);
});
