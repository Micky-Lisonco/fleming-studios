
let ctx:AudioContext|null=null;
function gc():AudioContext{if(!ctx)ctx=new(window.AudioContext||(window as any).webkitAudioContext)();if(ctx.state==="suspended")ctx.resume();return ctx;}
let droneOn=false;let droneGains:GainNode[]=[];let droneOscs:OscillatorNode[]=[];
export function startAmbient(){if(droneOn)return;droneOn=true;const c=gc();
  // Layer 1: Deep evolving pad — shifts between mysterious and doomsday
  const freqs=[48,72,96,144,192];
  freqs.forEach((f,i)=>{
    const o=c.createOscillator(),g=c.createGain(),fi=c.createBiquadFilter();
    o.type=i%3===0?"sine":i%3===1?"triangle":"sine";o.frequency.value=f;
    fi.type="lowpass";fi.frequency.value=250+i*40;
    g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(0.018-i*0.002,c.currentTime+5);
    o.connect(fi);fi.connect(g);g.connect(c.destination);o.start();
    droneOscs.push(o);droneGains.push(g);
    // Slow frequency modulation — creates shifting eerie feeling
    const lfo=c.createOscillator();const lfoG=c.createGain();
    lfo.type="sine";lfo.frequency.value=0.03+i*0.01;lfoG.gain.value=f*0.04;
    lfo.connect(lfoG);lfoG.connect(o.frequency);lfo.start();
  });
  // Layer 2: Sub bass pulse
  const sub=c.createOscillator(),sg=c.createGain();
  sub.type="sine";sub.frequency.value=32;sg.gain.setValueAtTime(0,c.currentTime);sg.gain.linearRampToValueAtTime(0.025,c.currentTime+6);
  const subLfo=c.createOscillator(),subLfoG=c.createGain();subLfo.type="sine";subLfo.frequency.value=0.15;subLfoG.gain.value=0.012;
  subLfo.connect(subLfoG);subLfoG.connect(sg.gain);subLfo.start();
  sub.connect(sg);sg.connect(c.destination);sub.start();
  // Layer 3: Metallic resonance — eerie overtones
  [220,330,440].forEach((f,i)=>{
    const o=c.createOscillator(),g=c.createGain(),fi=c.createBiquadFilter();
    o.type="sawtooth";o.frequency.value=f;fi.type="bandpass";fi.frequency.value=f;fi.Q.value=20;
    g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(0.003,c.currentTime+8);
    o.connect(fi);fi.connect(g);g.connect(c.destination);o.start();
    const lfo=c.createOscillator(),lg=c.createGain();lfo.type="sine";lfo.frequency.value=0.05+i*0.02;lg.gain.value=f*0.03;
    lfo.connect(lg);lg.connect(o.frequency);lfo.start();
  });
}
// Flamingo game music — upbeat quirky
let gameMusic:OscillatorNode[]=[];let gameMusicOn=false;
export function startGameMusic(){if(gameMusicOn)return;gameMusicOn=true;const c=gc();
  const notes=[262,294,330,349,392,440,494,523];let idx=0;
  const melody=c.createOscillator(),mg=c.createGain(),mf=c.createBiquadFilter();
  melody.type="square";melody.frequency.value=notes[0];mf.type="lowpass";mf.frequency.value=800;
  mg.gain.value=0.04;melody.connect(mf);mf.connect(mg);mg.connect(c.destination);melody.start();gameMusic.push(melody);
  // Step through notes
  const step=()=>{if(!gameMusicOn)return;idx=(idx+1)%notes.length;
    melody.frequency.setTargetAtTime(notes[idx],c.currentTime,0.05);setTimeout(step,250+Math.random()*150);};step();
  // Percussion
  const kick=()=>{if(!gameMusicOn)return;const o=c.createOscillator(),g=c.createGain();
    o.type="sine";o.frequency.setValueAtTime(150,c.currentTime);o.frequency.exponentialRampToValueAtTime(40,c.currentTime+0.1);
    g.gain.setValueAtTime(0.06,c.currentTime);g.gain.linearRampToValueAtTime(0,c.currentTime+0.15);
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.2);setTimeout(kick,500);};kick();
  // Bass line
  const bass=c.createOscillator(),bg=c.createGain();bass.type="triangle";bass.frequency.value=130;bg.gain.value=0.03;
  bass.connect(bg);bg.connect(c.destination);bass.start();gameMusic.push(bass);
  const bassStep=()=>{if(!gameMusicOn)return;bass.frequency.setTargetAtTime(notes[idx%4]*0.5,c.currentTime,0.08);setTimeout(bassStep,500);};bassStep();
}
export function stopGameMusic(){gameMusicOn=false;gameMusic.forEach(o=>{try{o.stop();}catch(e){}});gameMusic=[];}
export function playDoorApproach(color:number){const c=gc();const fq={0x00D4FF:220,0x8B5CF6:196,0xFFB800:246,0x00E5B0:261,0xC0692E:277,0x00FFD0:293}[color]||220;const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.setValueAtTime(fq,c.currentTime);o.frequency.linearRampToValueAtTime(fq*1.5,c.currentTime+0.4);g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(0.18,c.currentTime+0.05);g.gain.linearRampToValueAtTime(0,c.currentTime+0.55);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.6);}
export function playRoomEnter(){const c=gc();const buf=c.createBuffer(1,c.sampleRate*1.2,c.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(c.sampleRate*0.4));const s=c.createBufferSource(),g=c.createGain(),fi=c.createBiquadFilter();fi.type="bandpass";fi.frequency.value=800;fi.Q.value=0.5;s.buffer=buf;g.gain.setValueAtTime(0.35,c.currentTime);g.gain.linearRampToValueAtTime(0,c.currentTime+1.2);s.connect(fi);fi.connect(g);g.connect(c.destination);s.start();const o=c.createOscillator(),og=c.createGain();o.type="sine";o.frequency.setValueAtTime(120,c.currentTime);o.frequency.exponentialRampToValueAtTime(880,c.currentTime+0.6);og.gain.setValueAtTime(0.15,c.currentTime);og.gain.linearRampToValueAtTime(0,c.currentTime+0.7);o.connect(og);og.connect(c.destination);o.start();o.stop(c.currentTime+0.8);}
export function playShoot(){const c=gc();[{f:800,f2:200,t:0.15,v:0.25,tp:"sine"},{f:1400,f2:400,t:0.12,v:0.1,tp:"triangle"}].forEach(({f,f2,t,v,tp})=>{const o=c.createOscillator(),g=c.createGain();o.type=tp as OscillatorType;o.frequency.setValueAtTime(f,c.currentTime);o.frequency.exponentialRampToValueAtTime(f2,c.currentTime+t);g.gain.setValueAtTime(v,c.currentTime);g.gain.linearRampToValueAtTime(0,c.currentTime+t+0.05);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+t+0.07);});}
export function playFlamingoHit(){const c=gc();[523,659,784,1046].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(0,c.currentTime+i*0.06);g.gain.linearRampToValueAtTime(0.1,c.currentTime+i*0.06+0.03);g.gain.linearRampToValueAtTime(0,c.currentTime+i*0.06+0.4);o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*0.06);o.stop(c.currentTime+i*0.06+0.5);});}
let lastStep=0;
export function playStep(t:number){if(t-lastStep<0.38)return;lastStep=t;const c=gc();const buf=c.createBuffer(1,c.sampleRate*0.07,c.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length)*0.3;const s=c.createBufferSource(),g=c.createGain(),fi=c.createBiquadFilter();fi.type="highpass";fi.frequency.value=200;s.buffer=buf;g.gain.value=0.07;s.connect(fi);fi.connect(g);g.connect(c.destination);s.start();}
