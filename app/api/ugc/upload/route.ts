import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { access } from "@/lib/auth";

const pathPattern=/^ugc-source\/(foxyavenue|shapes-and-pieces)\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;
export async function POST(request:Request) {
  let body:HandleUploadBody;
  try {const raw=await request.text();if(raw.length>12000)return Response.json({error:"Request too large."},{status:413});body=JSON.parse(raw) as HandleUploadBody;}
  catch{return Response.json({error:"Invalid upload request."},{status:400});}
  if(body.type==='blob.generate-client-token' && request.headers.get('origin')!==new URL(request.url).origin)
    return Response.json({error:"Invalid request origin."},{status:403});
  try {
    const result=await handleUpload({body,request,onBeforeGenerateToken:async(pathname,clientPayload)=>{
      const session=await access();if(!session.ok)throw new Error("Sign in to upload product photos.");
      const match=pathPattern.exec(pathname);
      if(!match||clientPayload!==match[1])throw new Error("Invalid product image path.");
      return {allowedContentTypes:["image/jpeg","image/png","image/webp"],maximumSizeInBytes:10*1024*1024,addRandomSuffix:true};
    }});
    return Response.json(result,{headers:{"Cache-Control":"private, no-store"}});
  } catch {return Response.json({error:"Image upload failed. Check the Blob store and try again."},{status:400});}
}
