// Owner-only Cloudflare Web Analytics bridge. No site visitor identities or credentials are exposed.
import {createClient} from "npm:@supabase/supabase-js@2";
const allowedOrigins=new Set(["https://rizsim.com","https://www.rizsim.com"]);
const siteTag="bbe4dd77adef43dea492690b53ec6779";
const graph="https://api.cloudflare.com/client/v4/graphql";
const zone="Asia/Karachi";
const headers={"Cache-Control":"private, no-store, max-age=0","Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Vary":"Origin"};
const dt=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"});
const day=(date:Date)=>{const p=dt.formatToParts(date);const get=(t:string)=>p.find(x=>x.type===t)?.value||"00";return get("year")+"-"+get("month")+"-"+get("day")};
const addDays=(dayKey:string,n:number)=>new Date(Date.parse(dayKey+"T00:00:00Z")+n*86400000).toISOString().slice(0,10);
const midnightUtc=(d:string)=>new Date(Date.parse(d+"T00:00:00Z")-5*3600000).toISOString();
const safe=(v:unknown)=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 const cors={"Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin",...(allowedOrigins.has(origin)?{"Access-Control-Allow-Origin":origin}:{})};
 const h={...headers,...cors};
 const fail=(status:number,message:string)=>Response.json({error:message},{status,headers:h});
 if(req.method==="OPTIONS")return allowedOrigins.has(origin)?new Response(null,{status:204,headers:cors}):fail(403,"Origin denied.");
 if(req.method!=="POST")return fail(405,"Method not allowed.");
 if(origin&&!allowedOrigins.has(origin))return fail(403,"Origin denied.");
 const authorization=req.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/.test(authorization))return fail(401,"Sign in required.");
 try{
  const url=Deno.env.get("SUPABASE_URL")||"";
  const key=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")||"";
  if(!url||!key)return fail(503,"Authentication configuration unavailable.");
  const client=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const auth=await client.auth.getUser();
  if(auth.error||!auth.data?.user)return fail(401,"Sign in required.");
  // Database is the source of truth for Owner status; client role flags are never trusted.
  const owner=await client.rpc("is_rizsim_owner");
  if(owner.error||owner.data!==true)return fail(403,"Owner access required.");
  const apiToken=Deno.env.get("CLOUDFLARE_ANALYTICS_API_TOKEN")||"";
  const account=Deno.env.get("CLOUDFLARE_ACCOUNT_ID")||"";
  if(!apiToken||!/^[a-f0-9]{32}$/i.test(account))return Response.json({configured:false,reason:"missing_cloudflare_credentials"},{headers:h});
  const today=day(new Date());
  const start=addDays(today,-29),next=addDays(today,1);
  // RUM pageload events are site-tag scoped (not Cloudflare zone request counters).
  // UTC hourly buckets are regrouped to PKT dates; 30d requires <= 744 hourly groups.
  const query=`query RizSimWebAnalytics($accountTag: string!, $siteTag: string!, $since: Time!, $until: Time!){
    viewer { accounts(filter:{accountTag:$accountTag}){
      hourly:rumPageloadEventsAdaptiveGroups(limit:1000,filter:{siteTag:$siteTag,datetime_geq:$since,datetime_lt:$until},orderBy:[datetimeHour_ASC]){
        count sum{visits} dimensions{datetimeHour}
      }
      byPath:rumPageloadEventsAdaptiveGroups(limit:100,filter:{siteTag:$siteTag,datetime_geq:$since,datetime_lt:$until},orderBy:[count_DESC]){
        count dimensions{requestPath}
      }
    } }
  }`;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),13000);
  let res:Response;
  try{res=await fetch(graph,{method:"POST",headers:{"Authorization":"Bearer "+apiToken,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({query,variables:{accountTag:account,siteTag,since:midnightUtc(start),until:midnightUtc(next)}}),signal:controller.signal});}
  finally{clearTimeout(timeout);}
  if(!res.ok){console.error("Owner RUM API status",res.status);return fail(502,"Cloudflare analytics API is unavailable.");}
  const json=await res.json();
  if(json?.errors?.length){console.error("Owner RUM GraphQL error",json.errors.map((e:{message?:string})=>String(e.message||"GraphQL error").slice(0,180)));return fail(502,"Cloudflare analytics query unavailable; confirm API access and account configuration.");}
  const list=json?.data?.viewer?.accounts;
  if(!Array.isArray(list)||list.length!==1)return fail(502,"Cloudflare account unavailable for the configured token.");
  const buckets=new Map<string,{date:string,visits:number,pageViews:number}>();
  for(let i=0;i<30;i++){const d=addDays(start,i);buckets.set(d,{date:d,visits:0,pageViews:0});}
  const hourly=list[0].hourly;
  if(!Array.isArray(hourly)||hourly.length>=1000)return fail(502,"Analytics hourly aggregation incomplete; narrower range required.");
  for(const item of hourly){
   const timestamp=Date.parse(String(item?.dimensions?.datetimeHour||""));
   if(!Number.isFinite(timestamp))continue;
   const bucket=buckets.get(day(new Date(timestamp)));
   if(bucket){bucket.visits+=safe(item?.sum?.visits);bucket.pageViews+=safe(item?.count);}
  }
  const daily=Array.from(buckets.values()).map(v=>({...v,visits:Math.round(v.visits),pageViews:Math.round(v.pageViews)}));
  const totals=(xs:typeof daily)=>xs.reduce((a,b)=>({visits:a.visits+b.visits,pageViews:a.pageViews+b.pageViews}),{visits:0,pageViews:0});
  const rawPaths=list[0].byPath;
  const paths=new Map<string,number>();
  if(Array.isArray(rawPaths))for(const entry of rawPaths){
   const raw=String(entry?.dimensions?.requestPath||"").split("?")[0];
   if(!["/","/index.html","/about.html","/simulations.html","/contact.html"].includes(raw))continue;
   const path=raw==="/index.html"?"/":raw;
   paths.set(path,(paths.get(path)||0)+safe(entry?.count));
  }
  const pages=Array.from(paths,([path,pageViews])=>({path,pageViews:Math.round(pageViews)})).sort((a,b)=>b.pageViews-a.pageViews);
  return Response.json({configured:true,generatedAt:new Date().toISOString(),timezone:zone,daily,pages,totals:{today:totals(daily.slice(-1)),week:totals(daily.slice(-7)),month:totals(daily)}},{headers:h});
 }catch(_){console.error("Owner website analytics request failed");return fail(503,"Website analytics could not be loaded right now.");}
});
