import {hex} from './color-engine.js';
import {garments, labels, recommend, validateProfile, alternatives, swapItem} from './stylist-engine.js';
import {clothingPhoto, questionPhoto} from './catalog-photos.js';

const $ = selector => document.querySelector(selector);
const freshProfile = () => ({style:'', wardrobe:[], occasion:'', climate:'', comfort:'', avoid:[]});
const roles = {skin:'My skin', hair:'My hair', garment:'My reference garment'};
const questions = [
  {key:'style',title:'Which style is closest to you?',description:'Choose the one closest to what you wear, not what you think you should wear.',options:[
    ['casual','Casual and comfortable','Tees, jeans and easy combinations.'],
    ['smart','Smart casual','Shirts, dress pants and polished layers.'],
    ['street','Urban','Sweatshirts, sneakers and relaxed pieces.'],
    ['minimal','Minimalist','Simple lines and a few well-matched pieces.']]},
  {key:'wardrobe',multi:true,title:'Which garments do you repeat during your week?',description:'Check at least one top and one bottom. We\'ll start from these, without assuming your gender or body.',options:garments.filter(g=>['top','bottom'].includes(g.kind)).map(g=>[g.id,g.name,g.kind==='top'?'Top':'Bottom'])},
  {key:'occasion',title:'What do you need this look for?',description:'The same palette can work for very different moments.',options:[
    ['daily','My everyday life','Getting around, studying or doing my usual plans.'],
    ['work','Work or formal study','A slightly more polished look, without a strict dress code.'],
    ['social','A night out','Meeting friends, a date or going out to eat.']]},
  {key:'climate',title:'What temperature do you have in mind?',description:'This decides the layers and rules out garments that don\'t suit the weather.',options:[
    ['warm','It\'s hot','Light garments, no warm layers.'],
    ['mild','It\'s mild','Mid-weight garments and a layer if your style calls for it.'],
    ['cold','It\'s cold','Knit or cotton with a warm layer.']]},
  {key:'comfort',title:'How much color do you like to wear?',description:'Your comfort comes first, even if a sample from your photo is very intense.',options:[
    ['neutral','I stick with neutrals','Ivory, stone, graphite, cocoa and midnight blue.'],
    ['balanced','One color accent','Color on top, with a neutral base.'],
    ['bold','I want to explore more color','Expressive shades and contrasting combinations.']]},
  {key:'avoid',multi:true,title:'Is there anything you prefer not to wear?',description:'Optional. We\'ll exclude these garments from the looks and swaps. If you check nothing, continue without exclusions.',options:garments.map(g=>[g.id,g.name,'Don\'t include in my looks'])}
];
let profile=freshProfile(), step=0, complete=false, tones=[], currentSample=null, ownImage=false, looks=[];

