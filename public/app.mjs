import * as THREE from '/vendor/three.module.js';
import { Game, DT, distance } from '/src/core/game.mjs';
const $=id=>document.getElementById(id);
try {
const contract=await fetch('/game.contract.json').then(r=>r.json());
const t=contract.tuning;
const palette={sky:0x0E1430,fog:0x1B2350,grass:0x2F5D50,sand:0xC9B48A,wood:0x6B4A2F,sea:0x12384A,lit:0xFFB347,core:0xFFE9B0,off:0x5B5F6E,mote:0xFFF6C2,shade:0x120A1A,rim:0x7A3CFF,shirt:0xE8E2D0,red:0xC8102E};
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene();scene.background=new THREE.Color(palette.sky);scene.fog=new THREE.FogExp2(palette.fog,.008);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,500);
const ambient=new THREE.AmbientLight(0xb8d2ff,.35);scene.add(ambient);
const moonlight=new THREE.DirectionalLight(0xa5bffc,1.25);moonlight.position.set(-40,65,-30);scene.add(moonlight);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
const material={grass:mat(palette.grass),sand:mat(palette.sand),wood:mat(palette.wood),rock:mat(0x364354),shirt:mat(palette.shirt),red:mat(palette.red),hat:mat(palette.sand),skin:mat(0xe0b08c),shade:mat(palette.shade,{emissive:palette.rim,emissiveIntensity:.18}),mote:mat(palette.mote,{emissive:0xFFE58A,emissiveIntensity:2})};
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
const sea=mesh(new THREE.PlaneGeometry(1000,1000),mat(palette.sea),scene,0,-5,0);sea.rotation.x=-Math.PI/2;
const world=new THREE.Group();scene.add(world);
mesh(new THREE.CylinderGeometry(38,31,7,80),material.sand,world,0,-3.6,0);
mesh(new THREE.CylinderGeometry(37.7,37.7,.25,80),material.grass,world,0,-.14,0);
const decoration=new THREE.Group();world.add(decoration);
for(let i=0;i<35;i++){
  const a=i*2.39996,r=16+(i%7)*2.5,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(i%3===0){const rock=mesh(new THREE.DodecahedronGeometry(.7+(i%3)*.2),material.rock,decoration,x,.5,z);rock.scale.set(1.3,.8,1);}
  else {mesh(new THREE.CylinderGeometry(.17,.3,2.8,6),material.wood,decoration,x,1.4,z);for(let h=0;h<3;h++)mesh(new THREE.ConeGeometry(1.5-h*.25,2.1,7),mat(h%2?0x284e49:0x376758),decoration,x,3+h*.7,z);}
}
for(let i=0;i<22;i++){const a=i*2.4,r=50+i%4*13;const cloud=mesh(new THREE.IcosahedronGeometry(4,1),mat(0x547884,{transparent:true,opacity:.18,depthWrite:false}),scene,Math.cos(a)*r,-4+i%3,Math.sin(a)*r);cloud.scale.set(3,.5,1.4);}
const stars=new Float32Array(450*3);for(let i=0;i<450;i++){const a=i*2.39996,b=.1+(i%79)/79*1.4;stars[i*3]=Math.cos(a)*Math.cos(b)*200;stars[i*3+1]=Math.sin(b)*200;stars[i*3+2]=Math.sin(a)*Math.cos(b)*200;}
const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(stars,3));scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xc8dcff,size:.45})));
mesh(new THREE.SphereGeometry(5,24,16),new THREE.MeshBasicMaterial({color:0xFFE9B0}),scene,-90,100,95);
const player=new THREE.Group();scene.add(player);
mesh(new THREE.ConeGeometry(.4,.9,8),material.shirt,player,0,.75,0);
mesh(new THREE.SphereGeometry(.26,12,10),material.skin,player,0,1.4,0);
mesh(new THREE.ConeGeometry(.85,.45,24),material.hat,player,0,1.8,0);
mesh(new THREE.TorusGeometry(.68,.035,4,24),material.red,player,0,1.6,0).rotation.x=Math.PI/2;
mesh(new THREE.BoxGeometry(.15,.45,.12),material.red,player,0,.9,-.33);
for(const x of [-.18,.18])mesh(new THREE.CylinderGeometry(.1,.09,.45,6),material.wood,player,x,.23,0);
mesh(new THREE.CylinderGeometry(.1,.1,.27,8),mat(palette.lit,{emissive:palette.lit,emissiveIntensity:2}),player,.65,1.35,0);
mesh(new THREE.CylinderGeometry(.015,.015,.2,5),material.wood,player,.65,1.59,0);
const playerLight=new THREE.PointLight(palette.lit,12,9,2);playerLight.position.set(0,1,0);player.add(playerLight);
const pulseVisual=mesh(new THREE.RingGeometry(.95,1,72),new THREE.MeshBasicMaterial({color:0xFFE9B0,side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false}),scene);pulseVisual.rotation.x=-Math.PI/2;
let game=new Game({tuning:t,seed:2026}),playing=false,paused=false,yaw=0,drag=false,lastX=0,accumulator=0,last=performance.now(),elapsed=0,pulseAge=10,toastUntil=0;
let saved={volume:.3,sensitivity:1};try{saved={...saved,...JSON.parse(localStorage.getItem('lantern-settings')??'{}')};}catch{}
$('volume').value=saved.volume;$('sensitivity').value=saved.sensitivity;
for(const key of ['volume','sensitivity'])$(key).oninput=()=>{saved[key]=Number($(key).value);try{localStorage.setItem('lantern-settings',JSON.stringify(saved));}catch{}};
let audio;
function sound(name){if(!saved.volume)return;audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),gain=audio.createGain();const notes={mote_picked:880,lantern_lit:523,pulse:180,player_hit:110,game_over:392};o.type='sine';o.frequency.setValueAtTime(notes[name]??330,audio.currentTime);o.frequency.exponentialRampToValueAtTime((notes[name]??330)*1.5,audio.currentTime+.15);gain.gain.setValueAtTime(saved.volume*.12,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.35);o.connect(gain).connect(audio.destination);o.start();o.stop(audio.currentTime+.36);}
const keys=new Set();
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;keys.add(e.code);if((e.code==='Escape'||e.code==='KeyP')&&playing){paused=!paused;$('pause').classList.toggle('hidden',!paused);keys.clear();}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(playing){paused=true;$('pause').classList.remove('hidden');}});
$('world').addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;$('world').setPointerCapture(e.pointerId);});
addEventListener('pointerup',()=>drag=false);addEventListener('pointermove',e=>{if(drag){yaw-=(e.clientX-lastX)*.006*saved.sensitivity;lastX=e.clientX;}});
const lanternMeshes=new Map(),shadeMeshes=new Map(),moteMeshes=new Map();
function syncEntities(){
  for(const l of game.lanterns){let item=lanternMeshes.get(l.id);if(!item){const group=new THREE.Group();scene.add(group);mesh(new THREE.CylinderGeometry(.12,.18,3.5,8),material.wood,group,0,1.75,0);const core=mesh(new THREE.CylinderGeometry(.5,.42,.9,8),mat(palette.off),group,0,3.2,0);mesh(new THREE.ConeGeometry(.72,.35,8),material.wood,group,0,3.85,0);const light=new THREE.PointLight(palette.lit,0,17,2);light.position.y=3.1;group.add(light);const base=mesh(new THREE.TorusGeometry(1.1,.045,6,40),mat(palette.off),group,0,.03,0);base.rotation.x=Math.PI/2;item={group,core,light,base};lanternMeshes.set(l.id,item);}item.group.position.fromArray(l.pos);item.core.material.color.set(l.lit?palette.lit:palette.off);item.core.material.emissive.set(l.lit?palette.lit:0);item.core.material.emissiveIntensity=l.lit?1.4:0;item.light.intensity=l.lit?24:0;item.base.material.color.set(l.lit?palette.core:palette.off);}
  const activeMotes=new Set(game.motes.map(m=>m.id));for(const [id,m]of moteMeshes)if(!activeMotes.has(id)){scene.remove(m);moteMeshes.delete(id);}
  for(const m of game.motes){let model=moteMeshes.get(m.id);if(!model){model=mesh(new THREE.OctahedronGeometry(.12),material.mote,scene);moteMeshes.set(m.id,model);}model.position.set(m.pos[0]+Math.sin(elapsed*1.2+m.pos[2])*.12,m.pos[1]+.7+Math.sin(elapsed*2+m.pos[0])*.2,m.pos[2]);}
  for(const s of game.shades){let model=shadeMeshes.get(s.id);if(!model){model=new THREE.Group();scene.add(model);mesh(new THREE.IcosahedronGeometry(.65,1),material.shade,model,0,0,0);for(const x of [-.2,.2])mesh(new THREE.SphereGeometry(.07,6,4),new THREE.MeshBasicMaterial({color:0xBBA0FF}),model,x,.12,.55);for(let i=0;i<4;i++)mesh(new THREE.ConeGeometry(.15,.8,5),material.shade,model,Math.cos(i*Math.PI/2)*.4,-.4,Math.sin(i*Math.PI/2)*.4).rotation.z=Math.PI;shadeMeshes.set(s.id,model);}model.position.set(s.pos[0],s.pos[1]+.85+Math.sin(elapsed*3)*.12,s.pos[2]);model.rotation.y=Math.atan2(game.player.pos[0]-s.pos[0],game.player.pos[2]-s.pos[2]);model.scale.setScalar(s.state==='stunned'?.8:1);}
}
function reset(){for(const map of [lanternMeshes,shadeMeshes,moteMeshes]){for(const item of map.values())scene.remove(item.group??item);map.clear();}game=new Game({tuning:t,seed:2026});playing=true;paused=false;keys.clear();accumulator=0;for(const id of ['menu','pause','result','settings'])$(id).classList.add('hidden');$('hud').classList.remove('hidden');$('mote-slots').replaceChildren(...Array.from({length:t.carry_capacity},()=>document.createElement('i')));sound('lantern_lit');}
$('start').onclick=reset;$('restart').onclick=reset;$('restart-pause').onclick=reset;$('resume').onclick=()=>{paused=false;$('pause').classList.add('hidden');keys.clear();};
$('settings-open').onclick=()=>{$('pause').classList.add('hidden');$('settings').classList.remove('hidden');};$('settings-close').onclick=()=>{$('settings').classList.add('hidden');$('pause').classList.remove('hidden');};
document.querySelectorAll('.back-menu').forEach(b=>b.onclick=()=>{playing=false;paused=false;keys.clear();for(const id of ['hud','result','pause','settings'])$(id).classList.add('hidden');$('menu').classList.remove('hidden');});
function updateHUD(){const p=game.player,seconds=Math.ceil(game.timeTicks/60);$('clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('clock').classList.toggle('danger',seconds<=30);$('flames').textContent='◆'.repeat(p.flames)+'◇'.repeat(Math.max(0,t.flames-p.flames));const lit=game.lanterns.filter(l=>l.lit).length;$('lamps').textContent=`${lit} / ${game.lanterns.length}`;$('score').textContent=game.score.toLocaleString('vi-VN');$('carried').textContent=`${p.carried} / ${t.carry_capacity} ĐOM ĐÓM`;[...$('mote-slots').children].forEach((s,i)=>s.classList.toggle('full',i<p.carried));$('pulse-label').innerHTML=`Q <span>${p.pulseCd?`${(p.pulseCd/60).toFixed(1)} s`:'Tỏa sáng · 3'}</span>`;const l=game.lanterns.filter(l=>!l.lit).sort((a,b)=>distance(p.pos,a.pos)-distance(p.pos,b.pos))[0];$('interact').classList.toggle('hidden',!l||distance(p.pos,l.pos)>t.interact_radius);if(l){$('interact').textContent=`E — Nạp ánh sáng (${l.deposited}/${t.lantern_cost})`;$('direction').querySelector('span').textContent=`${l.id} · ${Math.round(distance(p.pos,l.pos))} m`;const projected=new THREE.Vector3(...l.pos).project(camera);$('direction').classList.toggle('hidden',projected.z<1&&Math.abs(projected.x)<.9&&Math.abs(projected.y)<.9);$('direction').style.transform=`rotate(${Math.atan2(projected.x,-projected.y)}rad)`;}else $('direction').classList.add('hidden');ambient.intensity=.15+.55*lit/game.lanterns.length;}
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.1);last=now;elapsed+=dt;
  if(playing&&!paused){accumulator+=dt;while(accumulator>=DT&&game.state==='playing'){const events=game.step({move:[Number(keys.has('KeyD'))-Number(keys.has('KeyA')),Number(keys.has('KeyW'))-Number(keys.has('KeyS'))],cam_yaw_deg:yaw*180/Math.PI,jump:keys.has('Space'),interact:keys.has('KeyE'),pulse:keys.has('KeyQ'),dash:keys.has('ShiftLeft')||keys.has('ShiftRight')});accumulator-=DT;for(const e of events){sound(e.name);if(e.name==='pulse'){pulseAge=0;pulseVisual.position.set(...game.player.pos);pulseVisual.position.y+=.08;}if(e.name==='lantern_lit'){$('toast').textContent='Une lumière de plus'.replace('Une lumière de plus','Một ngọn đèn. Một lời hứa.');toastUntil=elapsed+3;}}
    if(game.state!=='playing'){playing=false;$('result').classList.remove('hidden');$('result-title').textContent=game.state==='won'?'Đảo đã sáng rồi!':'Đừng để đèn tắt';$('result-text').textContent=game.state==='won'?'Mây đã mang những đốm sáng trở về. Biển mây ấm lại trong ánh đèn.':'Một chuyến đi khác đang đợi. Gom ánh sáng, tìm vùng an toàn và thử lại.';$('result-score').textContent=`${game.score} điểm`;}}
  }
  const p=game.player;player.position.fromArray(p.pos);if(Math.hypot(p.vel[0],p.vel[2])>.1)player.rotation.y=Math.atan2(p.vel[0],p.vel[2]);player.visible=!(p.invuln>0&&Math.floor(elapsed*12)%2);
  if(!playing&& !$('menu').classList.contains('hidden')){const a=elapsed*.025;camera.position.set(Math.sin(a)*36,24,-Math.cos(a)*36);camera.lookAt(0,1,10);}else{const target=new THREE.Vector3(p.pos[0]-Math.sin(yaw)*11,p.pos[1]+7,p.pos[2]-Math.cos(yaw)*11);camera.position.lerp(target,1-Math.exp(-8*dt));camera.lookAt(p.pos[0],p.pos[1]+1,p.pos[2]);}
  pulseAge+=dt;pulseVisual.scale.setScalar(Math.min(1,pulseAge/.5)*t.pulse_radius);pulseVisual.material.opacity=Math.max(0,1-pulseAge/.7)*.7;if(elapsed>toastUntil)$('toast').textContent='';syncEntities();if(!$('hud').classList.contains('hidden'))updateHUD();renderer.render(scene,camera);
}
syncEntities();requestAnimationFrame(animate);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}catch(error){$('error').classList.remove('hidden');$('error').textContent=`Không khởi tạo được game: ${error.message}. Hãy dùng trình duyệt hỗ trợ WebGL 2.`;console.error(error);}
