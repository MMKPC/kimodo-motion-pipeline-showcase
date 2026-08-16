const canvas = document.querySelector('[data-motion-canvas]');
const context = canvas.getContext('2d');
const frameInput = document.querySelector('#frame');
const tempoInput = document.querySelector('#tempo');
const energyInput = document.querySelector('#energy');
const toggleButton = document.querySelector('[data-toggle]');
const exportButton = document.querySelector('[data-export]');
const intentInput = document.querySelector('#motion-intent');
const playhead = document.querySelector('[data-playhead]');
let activePreset = 'walk';
let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let frame = 0;
let lastTime = performance.now();

const presets = {
  walk:{ label:'WALK', intent:'A cautious walk forward with controlled arm swing and stable foot contact.' },
  reach:{ label:'REACH', intent:'Plant the feet, shift weight forward, and reach toward a shoulder-height control panel.' },
  sidestep:{ label:'SIDESTEP', intent:'A defensive sidestep to the left with the torso facing the original threat.' },
  takeoff:{ label:'TAKEOFF', intent:'Compress into a low anticipation pose, then drive upward into a clean takeoff.' }
};

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1,2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1,Math.round(rect.width * ratio));
  canvas.height = Math.max(1,Math.round(rect.height * ratio));
  context.setTransform(ratio,0,0,ratio,0,0);
}

function point(x,y){ return {x,y}; }
function line(a,b,width=6,color='#f27b22') {
  context.beginPath(); context.moveTo(a.x,a.y); context.lineTo(b.x,b.y); context.lineWidth=width; context.lineCap='round'; context.strokeStyle=color; context.stroke();
}
function joint(p,r=6){ context.beginPath(); context.arc(p.x,p.y,r,0,Math.PI*2); context.fillStyle='#ffd39a'; context.fill(); }

function poseFor(t,width,height) {
  const energy = Number(energyInput.value)/100;
  const phase = t*Math.PI*2;
  let rootX = width*.5, rootY = height*.56, bob = Math.sin(phase*2)*7*energy;
  let stride = Math.sin(phase)*42*energy, arm = Math.sin(phase+Math.PI)*34*energy, lean = 0, lift = 0;
  if(activePreset==='reach'){ stride=4; arm=10+Math.sin(phase)*7; lean=16*energy; }
  if(activePreset==='sidestep'){ rootX += Math.sin(phase)*55*energy; stride=Math.cos(phase)*20; arm=Math.sin(phase)*18; }
  if(activePreset==='takeoff'){ const jump=Math.max(0,Math.sin(phase)); lift=jump*120*energy; bob=0; stride=(1-jump)*20; arm=-jump*48; }
  rootY -= lift;
  const pelvis=point(rootX,rootY+bob), chest=point(rootX+lean,rootY-108+bob), neck=point(chest.x,chest.y-26), head=point(neck.x,neck.y-38);
  const leftShoulder=point(chest.x-38,chest.y+5), rightShoulder=point(chest.x+38,chest.y+5);
  const leftHip=point(pelvis.x-22,pelvis.y), rightHip=point(pelvis.x+22,pelvis.y);
  let leftHand=point(leftShoulder.x+arm,leftShoulder.y+105), rightHand=point(rightShoulder.x-arm,rightShoulder.y+105);
  if(activePreset==='reach'){ rightHand=point(rightShoulder.x+105*energy,rightShoulder.y-18); leftHand=point(leftShoulder.x-12,leftShoulder.y+100); }
  if(activePreset==='takeoff'){ leftHand=point(leftShoulder.x-55,leftShoulder.y+arm); rightHand=point(rightShoulder.x+55,rightShoulder.y+arm); }
  const leftKnee=point(leftHip.x+stride*.55,leftHip.y+82), rightKnee=point(rightHip.x-stride*.55,rightHip.y+82);
  const leftFoot=point(leftHip.x+stride,leftHip.y+170-Math.max(0,stride)*.18), rightFoot=point(rightHip.x-stride,rightHip.y+170-Math.max(0,-stride)*.18);
  return {pelvis,chest,neck,head,leftShoulder,rightShoulder,leftHip,rightHip,leftHand,rightHand,leftKnee,rightKnee,leftFoot,rightFoot};
}

