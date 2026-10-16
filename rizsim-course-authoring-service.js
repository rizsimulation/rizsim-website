/* V7 course authoring. The client stays inside the authenticated portal closure.
   Files are staged privately; one server transaction commits a complete course.
   This adapter has no session, results, student or class-publication operations. */
(function () {
  'use strict';
  window.createRizSimCourseAuthoringService = function ({client, snapshot, refresh}) {
    const identity = () => String(snapshot()?.userId || '') + ':' + String(snapshot()?.role || '');
    function guard(who) {
      if (snapshot()?.role !== 'course_lead' || !snapshot()?.userId) throw new Error('Active Course Lead access is required.');
      if (who !== undefined && who !== identity()) throw new Error('Your account changed. Reopen Courses to continue.');
    }
    async function rpc(name, args) {
      guard(); const who = identity();
      const {data, error} = await client.rpc(name, args); guard(who);
      if (error) throw new Error(error.message || 'RizSim could not save your course. Please retry.');
      if (data == null) throw new Error('The server did not confirm the operation. Your draft has been kept.');
      return data;
    }
    const digest = async blob => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map(b => b.toString(16).padStart(2, '0')).join('');
    return Object.freeze({
      list: () => rpc('get_my_rizsim_course_authoring', {p_course_id: null}),
      load: id => rpc('get_my_rizsim_course_authoring', {p_course_id: id}),
      async save(draft, validate, progress = () => {}) {
        guard(); const who = identity();
        if (!draft.title.trim() || draft.title.trim().length > 160 || draft.description.length > 1200) throw new Error('Enter a course title up to 160 characters and description up to 1,200 characters.');
        if (draft.simulations.length > 100 || draft.resources.length > 100) throw new Error('A course can contain up to 100 simulations and 100 resources.');
        const staged = draft.resources.filter(r => r.isNew);
        // No upload is attempted until the entire draft passes client validation.
        for (const r of staged) {
          if (!r.title?.trim() || r.title.length > 200) throw new Error('Every learning resource needs a title of up to 200 characters.');
          if (r.file) { const inspected = await validate.inspectFile(r.file); r.mime_type = inspected.mime; }
          else if (!validate.validURL(r.external_url)) throw new Error('A resource has an invalid web link. Correct it before saving.');
          guard(who);
        }
        if (staged.some(r => r.file)) {
          const ticket = await rpc('prepare_rizsim_course_authoring', {p_course_id: draft.id});
          if (ticket.course_id !== draft.id) throw new Error('The file upload scope could not be verified.');
          for (const r of staged.filter(r => r.file)) {
            guard(who); progress('Uploading ' + r.file.name + '...');
            const safe = r.file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\.\./g, '-');
            r.storage_path ||= draft.id + '/authoring/' + snapshot().userId + '/' + r.id + '/' + safe;
            if (!r.uploaded) {
              const {error} = await client.storage.from('course-materials').upload(r.storage_path, r.file, {upsert:false, cacheControl:'0', contentType:r.mime_type});
              guard(who);
              if (error) {
                // A network timeout may hide a completed upload. Reuse ONLY byte-identical content.
                if (String(error.statusCode || error.status) !== '409' && !/already exists|duplicate/i.test(error.message || '')) throw new Error(error.message || 'File upload failed. Your draft is kept for retry.');
                const existing = await client.storage.from('course-materials').download(r.storage_path); guard(who);
                if (existing.error || !existing.data || await digest(existing.data) !== await digest(r.file)) throw new Error('An upload could not be verified. Keep the draft and retry.');
              }
              r.uploaded = true;
            }
          }
        }
        guard(who); progress(draft.isNew ? 'Publishing course...' : 'Saving changes...');
        const payload = {
          title:draft.title.trim(), description:draft.description.trim(),
          simulations:draft.simulations.map(s => s.product_id),
          keep_resources:draft.resources.filter(r => !r.isNew).map(r => r.id),
          new_resources:staged.map(r => ({id:r.id, title:r.title.trim(), description:r.description || '', material_type:r.material_type,
            source_type:r.file?'file':'link', external_url:r.file?null:validate.validURL(r.external_url), storage_path:r.storage_path || null,
            file_name:r.file?.name || null, mime_type:r.file?r.mime_type:null, file_size:r.file?.size || null}))
        };
        // Stable request ID for an unchanged retry; changing the draft creates a new receipt.
        const serialized = JSON.stringify(payload);
        if (draft.submittedPayload !== serialized) { draft.requestId = crypto.randomUUID(); draft.submittedPayload = serialized; }
        const data = await rpc('save_my_rizsim_course_authoring', {p_course_id:draft.id, p_request_id:draft.requestId,
          p_expected_revision:draft.isNew?null:draft.revision, p_data:payload});
        if (data.course_id !== draft.id || !data.revision) throw new Error('The saved course was not confirmed. Retry without discarding this draft.');
        // Saving is already committed. A refresh failure must not falsely report a failed save.
        try { await refresh(); } catch (_) { /* A normal reload will retrieve the confirmed course. */ }
        guard(who); return data;
      },
      async remove(id, revision) {
        const data = await rpc('delete_my_rizsim_course_authoring', {p_course_id:id, p_expected_revision:revision});
        if (data.course_id !== id || data.deleted !== true) throw new Error('Deletion was not confirmed. Refresh the course list.');
        try { await refresh(); } catch (_) { /* The deletion receipt remains authoritative. */ }
        return data;
      }
    });
  };
})();
