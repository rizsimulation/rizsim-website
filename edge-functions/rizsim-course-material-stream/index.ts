// Existing authenticated stream, extended with a strictly bound standalone-session source.
import {createClient} from "npm:@supabase/supabase-js@2";
const origins=new Set(["https://rizsim.com","https://www.rizsim.com"]);
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 const cors={"Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin",...(origins.has(origin)?{"Access-Control-Allow-Origin":origin}:{})};
 const h={...cors,"Cache-Control":"private,no-store,max-age=0","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
 const fail=(s:number,msg:string)=>Response.json({error:msg},{status:s,headers:h});
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return fail(405,"Method not allowed.");
 if(origin&&!origins.has(origin))return fail(403,"Origin denied.");
 const authorization=req.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/i.test(authorization))return fail(401,"Sign in required.");
 let id="";
 try{id=String((await req.json())?.material_id||"").trim();}catch{return fail(400,"Invalid request.");}
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return fail(400,"Invalid material ID.");
 try{
  const url=Deno.env.get("SUPABASE_URL");
  const pk=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY");
  const sk=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!pk||!sk)return fail(500,"Configuration unavailable.");
  const uc=createClient(url,pk,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const identity=await uc.auth.getUser();
  if(identity.error||!identity.data?.user)return fail(401,"Session expired.");
  const context=await uc.rpc("get_rizsim_course_material_view_context",{p_material_id:id}).maybeSingle();
  if(context.error||!context.data)return fail(403,"Course material access denied.");
  if(context.data.source_type!=="file")return fail(400,"Not an uploaded file.");
  const sc=createClient(url,sk,{auth:{persistSession:false,autoRefreshToken:false}});
  const course=await sc.from("rizsim_course_materials").select("course_id,storage_path,source_type,mime_type,active").eq("id",id).eq("active",true).maybeSingle();
  if(course.error)return fail(404,"File unavailable.");
  let material=course.data;
  let expectedPrefix=context.data.course_id+"/";
  if(!material){
   const session=await sc.from("rizsim_session_resources").select("session_id,storage_path,source_type,mime_type").eq("id",id).maybeSingle();
   if(session.error||!session.data)return fail(404,"File unavailable.");
   material={...session.data,course_id:session.data.session_id,active:true};
   expectedPrefix="sessions/"+context.data.course_id+"/";
  }
  if(!material||material.source_type!=="file"||material.course_id!==context.data.course_id||!material.storage_path?.startsWith(expectedPrefix)||material.storage_path.includes(".."))return fail(403,"Invalid file binding.");
  const mime=String(material.mime_type||context.data.mime_type||"").toLowerCase();
  if(!["application/pdf","image/png","image/jpeg"].includes(mime))return fail(415,"Secure preview requires PDF or an image.");
  const file=await sc.storage.from("course-materials").download(material.storage_path);
  if(file.error||!file.data)return fail(404,"File not found.");
  // A revoke during download must not be ignored. No public URLs or long-lived signed links.
  const recheck=await uc.rpc("get_rizsim_course_material_view_context",{p_material_id:id}).maybeSingle();
  if(recheck.error||!recheck.data)return fail(403,"Resource access has been revoked.");
  return new Response(file.data,{status:200,headers:{...h,"Content-Type":mime,"Content-Disposition":"inline","X-Frame-Options":"DENY","X-RizSim-Protected":"course-material"}});
 }catch{console.error("Course stream request failed");return fail(500,"Unable to open file.");}
});
