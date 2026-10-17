/* Fix 2: lock ordinary Faculty promotion to its role and keep Course Lead editor private. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const html = read('access-out.html');
const authoring = read('rizsim-course-authoring.js');
const roles = read('rizsim-roles-library.js');
const css = read('rizsim-course-lead-upgrade.css');

const rootIndex = html.indexOf('id="view-courses"');
const promoIndex = html.indexOf('id="rzCourseLeadUpgrade"', rootIndex);
const editorIndex = html.indexOf('id="rzCourseAuthoring"', rootIndex);
assert(rootIndex >= 0 && promoIndex > rootIndex && editorIndex > promoIndex && editorIndex - promoIndex < 18000,
  'Promotional interface must precede the Course Lead editor inside the existing Courses view');
assert.match(html, /id="rzCourseLeadUpgradeButton"[\s\S]*?href="mailto:rizsimulation@gmail\.com\?subject=/);
assert.match(html, /Your course\.[\s\S]*?Your vision\./);
assert.match(html, /Create a named, reusable course/);
assert.match(html, /simulation licensing remains separate/i);
assert.match(html, /href="rizsim-course-lead-upgrade.css"/);
assert.match(css, /#view-courses\[data-rz-clu="faculty"\]/);
assert.match(css, /background:.*#67435f.*#945b76.*#ad7272/);
assert.match(css, /@keyframes rzCluFlow/);
assert.match(css, /@keyframes rzCluShine/);
assert.match(css, /@keyframes rzCluGlow/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(css, /#rzCourseLeadUpgrade\[hidden\],#rzCourseAuthoring\[hidden\]\{display:none!important\}/);
assert.match(roles, /courses:\["owner","course_lead","faculty"\]/);
assert.match(authoring, /function allowed\(\)\{return snapshot\(\)\?\.role==='course_lead'&&!!snapshot\(\)\?\.userId;\}/);
assert.match(authoring, /if\(root\.hidden\)\{closeAll\(\);return;\}/);
const coursesSection = html.slice(html.indexOf('function renderCourses() {'),html.indexOf('function getAvailableCourseSimulations()',html.indexOf('function renderCourses() {')));
assert.match(coursesSection, /if\(role === "faculty"\) return;/);

const begin = html.indexOf('function configureRoleNavigation() {');
const end = html.indexOf('function setAuthenticatedIdentity()',begin);
assert(begin >= 0 && end > begin, 'Original navigation function must still exist');
const navigation = html.slice(begin,end);
const viewNames=['home','simulations','resources','courses','classroom','results','materials','records','institution','administration','about','contact','account'];
function fakeNode(id){
 const attributes={};
 return {id,hidden:false,style:{display:''},dataset:{},attributes,classList:{toggle(){},add(){},remove(){}},
  textContent:'',setAttribute(k,v){attributes[k]=String(v)},removeAttribute(k){delete attributes[k]}};
}
function run(role,hash){
 const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,fakeNode(id));return nodes.get(id)};
 const links=viewNames.map(name=>Object.assign(fakeNode('nav-'+name),{dataset:{authView:name}}));
 let navigated='';const sandbox={
  currentMembership:{role},window:{location:{hash}},document:{
   getElementById:get,
   querySelector(selector){return null},
   querySelectorAll(selector){if(selector==='#mainNav [data-auth-view]')return links;throw Error('Unexpected nav selector: '+selector)}
  },allowedViewOrder:[],activeView:'home',roleLabel:r=>r,
  setViewImmediately(v){navigated=v},console
 };
 vm.runInNewContext(navigation+'\nconfigureRoleNavigation();',sandbox,{timeout:500});
 return {nodes:get,links,navigated,allowed:sandbox.allowedViewOrder};
}
for(const role of ['faculty','course_lead','owner','admin','institution']){
 const r=run(role,'#courses');const promo=r.nodes('rzCourseLeadUpgrade'),builder=r.nodes('rzCourseAuthoring'),view=r.nodes('view-courses');
 const courseLink=r.links.find(x=>x.dataset.authView==='courses');
 if(role==='faculty'){
  assert.equal(promo.hidden,false);assert.equal(builder.hidden,true);
  assert.equal(courseLink.style.display,'');assert.equal(r.navigated,'courses');
  assert.equal(view.attributes['data-rz-clu'],'faculty');
 }else{
  assert.equal(promo.hidden,true);assert.equal(builder.hidden,false);
  assert.equal(view.attributes['data-rz-clu'],undefined);
  assert.equal(courseLink.style.display,['course_lead','owner'].includes(role)?'':'none');
  assert.equal(r.navigated,['course_lead','owner'].includes(role)?'courses':'home');
 }
}
assert.equal(html.match(/id="rzCourseLeadUpgrade"/g).length,1);
assert.equal(html.match(/id="rzCourseLeadUpgradeButton"/g).length,1);
console.log('Fix 2 Course Lead promotion: role-gating, source, markup, CTA and motion contracts passed.');