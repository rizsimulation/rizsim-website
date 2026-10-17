'use strict';
/* Owner-approved restricted pilot and Activity 01 source fidelity. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('access-out.html'),bank=require('../simulation-assets/insight-to-implication/questions.js');
const core=require('../simulation-assets/insight-to-implication/engine.js');
const participant=read('simulation-assets/insight-to-implication/participant.js');
const cloud=read('simulation-assets/insight-to-implication/rizsim-cloud.js');
assert(html.includes('product.access_type === "restricted"'));
assert(html.includes('data-rz-restricted-invitation="true"'));
assert(html.includes('Invitation only &middot; Not for sale'));
assert(html.includes('product.product_type ===\n"simulation"\n\n? `'),'Keep legacy paid licence details');
assert(bank.review.length===6,'Six KR/KG items');
assert(bank.source.key==='C'&&bank.transfer.key==='A','Authentic source/transfer key');
assert(bank.review.map(q=>q.key).join(',')==='A,C,B,D,B,C','Six authentic correct-option letters');
for(const fn of ['renderReview','renderCase','renderBridge','renderFeedback','renderRGA','renderRail','stepNav'])
  assert(participant.includes('function '+fn+'('),'Preserve original Activity 01 stage '+fn);
for(const part of ['C.stage(','C.committed(','function renderReview(phase)','function renderCase(phase)','function renderFeedback()','function renderRGA()'])
  assert(participant.includes(part),'Preserve original Activity 01 working sequence '+part);
assert(cloud.includes('check_my_rizsim_classroom_attempt_access'),'Server-authenticated Student session required');
assert(cloud.includes('submit_my_rizsim_classroom_attempt'),'Server-confirmed submission required');
const record=core.createRecord('Synthetic Pilot Learner','Synthetic Pilot School');
assert(core.stage(record)==='kr'&&core.committed(record)===0&&core.validRecord(record));
console.log('PASS invitation-only restricted catalogue; Sim01 correct answers and original working KR/LT/KG/RGA stages');
