"use client";
import { useEffect, useState } from "react";
import { Clapperboard, Copy, ExternalLink, Film, ImagePlus, LoaderCircle, Play, RefreshCw, Sparkles } from "lucide-react";
import { workspaces, type WorkspaceId } from "@/lib/workspaces";

type Video = {id:string;title:string;imageUrl:string;motionPrompt:string;hook:string;voiceover:string;caption:string;state:string;videoUrl:string|null;error:string|null;createdAt:string};
const presets = [
  {name:"The unboxing",hook:"Wait until you see the detail on this piece.",prompt:"A hand gently lifts the jewellery from its box, turning it toward natural window light. Subtle handheld camera movement and a close-up on the real stones and setting.",voice:"I just opened this and the detail is even prettier in person."},
  {name:"The close-up",hook:"The sparkle looks different in daylight.",prompt:"Slow handheld push-in on the jewellery resting on a neutral linen surface. Light catches its real stones, then a hand carefully picks it up. Natural movement and realistic texture.",voice:"Here is a proper close-up so you can see the stones and finish."},
  {name:"The styling moment",hook:"The piece that finishes the whole look.",prompt:"A person holds the actual jewellery beside a simple outfit and turns it gently to show its details. Warm natural light, casual phone-video movement, true-to-photo product appearance.",voice:"I would wear this with a simple outfit and let the jewellery do the talking."},
];
const empty={title:"",imageUrl:"",motionPrompt:presets[0].prompt,hook:presets[0].hook,voiceover:presets[0].voice,caption:""};

