// RIZSIM PHASE 9F TEST HELPER. STAGING-ONLY; NEVER DEPLOY TO PRODUCTION.
// Exercises four fixed synthetic PDF/PNG fixtures. A verified Owner AAL2 JWT is mandatory.
// Files use private staging buckets; the server-only secret key is never returned.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
const EXPECTED_HOST="sqjosrywtevdnkdxflns.supabase.co";
const COURSE="9f1a0911-6b8e-4abc-a32c-09112a000102";
const fixtures=[
  {name:"resource PDF",fn:"rizsim-resource-stream",field:"product_id",id:"9f1a0911-6b8e-4abc-a32c-09112a000101",bucket:"platform-content",path:"phase9f-tests/20261011/owner-private.pdf",mime:"application/pdf",kind:"pdf"},
  {name:"resource PNG",fn:"rizsim-resource-stream",field:"product_id",id:"9f1a0911-6b8e-4abc-a32c-09112a000105",bucket:"platform-content",path:"phase9f-tests/20261011/owner-private.png",mime:"image/png",kind:"png"},
  {name:"course PDF",fn:"rizsim-course-material-stream",field:"material_id",id:"9f1a0911-6b8e-4abc-a32c-09112a000103",bucket:"course-materials",path:COURSE+"/phase9f-tests/owner-teaching.pdf",mime:"application/pdf",kind:"pdf"},
  {name:"course PNG",fn:"rizsim-course-material-stream",field:"material_id",id:"9f1a0911-6b8e-4abc-a32c-09112a000104",bucket:"course-materials",path:COURSE+"/phase9f-tests/owner-teaching.png",mime:"image/png",kind:"png"}
];
function makePdf(){
 const stream="BT /F1 18 Tf 35 135 Td (RizSim Stage 9F - Private PDF Test) Tj ET\nBT /F1 12 Tf 35 100 Td (Synthetic fixture - not real content) Tj ET\n";
 const objs=[null,
   "<< /Type /Catalog /Pages 2 0 R >>",
   "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
   "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 440 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
   "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
   "<< /Length "+stream.length+" >>\nstream\n"+stream+"endstream"
 ];
 let result="%PDF-1.4\n";const offsets=[0];
 for(let i=1;i<objs.length;i++){offsets.push(result.length);result+=i+" 0 obj\n"+objs[i]+"\nendobj\n";}
 const start=result.length;
 result+="xref\n0 "+objs.length+"\n0000000000 65535 f \n";
 for(let i=1;i<offsets.length;i++) result+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
 result+="trailer\n<< /Size "+objs.length+" /Root 1 0 R >>\nstartxref\n"+start+"\n%%EOF\n";
 return new TextEncoder().encode(result);
}
const PNG_B64="iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGMUqixkYGBgYmBgYGBgAAALmwEAVnoKyAAAAABJRU5ErkJggg==";
const pngBytes=Uint8Array.from(atob(PNG_B64), c=>c.charCodeAt(0));
const pdfBytes=makePdf();
function dataFor(f){return f.kind==="pdf"?pdfBytes:pngBytes;}
async function sha(bytes){
 const hash=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
}
const baseHeaders={
 "Cache-Control":"private, no-store, max-age=0",
 "X-Content-Type-Options":"nosniff",
 "Referrer-Policy":"no-referrer",
 "Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type",
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Vary":"Origin"
};
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin")||"";
 const headers={...baseHeaders,...(origin==="null"?{"Access-Control-Allow-Origin":"null"}:{})};
 const reply=(data,status=200)=>Response.json(data,{status,headers});
 if(origin&&origin!=="null")return reply({error:"Origin not approved for this staging test."},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply({error:"Method not allowed."},405);
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/i.test(bearer))return reply({error:"Authenticated staging user required."},401);
 let url;
 try{url=Deno.env.get("SUPABASE_URL")||"";if(new URL(url).hostname!==EXPECTED_HOST)throw Error();}catch{return reply({error:"Wrong Supabase environment; request stopped."},503);}
 const pk=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY");
 const sk=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!pk||!sk)return reply({error:"Missing stage service configuration."},503);
 const user=createClient(url,pk,{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
 const who=await user.auth.getUser();
 if(who.error||!who.data?.user)return reply({error:"Sign-in required."},401);
 const isOwner=await user.rpc("is_rizsim_owner");
 if(isOwner.error||isOwner.data!==true)return reply({error:"Active Owner session with AAL2 required."},403);
 let action;
 try{action=(await req.json())?.action;}catch{return reply({error:"Invalid request."},400);}
 if(action!=="seed"&&action!=="probe")return reply({error:"Unknown action."},400);
 const admin=createClient(url,sk,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
   if(action==="seed"){
     const outcome=[];
     for(const f of fixtures){
       const content=dataFor(f);
       const r=await admin.storage.from(f.bucket).upload(f.path,content,{upsert:false,contentType:f.mime,cacheControl:"0"});
       if(r.error){
         const old=await admin.storage.from(f.bucket).download(f.path);
         if(old.error||!old.data||await sha(new Uint8Array(await old.data.arrayBuffer()))!==await sha(content))throw Error("Fixture conflict");
         outcome.push({fixture:f.name,result:"already exists; identical SHA256"});
       }else outcome.push({fixture:f.name,result:"uploaded"});
     }
     return reply({stage_only:true,success:true,fixtures:outcome});
   }
   const results=[];
   for(const f of fixtures){
     const response=await fetch(url+"/functions/v1/"+f.fn,{
       method:"POST",
       headers:{authorization:bearer,apikey:pk,"Content-Type":"application/json"},
       body:JSON.stringify({[f.field]:f.id})
     });
     const body=new Uint8Array(await response.arrayBuffer());
     const checksumOk=response.status===200&&await sha(body)===await sha(dataFor(f));
     const mimeOk=(response.headers.get("content-type")||"").toLowerCase().startsWith(f.mime);
     const marker=response.headers.get("x-rizsim-protected");
     const protectedOk=marker===(f.field==="product_id"?"true":"course-material");
     results.push({fixture:f.name,http_status:response.status,content_type_ok:mimeOk,checksum_ok:checksumOk,protected_header_ok:protectedOk,
       pass:response.status===200&&mimeOk&&checksumOk&&protectedOk});
   }
   // The stream receives no Origin on this server-to-server test.
   // Browser-origin enforcement is NOT considered tested by these results.
   const bad=await fetch(url+"/functions/v1/rizsim-course-material-stream",{
     method:"POST",headers:{authorization:bearer,apikey:pk,"Content-Type":"application/json"},body:JSON.stringify({material_id:"invalid-uuid"})
   });
   const unauth=await fetch(url+"/functions/v1/rizsim-course-material-stream",{
     method:"POST",headers:{apikey:pk,"Content-Type":"application/json"},body:JSON.stringify({material_id:fixtures[2].id})
   });
   const publicObject=await fetch(url+"/storage/v1/object/public/platform-content/"+fixtures[0].path);
   const denials={invalid_id_status:bad.status,without_login_status:unauth.status,private_storage_public_url_status:publicObject.status,
     pass:bad.status===400&&unauth.status!==200&&publicObject.status!==200};
   return reply({stage_only:true,files:results,denials,pass:results.every(x=>x.pass)&&denials.pass,
     scope:"Server-side stream bytes, MIME, and negative access probes only. Browser origin pending."});
 }catch{return reply({error:"Staging stream probe failed; do not approve release."},500);}
});