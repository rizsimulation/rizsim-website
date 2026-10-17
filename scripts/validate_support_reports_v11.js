/* Pure source-level guardrails for Fix 1; no production credentials or data. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const student=read('access-in.html'),portal=read('access-out.html'),support=read('rizsim-support.js'),css=read('rizsim-support.css'),migration=read('sql/support_reports_v11.sql');
for(const [name,html] of [['Student',student],['Faculty/Owner',portal]]){
 assert.match(html,/href="rizsim-support.css"/,name+' support CSS');
 assert.match(html,/src="rizsim-support.js"/,name+' support logic');
 assert.match(html,/id="view-contact"/,name+' contact view');
}
assert.match(support,/rizsimulation@gmail\.com/);
assert.match(support,/href='mailto:'/);
assert.match(support,/\.from\('rizsim_support_reports'\)\.insert\(\{category:select\.value,message\}\)/);
assert.match(support,/window\.RizSimSupport=\{/);
assert.match(support,/showOwnerOnly\(role\)/);
assert.match(support,/btn\.hidden=role!=='owner'/);
assert.match(support,/\.rpc\('is_rizsim_owner'\)/);
assert.match(portal,/if\(tab === "reports" && currentMembership\?\.role !== "owner"\) return;/);
assert.match(portal,/window\.RizSimSupport\?\.showOwnerOnly\(role\)/);
assert.match(migration,/enable row level security/);
assert.match(migration,/revoke all on public\.rizsim_support_reports from public, anon, authenticated/);
assert.match(migration,/grant insert \(category,message\)/);
assert.match(migration,/grant update \(status\)/);
assert.match(migration,/for insert to authenticated[\s\S]*\(select auth\.uid\(\)\) = reporter_id/);
assert.match(migration,/for select to authenticated using \(\(select private\.is_rizsim_owner\(\)\)\)/);
assert.doesNotMatch(migration,/grant delete/i);
assert.doesNotMatch(support,/innerHTML\s*=/);
assert.doesNotMatch(support,/service_role|sb_secret_/i);
assert.match(css,/\.rz-support-panel/);
console.log('Support V11 static cross-workspace and RLS contract checks passed.');
