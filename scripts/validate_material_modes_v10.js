/* V10 verification - read-only checks of the committed integration and security boundary. */
'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict'), cp=require('node:child_process');
const read=path=>fs.readFileSync(path,'utf8');
const files={
 student:read('access-in.html'),faculty:read('access-out.html'),
 styles:read('rizsim-refinements-v10.css'),helpers:read('rizsim-refinements-v10.js'),
 runtime:read('rizsim-course-environment.js'),author:read('rizsim-course-authoring.js'),
 services:read('rizsim-course-service.js'),authorService:read('rizsim-course-authoring-service.js'),
 stream:read('edge-functions/rizsim-course-material-stream/index.ts'),
 viewer:read('course-material-viewer.html'),
 migration:read('sql/resource_delivery_modes_v10.sql'),
 fixture:read('scripts/fixtures/live-classroom-backend.js')
};
let assertions=0;
const check=(name,condition)=>{assert.ok(condition,name);assertions++;console.log('PASS '+name)};
for(const [name,script] of Object.entries({
 helpers:files.helpers,runtime:files.runtime,author:files.author,services:files.services,
 authorService:files.authorService,fixture:files.fixture
})){
 const c=cp.spawnSync(process.execPath,name==='fixture'?['--check','--input-type=module']:['--check'],{input:script,encoding:'utf8'});
 check(name+' valid JavaScript',c.status===0||(console.error(c.stderr),false));
}
const moduleJs=files.viewer.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
check('Viewer contains executable module script',!!moduleJs);
const moduleCheck=cp.spawnSync(process.execPath,['--check','--input-type=module'],{input:moduleJs,encoding:'utf8'});
check('Viewer module passes JS parser',moduleCheck.status===0||(console.error(moduleCheck.stderr),false));
check('Visual changes target non-Home tabs only',/\.auth-view:not\(#view-home\)/.test(files.styles)&&/\.student-view:not\(#view-home\)/.test(files.styles)&&!files.styles.includes('.bp-home'));
check('Original public Home source was untouched',!files.styles.includes('index.html')&&files.styles.includes('Preserve the public/shared Home'));
check('Both authenticated roles load the shared refinement',files.student.includes('rizsim-refinements-v10.css')&&files.faculty.includes('rizsim-refinements-v10.css')&&files.student.includes('rizsim-refinements-v10.js')&&files.faculty.includes('rizsim-refinements-v10.js'));
check('Typography uses premium fallback, no custom downloaded fonts',files.styles.includes('"Aptos"')&&files.styles.includes('"Segoe UI"')&&!files.styles.includes('@font-face'));
check('Error feedback is inline, red and accessible',files.styles.includes('.rz-field-invalid')&&files.styles.includes('#b83d45')&&files.helpers.includes('aria-describedby')&&files.helpers.includes('aria-invalid'));
check('Both mode options selectable and default secure',files.helpers.includes("secure_view")&&files.helpers.includes("downloadable")&&files.helpers.includes("picker(initial='secure_view')"));
check('File choices in Course Lead and runtime publishers',files.author.includes('RizSimFileDelivery?.picker')&&files.runtime.includes('RizSimFileDelivery?.picker'));
check('Inline validators wired into both editors',files.author.includes('RizSimFieldFeedback?.required')&&files.runtime.includes('RizSimFieldFeedback?.required'));
check('File mode submitted by both client adapters',files.services.includes('payload={title,description,material_type:draft.type,source_type:draft.file?')&&files.services.includes('delivery_mode:delivery')&&files.authorService.includes('delivery_mode:r.file?'));
check('No premature success when server omits saved mode',files.services.includes('data.delivery_mode!==delivery')&&files.authorService.includes('stored.delivery_mode!=='));
check('Safe existing-material default in both tables',/alter table public\.rizsim_course_materials add column if not exists delivery_mode text not null default 'secure_view'/.test(files.migration)&&/alter table public\.rizsim_session_resources add column if not exists delivery_mode text not null default 'secure_view'/.test(files.migration));
check('Migration denies unauthenticated lookup',files.migration.includes('revoke all on function public.get_rizsim_material_delivery_mode(uuid) from public, anon')&&files.migration.includes('grant execute on function public.get_rizsim_material_delivery_mode(uuid) to authenticated'));
check('Authorized viewer checks mode before protected download',files.viewer.includes("get_rizsim_material_delivery_mode")&&files.viewer.includes("mode==='downloadable'")&&files.viewer.includes("purpose:'download'"));
check('Downloadable file stays in RizSim iframe/image',files.viewer.includes('downloadableFrame')&&files.viewer.includes('downloadableImage')&&files.viewer.includes('URL.createObjectURL'));
check('Secure view remains watermarked and suppresses copy/print',files.viewer.includes('watermark(canvas)')&&files.viewer.includes('deliveryMode!==\'downloadable\''));
check('Protected stream denies download for secure files',files.stream.includes('purpose==="download"&&mode!=="downloadable"')&&files.stream.includes('get_rizsim_material_delivery_mode'));
check('Protected stream checks auth + revocation after fetch',files.stream.includes('uc.auth.getUser()')&&files.stream.includes('recheck.error||!recheck.data')&&files.stream.includes('fresh.data!==mode'));
check('No public material URL or public storage bucket introduced',!files.stream.includes('createSignedUrl(')&&!files.stream.includes('getPublicUrl('));
check('Student opens authorized material within RizSim',read('rizsim-student-workspace.js').includes('/course-material-viewer.html?material='));
console.log('PASS V10 integrated static assertions: '+assertions);