function node(tag, className, text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function phase(index){document.querySelectorAll('.steps > span').forEach((el,i)=>{el.classList.toggle('current',i===index);if(i===index)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});}
function scrollTo(el){el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
function invalidate(text='Your preferences changed. Create your looks again to use the current selection.'){
  const hadLooks=looks.length>0;looks=[];$('#outfit-list').replaceChildren();$('#look-results').hidden=true;
  $('#look-status').textContent=complete?(hadLooks?text:'All set. You can create your looks with or without photo references.'):'Complete the interview to get started.';
  $('#generate-looks').disabled=!complete;
}
function renderQuestion(focus=false){
  const q=questions[step];$('#style-form').hidden=false;$('#interview-summary').hidden=true;
  $('#interview-title').textContent=q.title;$('#question-description').textContent=q.description;
  $('#question-count').textContent=`Question ${step+1} of ${questions.length}`;$('#quiz-progress').value=step+1;
  $('#quiz-error').textContent='';$('#quiz-back').hidden=step===0;$('#quiz-next').textContent=step===questions.length-1?'Finish interview':'Continue';
  const group=node('fieldset','question-fieldset');const legend=node('legend','sr-only',q.title);group.append(legend);
  const options=node('div',q.key==='avoid'?'question-grid exclusion-grid':'question-grid');
  q.options.forEach(([value,title,description])=>{
    const label=node('label','answer-option');const input=document.createElement('input');input.type=q.multi?'checkbox':'radio';input.name=q.key;input.value=value;
    input.checked=q.multi?profile[q.key].includes(value):profile[q.key]===value;
    input.addEventListener('change',()=>{if(q.multi)profile[q.key]=[...group.querySelectorAll('input:checked')].map(el=>el.value);else profile[q.key]=value;invalidate();$('#quiz-error').textContent='';});
    const copy=node('span','answer-copy');copy.append(node('strong','',title),node('small','',description));
    const photoId=questionPhoto(q.key,value);if(photoId){label.classList.add('has-photo');label.append(clothingPhoto(photoId,{className:'answer-photo',eager:true}));}
    if(q.key==='comfort'){label.classList.add('has-color-preview');const swatches=node('span',`comfort-preview comfort-${value}`);swatches.setAttribute('aria-hidden','true');for(let i=0;i<4;i++)swatches.append(node('i'));label.append(swatches);}
    label.append(input,copy);options.append(label);
  });group.append(options);$('#question-options').replaceChildren(group);if(focus)$('#interview-title').focus({preventScroll:true});
}
function summary(){
  $('#style-form').hidden=true;$('#interview-summary').hidden=false;$('#interview-title').textContent='We have a starting point.';
  $('#question-description').textContent='You can change any answer again. We don\'t keep a permanent profile.';
  $('#question-count').textContent='Interview complete';$('#quiz-progress').value=6;
  const rows=[['Style',labels.style[profile.style]],['Usual garments',profile.wardrobe.map(id=>garments.find(g=>g.id===id)?.name).filter(Boolean).join(', ')],['Occasion',labels.occasion[profile.occasion]],['Weather',labels.climate[profile.climate]],['Color',labels.comfort[profile.comfort]],['Avoid',profile.avoid.length?profile.avoid.map(id=>garments.find(g=>g.id===id)?.name).filter(Boolean).join(', '):'No exclusions']];
  $('#profile-summary').replaceChildren(...rows.map(([title,value])=>{const row=node('div');row.append(node('dt','',title),node('dd','',value));return row;}));
  $('#generate-looks').disabled=false;$('#look-status').textContent='All set. Create your looks; photo references are optional.';
}
$('#style-form').addEventListener('submit',e=>{
  e.preventDefault();phase(1);const q=questions[step];let error='';
  if(!q.multi&&!profile[q.key])error='Choose an option to continue.';
  if(q.key==='wardrobe'){
    const chosen=garments.filter(g=>profile.wardrobe.includes(g.id));
    if(!chosen.some(g=>g.kind==='top')||!chosen.some(g=>g.kind==='bottom'))error='Choose at least one top and one bottom.';
  }
  if(step===questions.length-1&&!error)error=validateProfile(profile);
  if(error){$('#quiz-error').textContent=error;return;}
  if(step<questions.length-1){step++;renderQuestion(true);}else{complete=true;summary();$('#generate-looks').focus({preventScroll:true});}
});
$('#quiz-back').onclick=()=>{if(step>0){step--;renderQuestion(true);}};
function editProfile(){complete=false;step=0;phase(1);invalidate();renderQuestion(true);scrollTo($('#stylist'));}
$('#edit-profile').onclick=$('#rethink-style').onclick=editProfile;

function renderTones(){
  $('#pin-tone').disabled=!currentSample||!ownImage;
  $('#tone-hint').textContent=!ownImage?'Upload or capture your own photo to confirm samples.':tones.length?'You can replace a reference by taking another sample.':'Tap an area of the photo and confirm what it represents.';
  $('#tone-list').replaceChildren(...tones.map(t=>{
    const li=node('li');const dot=node('i');dot.style.background=hex(t.rgb);const text=node('span','',`${t.label} · ${hex(t.rgb)}`);const remove=node('button','remove-tone','Remove');remove.setAttribute('aria-label',`Remove reference: ${t.label}`);
    remove.onclick=()=>{tones=tones.filter(v=>v.role!==t.role);invalidate('You changed your references. Create your looks again.');renderTones();$('#pin-tone').focus({preventScroll:true});};li.append(dot,text,remove);return li;
  }));
  $('#brief-tones').textContent=tones.length?`${tones.length} confirmed reference${tones.length>1?'s':''}. ${tones.length>1?'They':'It'} will be used to explore color proximity or contrast, not to classify your appearance.`:'You haven\'t confirmed any samples yet. You can continue with just your preferences.';
  $('#brief-swatches').replaceChildren(...tones.map(t=>{const chip=node('span');const dot=node('i');dot.style.background=hex(t.rgb);chip.append(dot,document.createTextNode(t.label));return chip;}));
}
$('#pin-tone').onclick=()=>{
  if(!ownImage||!currentSample)return;const role=$('#tone-role').value;
  tones=tones.filter(t=>t.role!==role);tones.push({role,label:roles[role],rgb:[...currentSample]});
  invalidate('You changed your references. Create your looks again.');renderTones();$('#look-status').textContent=complete?'Reference confirmed. Create your looks with the current selection.':'Reference confirmed. Now tell us what you like to wear.';
};
window.addEventListener('colorplay:sample',e=>{currentSample=[...e.detail.rgb];$('#pin-tone').disabled=!ownImage;});
window.addEventListener('colorplay:image',e=>{ownImage=e.detail.ownImage;phase(0);currentSample=null;tones=[];invalidate('You changed the image. Confirm new samples and create your looks again.');renderTones();});
window.addEventListener('colorplay:reset',()=>{profile=freshProfile();step=0;complete=false;tones=[];currentSample=null;ownImage=false;phase(0);invalidate();renderQuestion();renderTones();});

function renderLooks(focusTarget){
  $('#look-results').hidden=false;
  $('#looks-context').textContent=`${labels.style[profile.style]} style, for ${labels.occasion[profile.occasion]}, in ${labels.climate[profile.climate]}. ${tones.length?'With your confirmed color references.':'Based only on your answers; your appearance was not analyzed.'}`;
  $('#outfit-list').replaceChildren(...looks.map((look,lookIndex)=>{
    const article=node('article','outfit');article.setAttribute('aria-labelledby',`${look.id}-title`);
    const header=node('div','outfit-heading');const heading=node('h4','',look.title);heading.id=`${look.id}-title`;header.append(heading,node('span','',`Look ${lookIndex+1}`));article.append(header);
    const board=node('div','outfit-board');
    look.items.forEach(item=>{const garment=garments.find(g=>g.id===item.garmentId);const figure=node('figure','outfit-reference');const caption=node('figcaption');const dot=node('i');dot.style.background=item.color.hex;caption.append(dot,document.createTextNode(`Look for: ${item.color.name}`));figure.append(clothingPhoto(garment.id,{alt:`Visual reference: ${garment.name.toLowerCase()}`,eager:true}),caption);board.append(figure);});article.append(board);
    const list=node('ul','outfit-pieces');
    look.items.forEach((item,itemIndex)=>{
      const garment=garments.find(g=>g.id===item.garmentId),li=node('li');const text=node('div');text.append(node('strong','',garment.name));const subtitle=node('span');const dot=node('i');dot.style.background=item.color.hex;subtitle.append(dot,document.createTextNode(`${item.color.name} · ${item.color.hex}`));text.append(subtitle);
      const change=node('button','swap-piece','Swap');change.id=`swap-${lookIndex}-${itemIndex}`;change.setAttribute('aria-label',`Swap ${garment.name} in look ${lookIndex+1}`);change.disabled=alternatives(item,profile).length===0;
      if(change.disabled)change.title='No other garment is compatible with your answers and exclusions.';
      change.onclick=()=>{const next=swapItem(item,profile);if(!next)return;look.items[itemIndex]=next;const nextName=garments.find(g=>g.id===next.garmentId).name;
        // Update the explanation from the actual current pieces, not the original set.
        look.reasons[1]=`Starts from your usual garments: ${look.items.filter(v=>['top','bottom'].includes(v.kind)).map(v=>garments.find(g=>g.id===v.garmentId).name.toLowerCase()).join(' and ')}.`;
        renderLooks(change.id);$('#look-status').textContent=`Look ${lookIndex+1}: we swapped ${garment.name.toLowerCase()} for ${nextName.toLowerCase()}, keeping ${item.color.name}.`;};li.append(text,change);list.append(li);
    });article.append(list);
    const why=node('details','outfit-why');why.open=true;why.append(node('summary','', 'Why we suggest it'));const reasons=node('ul');look.reasons.forEach(reason=>reasons.append(node('li','',reason)));why.append(reasons);article.append(why);return article;
  }));
  if(focusTarget)document.getElementById(focusTarget)?.focus({preventScroll:true});
}
$('#generate-looks').onclick=()=>{
  if(!complete)return;const result=recommend(profile,tones);
  if(result.error){looks=[];$('#look-results').hidden=true;$('#look-status').textContent=result.error;return;}
  looks=result.looks;phase(2);renderLooks();$('#look-status').textContent='Three looks ready. You can swap garments without skipping your exclusions.';scrollTo($('#look-results'));$('#looks-title').focus({preventScroll:true});
};
$('#download-looks').onclick=()=>{
  if(!looks.length)return;
  const payload={product:'Color-Play',type:'illustrative-outfit-suggestions',profile:structuredClone(profile),references:tones.map(t=>({label:t.label,hex:hex(t.rgb)})),looks:looks.map(look=>({title:look.title,items:look.items.map(item=>({garment:garments.find(g=>g.id===item.garmentId).name,color:item.color.name,hex:item.color.hex})),reasons:look.reasons})),notice:'Illustrative catalog, no stock or prices. Local rules, not a personal diagnosis. Does not include photographs.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='color-play-my-looks.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#look-status').textContent='Looks downloaded with your answers and color references. They do not include your photo.';
};
renderQuestion();renderTones();
