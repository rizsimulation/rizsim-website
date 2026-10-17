/* V10 shared field feedback and file-delivery picker. No change to auth or Home. */
(function(){
 'use strict';
 let counter=0;
 function fieldError(input,message){
  if(!input||!input.isConnected)return false;
  const parent=input;
  let el=parent.nextElementSibling;
  if(!el||!el.classList?.contains('rz-inline-error')){
   el=document.createElement('span');el.className='rz-inline-error';
   el.id='rzInlineError'+(++counter);parent.insertAdjacentElement('afterend',el);
  }
  const msg=String(message||'').trim();
  if(msg){
   el.hidden=false;el.textContent=msg;input.classList.add('rz-field-invalid');
   input.setAttribute('aria-invalid','true');
   if(!input.getAttribute('aria-describedby')?.split(' ').includes(el.id))
    input.setAttribute('aria-describedby',((input.getAttribute('aria-describedby')||'')+' '+el.id).trim());
  }else{
   el.hidden=true;el.textContent='';input.classList.remove('rz-field-invalid');input.removeAttribute('aria-invalid');
   const other=(input.getAttribute('aria-describedby')||'').split(/\s+/).filter(x=>x&&x!==el.id);
   if(other.length)input.setAttribute('aria-describedby',other.join(' '));else input.removeAttribute('aria-describedby');
  }
  return !msg;
 }
 function required(input,label){
  if(!input)return false;
  const v=String(input.value||'').trim();
  if(!v)return fieldError(input,'Enter '+(label||'a value')+' before continuing.');
  if(input.validity&&!input.validity.valid)return fieldError(input,input.validationMessage||'Check this value.');
  fieldError(input,'');return true;
 }
 function picker(initial='secure_view'){
  const fieldset=document.createElement('fieldset');fieldset.className='rz-delivery-fieldset';
  const legend=document.createElement('legend');legend.className='rz-delivery-title';legend.textContent='File access for students';
  const grid=document.createElement('div');grid.className='rz-delivery-choices';
  const options=[['secure_view','Secure View','Protected RizSim reader · no download or text copy controls · watermarked'],['downloadable','Downloadable','Opens in RizSim · download, print and copy text when the file contains selectable text · no watermark']];
  const group='rzDelivery'+(++counter);
  options.forEach(([value,title,description])=>{
   const label=document.createElement('label');const radio=document.createElement('input');
   radio.type='radio';radio.name=group;radio.value=value;radio.checked=value===initial;
   const bold=document.createElement('strong');bold.textContent=title;
   const small=document.createElement('small');small.textContent=description;
   label.append(radio,bold,small);grid.append(label);
  });
  fieldset.append(legend,grid);
  return {element:fieldset,value:()=>fieldset.querySelector('input:checked')?.value||'secure_view'};
 }
 document.addEventListener('invalid',event=>{
  const input=event.target;
  if(!input.closest?.('.rz-author-editor,.rz-author-modal,.rz-runtime-dialog,.rz-purchased-setup,#view-classroom'))return;
  event.preventDefault();fieldError(input,input.validity?.valueMissing?'This field is required.':input.validationMessage||'Please check this value.');
 },true);
 document.addEventListener('input',event=>{
  const input=event.target;
  if(!input?.classList?.contains('rz-field-invalid'))return;
  if(input.validity?.valid&&String(input.value||'').trim())fieldError(input,'');
 },true);
 window.RizSimFieldFeedback=Object.freeze({show:fieldError,required});
 window.RizSimFileDelivery=Object.freeze({picker});
})();
