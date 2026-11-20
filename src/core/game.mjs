import { random } from './random.mjs';
export const DT = 1 / 60;
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
export const rounded = (x) => Math.round(x * 1000) / 1000 || 0;
export const posOut = (p) => p.map(rounded);
export const idCompare = (a, b) => a.id.localeCompare(b.id, 'en', {numeric:true});
export class Game {
  constructor({ tuning, seed = 1, night = 1, scenario = {} }) {
    this.t = tuning; this.rng = random(seed); this.night = night;
    this.tick = 0; this.simTick = 0; this.state = 'playing'; this.events = []; this.score = 0;
    this.timeTicks = Math.round((scenario.time_left_s ?? tuning.night1_duration_s) * 60);
    this.input = {move:[0,0], cam_yaw_deg:0, jump:false, interact:false, pulse:false, dash:false, pause:false};
    this.player = {pos:[0,0,0], vel:[0,0,0], grounded:true, carried:0, flames:tuning.flames, invuln:0, pulseCd:0, ...structuredClone(scenario.player)};
    this.player.grounded = this.player.pos[1] <= 0;
    this.nextMote = 1; this.nextShade = 1;
    this.lanterns = Array.from({length:5}, (_,i) => ({id:`L${i+1}`,pos:[Math.sin(i * Math.PI * 2/5)*26,0,Math.cos(i*Math.PI*2/5)*26],lit:false,deposited:0}));
    for (const patch of scenario.lanterns ?? []) {
      const l = this.lanterns.find(l => l.id === patch.id); Object.assign(l, structuredClone(patch));
      l.lit = l.lit || l.deposited >= tuning.lantern_cost;
      if (l.lit) l.deposited = tuning.lantern_cost;
    }
    this.randomMotes = scenario.random_motes !== false; this.randomShades = scenario.random_shades !== false;
    this.motes = [];
    if (scenario.motes) for (const p of scenario.motes) this.addMote(p);
    else if (this.randomMotes) for (let i=0;i<150;i++) { const a=this.rng()*Math.PI*2,r=5+this.rng()*29; this.addMote([Math.cos(a)*r,0,Math.sin(a)*r]); }
    this.shades = [];
    if (scenario.shades) for (const s of scenario.shades) this.addShade(s);
  }
  addMote(pos, ready = 0) { this.motes.push({id:`M${this.nextMote++}`,pos:[...pos],ready}); }
  addShade(s) {
    const id = s.id ?? `S${this.nextShade++}`;
    const n = /^S(\d+)$/.exec(id); if (n) this.nextShade = Math.max(this.nextShade, Number(n[1])+1);
    this.shades.push({id,pos:[...s.pos],state:s.state ?? 'chase',stun:s.state_ticks_left ?? 0});
  }
  event(name, data = {}) { this.events.push({type:'event',tick:this.tick,name,data}); }
  isSafe(pos) { return this.lanterns.some(l => l.lit && distance(l.pos,pos) < this.t.safe_radius); }
  step(patch = {}) {
    if (this.state !== 'playing') return [];
    this.events = []; const previous = {...this.input}; Object.assign(this.input, patch);
    const edge = key => this.input[key] && !previous[key];
    this.tick++; this.simTick++; this.timeTicks = Math.max(0, this.timeTicks-1);
    const p=this.player,t=this.t;
    p.invuln=Math.max(0,p.invuln-1); p.pulseCd=Math.max(0,p.pulseCd-1);
    const [x,z]=this.input.move,theta=this.input.cam_yaw_deg*Math.PI/180,n=Math.max(1,Math.hypot(x,z));
    p.vel[0]=(x*Math.cos(theta)+z*Math.sin(theta))/n*t.player_speed;
    p.vel[2]=(-x*Math.sin(theta)+z*Math.cos(theta))/n*t.player_speed;
    if (edge('jump') && p.grounded) { p.vel[1]=7;p.grounded=false; }
    if (!p.grounded) p.vel[1]-=20*DT;
    for(let i=0;i<3;i++) p.pos[i]+=p.vel[i]*DT;
    if(p.pos[1]<=0) {p.pos[1]=0;p.vel[1]=0;p.grounded=true;}
    const radius=distance(p.pos,[0,0,0]); if(radius>38) {p.pos[0]*=38/radius;p.pos[2]*=38/radius;}
    this.motes=this.motes.filter(m=>{
      if(this.tick>=m.ready && p.carried<t.carry_capacity && distance(p.pos,m.pos)<=t.pickup_radius+1e-9) {
        p.carried++;this.score+=t.score.per_mote;this.event('mote_picked',{carried:p.carried});return false;
      } return true;
    });
    if(edge('interact')) {
      const l=this.lanterns.filter(l=>!l.lit && distance(p.pos,l.pos)<=t.interact_radius+1e-9).sort((a,b)=>distance(p.pos,a.pos)-distance(p.pos,b.pos)||idCompare(a,b))[0];
      if(l && p.carried) {const amount=Math.min(p.carried,t.lantern_cost-l.deposited);p.carried-=amount;l.deposited+=amount;this.event('deposit',{lantern_id:l.id,amount,deposited:l.deposited});
        if(l.deposited>=t.lantern_cost) {l.lit=true;this.score+=t.score.per_lantern;this.event('lantern_lit',{lantern_id:l.id});}
      }
    }
    if(edge('pulse') && p.pulseCd===0 && p.carried>=t.pulse_cost) {
      p.carried-=t.pulse_cost;p.pulseCd=Math.round(t.pulse_cooldown_s*60);const stunned=[];
      for(const s of this.shades) if(distance(p.pos,s.pos)<=t.pulse_radius+1e-9) {
        s.state='stunned';s.stun=Math.round(t.pulse_stun_s*60);stunned.push(s.id);this.score+=t.score.per_stun;
        let dx=s.pos[0]-p.pos[0],dz=s.pos[2]-p.pos[2],len=Math.hypot(dx,dz);if(!len){dx=1;len=1;}
        s.pos[0]+=dx/len*t.pulse_push_m;s.pos[2]+=dz/len*t.pulse_push_m;
      } this.event('pulse',{stunned_ids:stunned});
    }
    for(const s of this.shades) {
      if(s.state==='stunned') {s.stun--;if(s.stun>0)continue;s.state='chase';}
      const d=distance(p.pos,s.pos);
      if(d>0 && !this.isSafe(s.pos)) {
        const step=Math.min(d,t.shade_speed*DT),next=[s.pos[0]+(p.pos[0]-s.pos[0])/d*step,s.pos[1],s.pos[2]+(p.pos[2]-s.pos[2])/d*step];
        if(!this.isSafe(next))s.pos=next;
      }
      if(!p.invuln && !this.isSafe(p.pos) && distance(p.pos,s.pos)<=t.shade_hit_radius+1e-9) {
        p.flames=Math.max(0,p.flames-1);p.invuln=Math.round(t.invuln_s*60);const dropped=Math.floor(p.carried*t.hit_drop_ratio);p.carried-=dropped;
        for(let i=0;i<dropped;i++)this.addMote([p.pos[0]+Math.cos(i)*2,0,p.pos[2]+Math.sin(i)*2],this.tick+60);
        this.event('player_hit',{by:'shade',flames:p.flames,dropped});
      }
    }
    if(this.randomShades && (this.simTick===300 || this.simTick>300 && (this.simTick-300)%540===0) && this.shades.length<6) {
      const angle=this.rng()*Math.PI*2;this.addShade({pos:[Math.cos(angle)*36,0,Math.sin(angle)*36]});this.event('shade_spawned',{id:this.shades.at(-1).id});
    }
    let reason;
    if(p.flames<=0){this.state='lost';reason='no_flames';}
    else if(this.lanterns.every(l=>l.lit)){this.state='won';reason='all_lit';this.score+=Math.floor(this.timeTicks/60)*t.score.per_second_left+p.flames*t.score.per_flame_left;}
    else if(this.timeTicks===0){this.state='lost';reason='dawn';}
    if(reason)this.event('game_over',{result:this.state,reason});
    return this.events;
  }
  snapshot() {
    return {type:'snapshot',tick:this.tick,sim_tick:this.simTick,state:this.state,time_left_s:rounded(this.timeTicks/60),score:this.score,
      player:{pos:posOut(this.player.pos),flames:this.player.flames,carried:this.player.carried},
      lanterns:this.lanterns.map(l=>({...l,pos:posOut(l.pos)})),
      shades:this.shades.map(s=>({id:s.id,pos:posOut(s.pos),state:s.state})),motes_active:this.motes.length,
      motes:this.motes.map(m=>({id:m.id,pos:posOut(m.pos)}))};
  }
  end(){return {type:'end',ticks:this.tick,state:this.state,score:this.score};}
}