function render() {
  const ratio = Math.min(window.devicePixelRatio || 1,2);
  const width=canvas.width/ratio, height=canvas.height/ratio;
  context.clearRect(0,0,width,height);
  context.strokeStyle='rgba(255,255,255,.045)'; context.lineWidth=1;
  for(let x=0;x<width;x+=42){context.beginPath();context.moveTo(x,0);context.lineTo(x,height);context.stroke();}
  for(let y=0;y<height;y+=42){context.beginPath();context.moveTo(0,y);context.lineTo(width,y);context.stroke();}
  const ground=height*.86; context.beginPath();context.moveTo(0,ground);context.lineTo(width,ground);context.strokeStyle='rgba(242,123,34,.35)';context.stroke();
  const pose=poseFor(frame/120,width,height*.92);
  context.shadowColor='rgba(242,123,34,.45)'; context.shadowBlur=14;
  line(pose.pelvis,pose.chest,9); line(pose.chest,pose.neck); line(pose.leftShoulder,pose.rightShoulder,8);
  line(pose.leftShoulder,point((pose.leftShoulder.x+pose.leftHand.x)/2-12,(pose.leftShoulder.y+pose.leftHand.y)/2),6); line(point((pose.leftShoulder.x+pose.leftHand.x)/2-12,(pose.leftShoulder.y+pose.leftHand.y)/2),pose.leftHand,5);
  line(pose.rightShoulder,point((pose.rightShoulder.x+pose.rightHand.x)/2+12,(pose.rightShoulder.y+pose.rightHand.y)/2),6); line(point((pose.rightShoulder.x+pose.rightHand.x)/2+12,(pose.rightShoulder.y+pose.rightHand.y)/2),pose.rightHand,5);
  line(pose.leftHip,pose.leftKnee,8); line(pose.leftKnee,pose.leftFoot,7); line(pose.rightHip,pose.rightKnee,8); line(pose.rightKnee,pose.rightFoot,7); line(pose.leftHip,pose.rightHip,9);
  context.shadowBlur=0; Object.values(pose).forEach(p=>joint(p,5)); joint(pose.head,20);
  context.fillStyle='#8090a5'; context.font='700 11px ui-monospace,monospace'; context.fillText(`FRAME ${String(Math.round(frame)).padStart(3,'0')} / ${presets[activePreset].label} / ENERGY ${energyInput.value}%`,18,28);
  frameInput.value=Math.round(frame); document.querySelector('[data-frame-value]').value=String(Math.round(frame)).padStart(3,'0'); playhead.style.left=`calc(18px + ${(frame/119)*Math.max(0,width-36)}px)`;
}

function animate(now) {
  if(playing){ const delta=(now-lastTime)/1000; frame=(frame+delta*30*Number(tempoInput.value))%120; }
  lastTime=now; render(); requestAnimationFrame(animate);
}

document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-preset]').forEach(item=>item.classList.remove('is-selected')); button.classList.add('is-selected'); activePreset=button.dataset.preset; intentInput.value=presets[activePreset].intent; document.querySelector('[data-state-label]').textContent=`LIVE PREVIEW / ${presets[activePreset].label}`; frame=0;
}));
tempoInput.addEventListener('input',()=>document.querySelector('[data-tempo-value]').value=`${Number(tempoInput.value).toFixed(2)}x`);
energyInput.addEventListener('input',()=>document.querySelector('[data-energy-value]').value=`${energyInput.value}%`);
frameInput.addEventListener('input',()=>{frame=Number(frameInput.value);playing=false;toggleButton.textContent='Play';});
toggleButton.addEventListener('click',()=>{playing=!playing;toggleButton.textContent=playing?'Pause':'Play';});
exportButton.addEventListener('click',()=>{
  const payload={schema:'mmkpc.motion-direction.v1',intent:intentInput.value,preset:activePreset,tempo:Number(tempoInput.value),energy:Number(energyInput.value),review_frame:Math.round(frame),target:{format:'BVH',next_stage:'DCC retarget'},note:'Public browser demonstrator; model inference is not included.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})); const anchor=document.createElement('a'); anchor.href=url; anchor.download='kimodo-motion-brief.json'; anchor.click(); URL.revokeObjectURL(url);
});
window.addEventListener('resize',resizeCanvas); resizeCanvas(); requestAnimationFrame(animate);
