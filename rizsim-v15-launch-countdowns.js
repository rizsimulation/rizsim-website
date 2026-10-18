/* RizSim V15: fixed PKT launch-announcement clocks. No paid or published access is changed. */
(()=>{'use strict';
 const START=Date.parse('2026-10-19T06:00:00+05:00');
 const COURSE=Date.parse('2026-10-23T06:00:00+05:00');
 const LIBRARY=Date.parse('2026-10-25T06:00:00+05:00');
 const TZ='Pakistan Standard Time';
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
 function parts(target){const left=Math.max(0,(Date.now()<START?target-START:target-Date.now()));
   const seconds=Math.floor(left/1000);return [Math.floor(seconds/86400),Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60].map(x=>String(x).padStart(2,'0'));}
 const ended=target=>Date.now()>=target, before=()=>Date.now()<START;
 function renderDigits(root,target){const values=parts(target);root.querySelectorAll('[data-rz-count]').forEach((e,i)=>e.textContent=values[i]);}
 function digits(target){const grid=node('div','rz-v15-countgrid');for(let i=0;i<4;i++){const n=node('div'),value=node('strong','',parts(target)[i]);value.dataset.rzCount=i; n.append(value,node('span','',['DAYS','HOURS','MIN','SEC'][i]));grid.append(n);}return grid;}
 function courseDialog(){
   const modal=node('dialog','rz-v15-launch-dialog');
   const head=node('span','rz-v15-kicker','RIZSIM · COURSE LEAD PUBLIC LAUNCH');
   const title=node('h2','',ended(COURSE)?'Course Lead launch date has arrived':'A new way to lead learning is coming');
   const desc=node('p','',ended(COURSE)
    ?'Course Lead is planned as a paid Faculty upgrade. Pricing and access details will be published by the RizSimulation Team when the public release is enabled.'
    :'Our premium Course Lead experience is scheduled for public release with paid access. Explore course building, classroom control and learning analytics.');
   const timing=node('p','',before()?'Countdown begins Monday, 19 October, at 6:00 AM PKT.':'Public launch target: Friday, 23 October 2026, 6:00 AM PKT.');
   const grid=digits(COURSE),note=node('p','', 'A countdown is an announcement, not an automatic upgrade or a free-access offer.');
   const actions=node('div');actions.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:9px';
   const link=node('a','','Contact RizSimulation Team');link.href='https://mail.google.com/mail/?view=cm&fs=1&to=rizsimulation%40gmail.com&su=Course%20Lead%20paid%20access';link.target='_blank';link.rel='noopener noreferrer';
   const close=node('button','rz-v15-button','Close');close.type='button';close.addEventListener('click',()=>modal.close());actions.append(link,close);
   modal.append(head,title,desc,timing,grid,note,actions);
   modal.addEventListener('close',()=>modal.remove(),{once:true});document.body.append(modal);modal.showModal();
   const timer=setInterval(()=>{if(!modal.isConnected){clearInterval(timer);return;}renderDigits(grid,COURSE);
     if(ended(COURSE)){title.textContent='Course Lead launch date has arrived';desc.textContent='Course Lead is planned as a paid Faculty upgrade. Pricing and access details will be published by the RizSimulation Team when the public release is enabled.';}},1000);
 }
 function course(){
   const trigger=document.getElementById('rzCourseLeadUpgradeButton');if(!trigger||trigger.dataset.rzV15)return;
   trigger.dataset.rzV15='ready';trigger.setAttribute('aria-label','View Course Lead public launch countdown');
   const text=trigger.querySelector('span:not(.rz-clu-upgrade-shine)');if(text)text.textContent='Discover Course Lead Launch';
   const note=document.querySelector('.rz-clu-cta-note');if(note)note.textContent='Paid Course Lead access is scheduled for public release on 23 October 2026. View the countdown and upcoming details.';
   trigger.addEventListener('click',e=>{e.preventDefault();courseDialog();});
 }
 let libraryTimer=null;
 function library(){
   // Student Workspace creates the Library tab after document parsing, so this
   // must also work when that authorized dashboard is mounted asynchronously.
   const anchor=document.getElementById('rzStudentSimulationLibrary');
   if(!anchor||!anchor.isConnected)return false;
   if(document.getElementById('rzV15LibraryLaunch'))return true;
   if(libraryTimer){clearInterval(libraryTimer);libraryTimer=null;}
   const strip=node('section','rz-v15-library-countdown');strip.id='rzV15LibraryLaunch';
   strip.setAttribute('aria-label','RizSimulation Library publication countdown');
   const copy=node('div');copy.append(node('strong','','RizSim Library · Coming Soon'),
     node('p','','New resources, courses and eBooks are scheduled for publication.'));
   const time=node('strong','rz-v15-library-timer');time.id='rzV15LibraryTime';
   time.setAttribute('role','timer');time.setAttribute('aria-label','Time remaining before the Library publication date');
   strip.append(copy,time);anchor.before(strip);
   function tick(){
     if(ended(LIBRARY)){
       time.textContent='Launch date reached';
       copy.querySelector('strong').textContent='RizSim Library · Publication Update';
       copy.querySelector('p').textContent='Courses, resources and eBooks will appear when the RizSimulation Team publishes them.';
     }else{
       time.textContent=parts(LIBRARY).join(' : ');
       copy.querySelector('strong').textContent='RizSim Library · Coming Soon';
       copy.querySelector('p').textContent=before()?
         '6-day countdown begins Monday 19 October at 6:00 AM PKT.':
         'Resources, courses and eBooks are scheduled for Sunday 25 October at 6:00 AM PKT.';
     }
   }
   tick();
   libraryTimer=setInterval(()=>{if(!strip.isConnected){clearInterval(libraryTimer);libraryTimer=null;return;}tick();},1000);
   return true;
 }
 function init(){
   course();
   if(!library()){
     const root=document.getElementById('studentApp')||document.body;
     const observer=new MutationObserver(()=>{
       if(library())observer.disconnect();
     });
     observer.observe(root,{childList:true,subtree:true});
   }
   // Restore the clock if the Student dashboard is rebuilt after sign-out/in.
   window.addEventListener('focus',library);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)library();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
