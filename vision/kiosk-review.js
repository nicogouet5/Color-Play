import {analyzePixels,hex} from './color-engine.js';
import {garments,labels,recommend} from './stylist-engine.js';
import {clothingPhoto} from './catalog-photos.js';

const $=selector=>document.querySelector(selector);
const screen=$('#kiosk-screen');
const titles=['Welcome','Your photo','Your clothes','Your result'];
const initialProfile=()=>({style:'casual',wardrobe:[],occasion:'daily',climate:'mild',comfort:'balanced',avoid:[]});
const demoProfile=()=>({...initialProfile(),wardrobe:['tee','shirt','jeans','chinos']});
let stage=0,profile=initialProfile(),interviewDone=false,capture=null,colors=[],reference=null,media=null,video=null,epoch=0,uploadEpoch=0,lookIndex=0,samplePoint={x:.5,y:.5};
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
function button(text,action,cls=''){const b=make('button',cls,text);b.type='button';b.onclick=action;return b;}
function say(text){$('#kiosk-message').textContent=text;}
function stopCamera(){epoch++;if(media)media.getTracks().forEach(track=>track.stop());media=null;if(video)video.srcObject=null;video=null;}
function move(next,focus=true){stopCamera();uploadEpoch++;stage=next;render();if(focus)screen.querySelector('h3')?.focus({preventScroll:true});}
function reset(){stopCamera();uploadEpoch++;if(capture){capture.width=capture.height=1;}capture=null;colors=[];reference=null;profile=initialProfile();interviewDone=false;lookIndex=0;stage=0;render();}
function heading(title,description){const wrap=make('div','kiosk-heading');const h=make('h3','',title);h.tabIndex=-1;wrap.append(h,make('p','',description));return wrap;}
function actions(...buttons){const row=make('div','kiosk-actions');row.append(...buttons);return row;}
function endButton(){return button('Finish and clear',()=>{reset();say('Walkthrough finished. Photo, answers and results from the machine view cleared.');});}
function welcome(){
 const hero=make('div','kiosk-welcome');const copy=make('div','kiosk-welcome-copy');
 copy.append(heading('Find your next favorite.','An optional photo, what you like to wear and a look to explore in this store.'));
 const list=make('ol','kiosk-promise');['You choose whether to use the camera.','You tell us which garments you like.','We show you clothes and where to find them.'].forEach(text=>list.append(make('li','',text)));copy.append(list);
 copy.append(button('Start my experience',()=>move(1),'primary kiosk-primary'),make('p','kiosk-private-note','No account and no photo stored. You can continue without a camera.'));
 const visuals=make('div','kiosk-welcome-photos');visuals.append(clothingPhoto('shirt',{alt:'Shirts as a clothing reference',eager:true}),clothingPhoto('chinos',{alt:'Reference for pants and sneakers',eager:true}));
 hero.append(copy,visuals);screen.append(hero);
}
function sample(x,y){
 if(!capture)return;samplePoint={x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(1,y))};
 const px=Math.min(capture.width-1,Math.round(samplePoint.x*capture.width)),py=Math.min(capture.height-1,Math.round(samplePoint.y*capture.height));
 const sx=Math.max(0,px-3),sy=Math.max(0,py-3),w=Math.min(7,capture.width-sx),h=Math.min(7,capture.height-sy);
 const d=capture.getContext('2d',{willReadFrequently:true}).getImageData(sx,sy,w,h).data;const rgb=[0,0,0];for(let i=0;i<d.length;i+=4)rgb.forEach((_,j)=>rgb[j]+=d[i+j]);reference=rgb.map(v=>Math.round(v/(w*h)));
 renderReference();say(`Chosen reference: ${hex(reference)}. It will be used to match colors, without classifying your appearance.`);
}
function renderReference(){const status=$('#kiosk-reference');if(status)status.textContent=reference?`Confirmed reference: ${hex(reference)}`:'No confirmed reference. You can also continue with just your tastes.';document.querySelectorAll('.kiosk-color').forEach(el=>el.setAttribute('aria-pressed',el.dataset.hex===(reference?hex(reference):'')));}
function setCapture(source){
 const width=source.videoWidth||source.naturalWidth||source.width,height=source.videoHeight||source.naturalHeight||source.height;
 if(!width||!height)throw new Error('The image isn\'t ready yet.');
 const next=document.createElement('canvas'),scale=Math.min(1,1000/Math.max(width,height));next.width=Math.round(width*scale);next.height=Math.round(height*scale);
 const ctx=next.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,next.width,next.height);ctx.drawImage(source,0,0,next.width,next.height);
 const result=analyzePixels(ctx.getImageData(0,0,next.width,next.height).data);
 if(capture)capture.width=capture.height=1;capture=next;colors=result.colors;reference=null;samplePoint={x:.5,y:.5};
 stopCamera();stage=1;render();say('Photo ready. The camera is off. Choose a reference color or continue without using the photo\'s colors.');
}
async function openCamera(){
 if(!$('#kiosk-consent')?.checked)return;
 if(!navigator.mediaDevices?.getUserMedia){say('The camera requires localhost or HTTPS. You can upload a photo or continue without a camera.');return;}
 uploadEpoch++;window.dispatchEvent(new CustomEvent('colorplay:kiosk-camera'));stopCamera();const token=epoch;
 const start=$('#kiosk-camera');start.disabled=true;say('Requesting camera permission…');
 try{
  const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280}},audio:false});
  if(token!==epoch||stage!==1){next.getTracks().forEach(t=>t.stop());return;}
  media=next;video=document.createElement('video');video.playsInline=true;video.muted=true;video.srcObject=media;
  $('#kiosk-camera-view').replaceChildren(video);await video.play();if(token!==epoch)return;
  $('#kiosk-live-actions').hidden=false;start.hidden=true;$('#kiosk-consent').disabled=true;say('Camera on. Position yourself in soft front lighting and press Take my photo.');
 }catch{if(token===epoch){stopCamera();render();say('We couldn\'t open the camera. Check the permissions, upload a photo or continue without it.');}}
 finally{if(start.isConnected)start.disabled=false;}
}
async function loadPhoto(file){
 if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){say('Choose a JPG, PNG or WebP photo.');return;}
 if(file.size>15*1024*1024){say('The photo exceeds 15 MB. Use a smaller version.');return;}
 const version=++uploadEpoch;stopCamera();const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();if(version===uploadEpoch)setCapture(img);}catch{if(version===uploadEpoch){render();say('We couldn\'t read the photo. Try another file.');}}finally{URL.revokeObjectURL(url);}
}
function photo(){
 screen.append(heading(capture?'Choose a color from your photo.':'A photo, if you want.','The photo is processed here, during your session. We don\'t identify your face or automatically determine your skin tone.'));
 const layout=make('div','kiosk-photo-layout'),view=make('div','kiosk-camera-view');view.id='kiosk-camera-view';
 if(capture){capture.tabIndex=0;capture.setAttribute('role','img');capture.setAttribute('aria-label','Your photo. Tap an area to choose its color. On a keyboard, use the arrow keys and Enter.');
  capture.onclick=e=>{const rect=capture.getBoundingClientRect();const scale=Math.min(rect.width/capture.width,rect.height/capture.height),w=capture.width*scale,h=capture.height*scale;const x=e.clientX-rect.left-(rect.width-w)/2,y=e.clientY-rect.top-(rect.height-h)/2;if(x>=0&&x<=w&&y>=0&&y<=h)sample(x/w,y/h);};
  capture.onkeydown=e=>{const keys={ArrowLeft:[-.03,0],ArrowRight:[.03,0],ArrowUp:[0,-.03],ArrowDown:[0,.03],Enter:[0,0],' ':[0,0]};if(keys[e.key]){e.preventDefault();sample(samplePoint.x+keys[e.key][0],samplePoint.y+keys[e.key][1]);}};view.append(capture);
 }else{const guide=make('div','camera-guide');guide.setAttribute('aria-hidden','true');guide.append(make('span'));view.append(guide,make('p','','Your camera view will appear here.'));}
 const side=make('div','kiosk-photo-instructions');side.append(make('h4','',capture?'You choose the color.':'Before the photo'),make('p','',capture?'Tap an area of the photo or one of the swatches. Colors include the background and your clothes.':'Find natural light, no filters, and avoid strong shadows. You don\'t need to pose in any special way.'));
 if(capture){const swatches=make('div','kiosk-color-options');colors.forEach(c=>{const b=button(hex(c.rgb),()=>{reference=[...c.rgb];renderReference();say(`Confirmed reference: ${hex(reference)}.`);},'kiosk-color');b.dataset.hex=hex(c.rgb);b.setAttribute('aria-pressed',reference&&hex(reference)===hex(c.rgb)?'true':'false');const dot=make('i');dot.style.background=hex(c.rgb);b.prepend(dot);swatches.append(b);});side.append(swatches);const info=make('p','kiosk-reference');info.id='kiosk-reference';side.append(info);}
 const consent=make('label','kiosk-consent');const check=document.createElement('input');check.type='checkbox';check.id='kiosk-consent';consent.append(check,document.createTextNode('I allow the camera to be turned on for this session.'));side.append(consent);
 const start=button(capture?'Retake the photo':'Turn on my camera',openCamera,'primary');start.id='kiosk-camera';start.disabled=true;check.onchange=()=>{start.disabled=!check.checked;};side.append(start);
 const live=actions(button('Take my photo',()=>{try{setCapture(video);}catch(e){say(e.message);}},'primary'),button('Cancel camera',()=>{stopCamera();render();say('Camera off. You can continue without capturing.');}));live.id='kiosk-live-actions';live.hidden=true;side.append(live);
 const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.id='kiosk-file';file.hidden=true;file.onchange=e=>{loadPhoto(e.target.files[0]);e.target.value='';};side.append(button('Upload a photo',()=>file.click()),file,make('small','','JPG, PNG or WebP · up to 15 MB'));
 layout.append(view,side);screen.append(layout,actions(button('Back',()=>move(0)),button(capture?'Continue to my style':'Continue without camera',()=>move(2),'primary'),endButton()));renderReference();
}
function selectField(label,key,options){
 const wrap=make('label','kiosk-select-label',label);const select=document.createElement('select');select.id=`kiosk-${key}`;options.forEach(([value,text])=>{const opt=document.createElement('option');opt.value=value;opt.textContent=text;opt.selected=profile[key]===value;select.append(opt);});select.onchange=()=>{profile[key]=select.value;interviewDone=false;};wrap.append(select);return wrap;
}
function interview(){
 screen.append(heading('What do you like to wear?','Select at least one top and one bottom. These preferences are editable; we don\'t assume your gender, size or body type.'));
 const layout=make('div','kiosk-interview-layout');const wardrobe=make('fieldset','kiosk-wardrobe');wardrobe.append(make('legend','','My usual garments'));
 const grid=make('div','kiosk-wardrobe-grid');garments.filter(g=>['top','bottom'].includes(g.kind)).forEach(g=>{
  const label=make('label','kiosk-wardrobe-option'),input=document.createElement('input');input.type='checkbox';input.name='kiosk-wardrobe';input.value=g.id;input.checked=profile.wardrobe.includes(g.id);
  input.onchange=()=>{profile.wardrobe=[...grid.querySelectorAll('input:checked')].map(i=>i.value);interviewDone=false;};label.append(clothingPhoto(g.id,{eager:true}),input,make('span','',g.name));grid.append(label);
 });wardrobe.append(grid);
 const prefs=make('div','kiosk-preferences');prefs.append(make('p','kiosk-default-note','Adjust these starting values to your day.'));
 for(const [label,key,map] of [['My style','style',labels.style],['My occasion','occasion',labels.occasion],['The weather','climate',labels.climate],['How much color I want','comfort',labels.comfort]])prefs.append(selectField(label,key,Object.entries(map)));
 const exclusions=make('details','kiosk-exclusions');exclusions.append(make('summary','','Garments I prefer to avoid'));
 const list=make('div');garments.forEach(g=>{const l=make('label');const input=document.createElement('input');input.type='checkbox';input.name='kiosk-avoid';input.value=g.id;input.checked=profile.avoid.includes(g.id);input.onchange=()=>{profile.avoid=[...list.querySelectorAll('input:checked')].map(i=>i.value);interviewDone=false;};l.append(input,document.createTextNode(g.name));list.append(l);});exclusions.append(list);prefs.append(exclusions);
 const error=make('p','quiz-error');error.id='kiosk-profile-error';error.setAttribute('role','alert');prefs.append(error);layout.append(wardrobe,prefs);screen.append(layout);
 screen.append(actions(button('Back to my photo',()=>move(1)),button('See my recommendation',()=>{const result=recommend(profile,reference?[{label:'My chosen reference',rgb:reference}]:[]);if(result.error){$('#kiosk-profile-error').textContent=result.error;return;}interviewDone=true;lookIndex=0;move(3);},'primary'),endButton()));
}
function result(){
 const example=!interviewDone,p=example?demoProfile():profile;const refs=!example&&reference?[{label:'My chosen reference',rgb:reference}]:[];
 const r=recommend(p,refs);if(r.error){screen.append(heading('Let\'s try another combination.',r.error),button('Review my preferences',()=>move(2),'primary'));return;}
 const look=r.looks[lookIndex%r.looks.length];
 screen.append(heading('Your look, ready to find.',example?'Example view: you haven\'t completed this machine\'s interview yet. Your photo has not been used.':`A ${labels.style[p.style]} suggestion for ${labels.occasion[p.occasion]}. ${reference?`Chosen reference: ${hex(reference)}.`:'Based only on your preferences; no confirmed photo reference.'}`));
 const strip=make('div','kiosk-result-palette');strip.append(make('strong','',example?'Example palette':'Your combination'));look.items.forEach(item=>{const chip=make('span');const dot=make('i');dot.style.background=item.color.hex;chip.append(dot,document.createTextNode(item.color.name));strip.append(chip);});screen.append(strip);
 const products=make('div','kiosk-products');look.items.forEach((item,i)=>{
  const g=garments.find(g=>g.id===item.garmentId);const article=make('article','kiosk-product');const imageWrap=make('div','kiosk-product-image');imageWrap.append(clothingPhoto(g.id,{alt:`Reference photo: ${g.name.toLowerCase()}`,eager:true}));imageWrap.append(make('span','demo-tag','Visual reference'));article.append(imageWrap);
  const detail=make('div','kiosk-product-info');detail.append(make('h4','',g.name));const color=make('p','kiosk-product-color');const dot=make('i');dot.style.background=item.color.hex;color.append(dot,document.createTextNode(`Color to look for: ${item.color.name}`));detail.append(color);
  const place=item.kind==='top'?'Clothing · Rack A':item.kind==='bottom'?'Clothing · Rack B':item.kind==='layer'?'Clothing · Rack D':'Footwear · Module C';detail.append(make('p','kiosk-location',`${place} · simulated location`),make('small','',`Ref. DEMO-${g.id.toUpperCase()} · No connected stock`));article.append(detail);products.append(article);
 });screen.append(products);
 screen.append(make('p','kiosk-result-note','Reference photographs: the suggested color is shown on each card and may differ from the photo. In a real deployment, this store\'s catalog products and availability would be shown.'));
 const reasons=make('details','kiosk-reasons');reasons.append(make('summary','','Why this combination'));const list=make('ul');look.reasons.forEach(text=>list.append(make('li','',text)));reasons.append(list);screen.append(reasons);
 screen.append(actions(button('See another combination',()=>{lookIndex++;render();say('Showing another combination compatible with this view\'s preferences.');}),button('Change my preferences',()=>move(2)),button('Ask for help in store',()=>say('Simulation: this is where help from a store employee would be requested. This demo sends no alerts and does not share your photo.')),endButton()));
}
function render(){
 screen.replaceChildren();$('#kiosk-step-label').textContent=titles[stage];document.querySelectorAll('[data-screen]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.screen)===stage));
 [welcome,photo,interview,result][stage]();
}
document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>{uploadEpoch++;move(Number(b.dataset.screen));say(`Machine view: ${titles[stage]}.`);});
$('#kiosk-restart').onclick=()=>{reset();say('Walkthrough restarted. The camera is off and this view\'s session is empty.');};
window.addEventListener('colorplay:reset',reset);
window.addEventListener('colorplay:studio-camera',()=>{const active=!!media;stopCamera();if(active&&stage===1){render();say('Machine view camera turned off when the studio camera opened.');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){const active=!!media;stopCamera();if(active&&stage===1){render();say('Camera turned off when the page was hidden.');}}});
window.addEventListener('pagehide',()=>{stopCamera();uploadEpoch++;});
render();
