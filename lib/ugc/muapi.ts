import "server-only";
import { generationPrompt, publicHttpsUrl } from "./policy";

const origin = "https://api.muapi.ai/api/v1";
export class VideoProviderError extends Error {
  constructor(public uncertain = false) { super(uncertain ? "The generation request may have reached Muapi. Check its dashboard before trying another generation." : "Muapi could not process the video request. Check the API key, image URL and credits."); }
}
async function call(path:string, init:RequestInit={}) {
  const key=process.env.MUAPI_API_KEY;
  if (!key) throw new VideoProviderError();
  let response: Response;
  try { response=await fetch(`${origin}${path}`,{...init,headers:{"x-api-key":key,...init.headers},redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)}); }
  catch { throw new VideoProviderError(true); }
  let data: Record<string,unknown>;
  try { data=await response.json(); } catch { throw new VideoProviderError(true); }
  if (!response.ok) throw new VideoProviderError(response.status>=500);
  return data;
}
export async function submitVideo(input:{image_url:string;motion_prompt:string;hook:string}) {
  const data=await call("/wan2.2-image-to-video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_url:input.image_url,prompt:generationPrompt(input),aspect_ratio:"9:16",resolution:"720p",quality:"medium",duration:5})});
  if (typeof data.request_id!=="string" || !/^[\w-]{1,200}$/.test(data.request_id)) throw new VideoProviderError(true);
  return data.request_id;
}
export async function videoResult(id:string) {
  if (!/^[\w-]{1,200}$/.test(id)) throw new VideoProviderError();
  const data=await call(`/predictions/${encodeURIComponent(id)}/result`);
  if (!['queued','pending','processing','completed','failed','cancelled'].includes(String(data.status))) throw new VideoProviderError(true);
  const output=Array.isArray(data.outputs) ? data.outputs[0] : data.output_url;
  if (data.status==='completed' && (typeof output !== 'string' || !publicHttpsUrl(output))) throw new VideoProviderError(true);
  return {status:String(data.status),output:data.status==='completed' ? output as string : null};
}

export function trustedOutputUrl(value:string) {
  if (!publicHttpsUrl(value)) return false;
  const allowed=(process.env.MUAPI_OUTPUT_HOSTS || "cdn.muapi.ai").split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(new URL(value).hostname.toLowerCase());
}