export function UgcStudio({site,demo}:{site:WorkspaceId;demo:boolean}) {
  const [form,setForm]=useState(empty),[videos,setVideos]=useState<Video[]>([]),[configured,setConfigured]=useState(false);
  const [busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
  async function load(){
    if(demo)return;
    try {const res=await fetch(`/api/ugc?workspace=${site}`,{cache:"no-store"});const data=await res.json();if(!res.ok)throw new Error(data.error);setVideos(data.videos);setConfigured(data.configured);setError("");}
    catch(e){setError(e instanceof Error?e.message:"Could not load the video library.");}
  }
  useEffect(()=>{void load();},[site,demo]);
  async function action(path:string,payload:unknown){
    const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await response.json();if(!response.ok)throw new Error(data.error||"The request failed.");return data;
  }
  async function create(){
    setError("");setNotice("");setBusy("create");
    try {await action('/api/ugc',{...form,workspace:site});setForm(empty);setNotice("Concept saved. Review it below before spending credits on generation.");await load();}
    catch(e){setError(e instanceof Error?e.message:"Could not save concept.");}
    finally{setBusy("");}
  }
  async function generate(video:Video){
    if(!window.confirm(`Generate a 5-second video for “${video.title}”? Muapi may charge your account. Check the product photo and prompt first.`))return;
    setBusy(video.id);setError("");
    try{await action('/api/ugc/generate',{workspace:site,id:video.id});setNotice("Generation started. Use Refresh status to retrieve the clip when it is ready.");await load();}
    catch(e){setError(e instanceof Error?e.message:"Could not start generation.");await load();}
    finally{setBusy("");}
  }
  async function refresh(video:Video){
    setBusy(video.id);setError("");
    try{const result=await action('/api/ugc/sync',{workspace:site,id:video.id});setNotice(result.state==='ready'?"Clip saved to your video library.":"Still rendering. Check again in a moment.");await load();}
    catch(e){setError(e instanceof Error?e.message:"Could not refresh status.");await load();}
    finally{setBusy("");}
  }
  async function copy(value:string){try{await navigator.clipboard.writeText(value);setNotice("Copied to clipboard.");}catch{setError("Clipboard unavailable; select and copy the text instead.");}}
  async function uploadPhoto(file:File){
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024){setError("Choose a JPEG, PNG or WebP image under 10 MB.");return;}
    setBusy("upload");setError("");setNotice("");
    try{
      const {upload}=await import("@vercel/blob/client");
      const extension=file.type==='image/jpeg'?"jpg":file.type==='image/png'?"png":"webp";
      const blob=await upload(`ugc-source/${site}/${crypto.randomUUID()}.${extension}`,file,{access:"public",handleUploadUrl:"/api/ugc/upload",clientPayload:site});
      setForm(f=>({...f,imageUrl:blob.url}));setNotice("Product photo uploaded. Save the concept when the text is ready.");
    }catch{setError("Photo upload failed. Check the Vercel Blob connection or paste a public image URL.");}
    finally{setBusy("");}
  }
  return <section className="ugc-studio">
    <div className="ugc-hero"><div><span className="eyebrow">{workspaces[site].name.toUpperCase()} · CREATOR STUDIO</span><h3>From product photo to social clip</h3><p>Start with your real product image. Shape a natural UGC moment, generate a vertical video, review it, then prepare your TikTok and Instagram post.</p></div><div className="ugc-hero-icon"><Film size={42}/></div></div>
    <div className="ugc-steps"><span><b>01</b> Product photo</span><span><b>02</b> UGC concept</span><span><b>03</b> Generate & review</span><span><b>04</b> Post to socials</span></div>
    <div className="ugc-layout"><div className="card ugc-form"><h3><ImagePlus size={20}/> Create a concept</h3><p>Use a public HTTPS image link. A portrait product image gives the best 9:16 result.</p>
      <div className="ugc-presets" aria-label="Creative starting points">{presets.map(p=><button type="button" key={p.name} onClick={()=>setForm(f=>({...f,hook:p.hook,motionPrompt:p.prompt,voiceover:p.voice}))}>{p.name}</button>)}</div>
      <label>Product name<input value={form.title} maxLength={120} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Gold layered necklace"/></label>
      <label>Upload product photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={demo||Boolean(busy)} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadPhoto(file);e.currentTarget.value="";}}/></label>
      <label>Or paste a public image URL<input type="url" value={form.imageUrl} onChange={e=>setForm(f=>({...f,imageUrl:e.target.value}))} placeholder="https://foxyavenue.com/.../product.jpg"/></label>
      {form.imageUrl.startsWith('https://')&&<div className="ugc-image-preview"><img src={form.imageUrl} alt="Product source preview" onError={e=>{e.currentTarget.style.display='none'}}/></div>}
      <label>Opening hook<input value={form.hook} maxLength={300} onChange={e=>setForm(f=>({...f,hook:e.target.value}))}/></label>
      <label>Motion direction<textarea rows={4} maxLength={1500} value={form.motionPrompt} onChange={e=>setForm(f=>({...f,motionPrompt:e.target.value}))}/></label>
      <label>Voiceover script (record separately)<textarea rows={3} maxLength={2000} value={form.voiceover} onChange={e=>setForm(f=>({...f,voiceover:e.target.value}))}/></label>
      <label>Post caption<textarea rows={3} maxLength={2200} value={form.caption} onChange={e=>setForm(f=>({...f,caption:e.target.value}))} placeholder="What makes this piece special? Add a clear next step and relevant hashtags."/></label>
      <p className="ugc-help">The generated clip has no voiceover, captions, or music baked in. Add them in your editing or social app after download. Review product accuracy before posting.</p>
      <button className="button primary" disabled={demo||Boolean(busy)} onClick={create}>{busy==='create'?<LoaderCircle className="spin" size={16}/>:<Sparkles size={16}/>} Save concept</button>
      {demo&&<p className="ugc-help">Sign in to save and generate videos. Demo mode cannot send paid generation requests.</p>}
    </div><aside className="ugc-guide"><h3>Designed for social</h3><p><b>9:16 vertical</b><br/>A 5-second 720p product clip, ready to edit into a longer reel.</p><p><b>Keep it genuine</b><br/>Use your own product photo, avoid invented details, and label AI-generated media where required by each platform.</p><p><b>Publishing</b><br/>Download the MP4, record your voiceover and add text or music in TikTok or Instagram. This studio currently prepares assets; it does not publish automatically.</p><p><b>Connection</b><br/>{configured?"Muapi key detected. Generation is available when storage is connected.":"Add MUAPI_API_KEY and a Vercel Blob store to enable generation."}</p></aside></div>
    {error&&<p className="notice" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
    <div className="ugc-library-header"><h3>Your video library</h3><p>{videos.length} concept{videos.length===1?'':'s'} · saved for this website</p></div>
    {!videos.length?<div className="card ugc-empty">No concepts yet. Add a product photo above to start.</div>:<div className="ugc-library">{videos.map(v=><article className="card ugc-video" key={v.id}><div className="ugc-media">{v.videoUrl?<video controls playsInline preload="metadata" src={v.videoUrl}/>:<img src={v.imageUrl} alt={v.title}/>}</div><div className="ugc-details"><div className="ugc-title-row"><h4>{v.title}</h4><span className={`ugc-state ${v.state}`}>{v.state}</span></div><p className="ugc-hook">“{v.hook}”</p><p><b>Voiceover</b> {v.voiceover||"Add a voiceover after download."}</p><p><b>Caption</b> {v.caption}</p>{v.error&&<p className="ugc-error">{v.error}</p>}<div className="ugc-actions">{v.state==='draft'&&<button className="button primary" disabled={!configured||Boolean(busy)} onClick={()=>generate(v)}><Play size={15}/> Generate clip</button>}{['rendering','failed'].includes(v.state)&&<button className="button secondary" disabled={Boolean(busy)} onClick={()=>refresh(v)}><RefreshCw size={15} className={busy===v.id?'spin':''}/> Refresh status</button>}{v.videoUrl&&<><a className="button secondary" href={v.videoUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Open MP4</a><button className="button secondary" onClick={()=>copy(v.caption)}><Copy size={15}/> Copy caption</button></>}</div></div></article>)}</div>}
  </section>;
}
