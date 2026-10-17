/* Bounded adapter over the portal's existing authenticated client. No credentials are exported. */
(function () {
 'use strict';
 window.createRizSimCourseService = function ({client, snapshot, refresh, closeSession}) {
  const kinds = new Set(['own','purchased','simulation']);
  const mimeByExt = {pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
  const message = error => error?.message || 'RizSim could not complete this operation. Please retry.';
  const identity=()=>String(snapshot()?.userId||'')+':'+String(snapshot()?.role||'');
  function unchanged(who){if(identity()!==who)throw new Error('Your account changed. Reopen this course before continuing.');}
  async function rpc(name,args) {
   const who=identity();
   const {data,error} = await client.rpc(name,args);
   unchanged(who);
   if(error) throw new Error(message(error));
   if(data===null || data===undefined) throw new Error('The server did not confirm the operation.');
   return data;
  }
  function scope(kind,id) {
   if(!kinds.has(kind)||!id) throw new Error('Choose an authorized course or session first.');
   if(!['faculty','course_lead'].includes(snapshot()?.role)) throw new Error('Active Faculty access is required.');
   if(kind==='own'&&snapshot().role!=='course_lead') throw new Error('Course Lead access is required.');
  }
  function url(raw) {
   const value=String(raw||'').trim();
   if(value.length>2048||/[\u0000-\u0020\u007f\\]/.test(value)) return null;
   try {
    const u=new URL(value);
    if(!['https:','http:'].includes(u.protocol)||u.username||u.password||!u.hostname.includes('.')||u.hostname.endsWith('.')) return null;
    return u.href;
   } catch (_) {return null;}
  }
  async function inspectFile(file) {
   if(!file||file.size<=0||file.size>25*1024*1024) throw new Error('Choose a non-empty file up to 25 MB.');
   if(file.name.length>240) throw new Error('Use a filename no longer than 240 characters.');
   const ext=file.name.split('.').pop().toLowerCase(), mime=mimeByExt[ext];
   if(!mime) throw new Error('Choose a PDF, PNG or JPEG. These formats work with the protected viewer.');
   const b=new Uint8Array(await file.slice(0,8).arrayBuffer());
   const valid=mime==='application/pdf' ? [37,80,68,70,45].every((x,i)=>b[i]===x)
    : mime==='image/png' ? [137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x) : b[0]===255&&b[1]===216&&b[2]===255;
   if(!valid) throw new Error('The file content does not match its extension. Choose a valid PDF or image.');
   return {mime,ext};
  }
  return Object.freeze({
   validURL:url, inspectFile,
   purchased:()=>rpc('get_my_rizsim_purchased_courses',{}),
   sessionScope:id=>rpc('get_rizsim_session_runtime_scope',{p_session_id:id}),
   course:(kind,id)=>{scope(kind,id);return rpc('get_rizsim_course_runtime',{p_kind:kind,p_course_id:id});},
   resources:id=>{scope('simulation',id);return rpc('get_rizsim_session_resources',{p_session_id:id});},
   async publish(kind,id,resourceId,published) {
    scope(kind,id);
    const data=await rpc('set_rizsim_resource_publication',{p_kind:kind,p_scope_id:id,p_resource_id:resourceId,p_published:!!published});
    if(String(data.id)!==String(resourceId)||data.published_to_class!==!!published) throw new Error('Publication was not confirmed. Refresh the resource list.');
    return data;
   },
   async save(kind,id,draft) {
    const who=identity();
    scope(kind,id);
    if(kind==='purchased') throw new Error('Publisher content is read-only.');
    const title=String(draft.title||'').trim(),description=String(draft.description||'').trim();
    if(!title||title.length>200||description.length>2000) throw new Error('Enter a title up to 200 characters and a description up to 2000 characters.');
    if(!['student_handout','reading','slides','worksheet','external_link','other'].includes(draft.type)) throw new Error('Select a resource type.');
    const delivery=draft.file?(draft.delivery_mode||'secure_view'):'secure_view';
     if(!['secure_view','downloadable'].includes(delivery))throw new Error('Choose Secure View or Downloadable for the file.');
     const payload={title,description,material_type:draft.type,source_type:draft.file?'file':'link',delivery_mode:delivery};
    draft.id ||= crypto.randomUUID();
    if(draft.file) {
     const {mime}=await inspectFile(draft.file);unchanged(who);
     const safeName=draft.file.name.replace(/[^a-zA-Z0-9._-]/g,'-').replace(/\.\./g,'-');
     draft.path ||= (kind==='own'?id+'/':'sessions/'+id+'/')+draft.id+'-'+safeName;
     if(!draft.uploaded) {
      const {error}=await client.storage.from('course-materials').upload(draft.path,draft.file,{upsert:false,cacheControl:'0',contentType:mime});
      if(error) throw new Error(message(error));
      draft.uploaded=true;unchanged(who);
     }
     Object.assign(payload,{storage_path:draft.path,file_name:draft.file.name,mime_type:mime,file_size:draft.file.size});
    } else {
     payload.external_url=url(draft.url);
     if(!payload.external_url) throw new Error('Paste a complete valid web link beginning with https:// or http://.');
    }
    unchanged(who);
    const data=await rpc('create_rizsim_runtime_resource',{p_kind:kind,p_scope_id:id,p_resource_id:draft.id,p_data:payload});
    if(String(data.id)!==draft.id||data.published_to_class!==true||data.delivery_mode!==delivery) throw new Error('The server did not confirm the chosen file access. Refresh before retrying.');
    draft.saved=true;
    return data;
   },
   async discard(kind,id,draft) {
    if(!draft?.uploaded||draft.saved||!draft.path) return;
    // A timed-out insert may have succeeded: never remove a file that now has a library entry.
    const table=kind==='own'?'rizsim_course_materials':'rizsim_session_resources';
    try {
     const {data,error}=await client.from(table).select('id').eq('id',draft.id).maybeSingle();
     if(error||data) return;
     await client.storage.from('course-materials').remove([draft.path]);
    } catch (_) { /* Do not delete on an uncertain read. Unreferenced files stay private. */ }
   },
   async createPurchased(id,productId,fields) {
    scope('purchased',id);
    const data=await rpc('create_rizsim_purchased_course_session',{p_course_id:id,p_product_id:productId,...fields});
    await refresh(); return data;
   },
   refresh, close:closeSession
  });
 };
})();
