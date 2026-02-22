
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { makeDoorTexture } from "./door-textures";
import { makeNewsTexture } from "./news-screens";
import { playStep, playDoorApproach } from "./sound";

export const DOOR_CONFIG=[
  {pos:[0,0,-18] as [number,number,number],rot:0,         color:0x00D4FF,hex:"#00D4FF",label:"BRANDING & IDENTITY", sub:"Visual systems that command attention",  room:"branding"},
  {pos:[-9,0,-30] as [number,number,number],rot:Math.PI/7, color:0x8B5CF6,hex:"#8B5CF6",label:"WEBSITES & DIGITAL",  sub:"Experiences built to convert",           room:"websites"},
  {pos:[9,0,-30]  as [number,number,number],rot:-Math.PI/7,color:0xFFB800,hex:"#FFB800",label:"CONTENT PRODUCTION",  sub:"Volume without compromise",              room:"content"},
  {pos:[-6,0,-50] as [number,number,number],rot:Math.PI/10,color:0x00E5B0,hex:"#00E5B0",label:"CAMPAIGN CREATIVE",   sub:"Campaigns built to perform",             room:"campaigns"},
  {pos:[6,0,-50]  as [number,number,number],rot:-Math.PI/10,color:0xC0692E,hex:"#C0692E",label:"AI PRODUCTION",      sub:"The future of creative output",          room:"ai"},
  {pos:[0,0,-75]  as [number,number,number],rot:0,          color:0x00FFD0,hex:"#00FFD0",label:"??? SECRET ROOM",    sub:"Only the curious find this",             room:"secret"},
];

export class StudioEngine{
  canvas:HTMLCanvasElement;renderer:THREE.WebGLRenderer;scene:THREE.Scene;
  camera:THREE.PerspectiveCamera;clock:THREE.Clock;
  rafId=0;disposed=false;
  yaw=0;pitch=0;camPos=new THREE.Vector3(0,1.8,8);
  mouseBtn=false;
  keys={w:false,s:false,a:false,d:false};
  neonStrips:THREE.Mesh[]=[];doorGlows:THREE.PointLight[]=[];portalMeshes:THREE.Mesh[]=[];
  nearDoor:string|null=null;
  dustParticles:THREE.Points|null=null;
  holoColumns:THREE.Group[]=[];
  floorTrails:THREE.Mesh[]=[];
  doorIcons:THREE.Group[]=[];
  headBobPhase=0;
  // New features
  neuralNet:{nodes:THREE.Mesh[],lines:THREE.Line[],pulses:THREE.Mesh[]}={nodes:[],lines:[],pulses:[]};
  aiBrain:THREE.Group|null=null;
  dataStreams:THREE.Mesh[]=[];
  drones:THREE.Group[]=[];
  doorPreviews:THREE.Group[]=[];
  welcomeText:THREE.Mesh|null=null;welcomeProgress=0;welcomeDone=false;
  starField:THREE.Points|null=null;
  aiNear=false;aiSpoken=false;
  onDoorNear:(r:string|null,h:string)=>void=()=>{};
  onAINear:(near:boolean)=>void=()=>{};

  constructor(canvas:HTMLCanvasElement,onDoorNear:(r:string|null,h:string)=>void,onAINear?:(near:boolean)=>void){
    this.canvas=canvas;this.onDoorNear=onDoorNear;if(onAINear)this.onAINear=onAINear;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth,window.innerHeight);
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.4;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(72,window.innerWidth/window.innerHeight,0.1,400);
    this.camera.position.copy(this.camPos);this.clock=new THREE.Clock();
    this.scene.background=new THREE.Color(0x000205);this.scene.fog=new THREE.FogExp2(0x000205,0.011);
    this.buildRoom();this.buildCeiling();this.buildLighting();this.buildDoors();
    this.buildNewsScreens();this.buildLogoDisplay();
    this.buildDustParticles();this.buildHoloColumns();this.buildFloorTrails();this.buildDoorIcons();
    this.buildNeuralNet();this.buildAIBrain();this.buildDataStreams();this.buildDrones();
    this.buildDoorPreviews();this.buildStarField();
    this.scene.add(this.camera);
    this.bindEvents();
  }

  buildRoom(){
    const W=26,H=8,L=160;
    // Glass floor — transparent
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,L),new THREE.MeshStandardMaterial({color:0x020408,roughness:0.005,metalness:0.98,transparent:true,opacity:0.4}));
    floor.rotation.x=-Math.PI/2;floor.position.set(0,0,-L/2+12);this.scene.add(floor);
    // Deep ocean below the floor — animated water
    const oceanGeo=new THREE.PlaneGeometry(W+30,L+50,40,40);
    const ocean=new THREE.Mesh(oceanGeo,new THREE.MeshStandardMaterial({color:0x003060,roughness:0.2,metalness:0.5,emissive:new THREE.Color(0x004080),emissiveIntensity:0.6,transparent:true,opacity:0.9}));
    ocean.rotation.x=-Math.PI/2;ocean.position.set(0,-12,-L/2+12);this.scene.add(ocean);
    this.scene.userData.oceanGeo=oceanGeo;
    // Sky above — gradient dome
    const skyGeo=new THREE.SphereGeometry(120,32,16,0,Math.PI*2,0,Math.PI/2);
    const skyCv=document.createElement("canvas");skyCv.width=512;skyCv.height=256;const skCtx=skyCv.getContext("2d")!;
    const skyGrad=skCtx.createLinearGradient(0,0,0,256);
    skyGrad.addColorStop(0,"#0a1628");skyGrad.addColorStop(0.3,"#0d2040");skyGrad.addColorStop(0.6,"#1a3050");skyGrad.addColorStop(1,"#2a4a6a");
    skCtx.fillStyle=skyGrad;skCtx.fillRect(0,0,512,256);
    // Stars
    for(let i=0;i<80;i++){skCtx.fillStyle=`rgba(255,255,255,${0.3+Math.random()*0.5})`;skCtx.beginPath();skCtx.arc(Math.random()*512,Math.random()*128,Math.random()*1.5+0.5,0,Math.PI*2);skCtx.fill();}
    const skyMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(skyCv),side:THREE.BackSide,transparent:true,opacity:0.5});
    const sky=new THREE.Mesh(skyGeo,skyMat);sky.position.set(0,0,-L/2+12);this.scene.add(sky);
    // Stronger underwater lighting
    [[-8,-4,-15,0x0088CC,5,70],[8,-4,-40,0x0077BB,4,60],[0,-3,-65,0x0099DD,5,65],[-6,-3,-90,0x0088CC,3,50],[6,-5,-110,0x006699,3,50]].forEach(([x,y,z,col,int,dist])=>{
      const l=new THREE.PointLight(col as number,int as number,dist as number);l.position.set(x as number,y as number,z as number);this.scene.add(l);});
    // Additional corridor ambient lights — brighter overall
    [[-5,6,-20,0xC0692E,1.5,25],[5,6,-50,0xC0692E,1.5,25],[0,6,-80,0xC0692E,1,20]].forEach(([x,y,z,col,int,dist])=>{
      const l=new THREE.PointLight(col as number,int as number,dist as number);l.position.set(x as number,y as number,z as number);this.scene.add(l);});
    // Caustic beams
    for(let i=0;i<10;i++){
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.15+Math.random()*0.3,0.5+Math.random()*0.4,10,6,1,true),new THREE.MeshBasicMaterial({color:0x00AAFF,transparent:true,opacity:0.03,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
      beam.position.set((Math.random()-0.5)*22,-5,-5-i*15);beam.rotation.z=Math.random()*0.3-0.15;this.scene.add(beam);
    }
    // Load GLB animated sharks
    // Load GLB animated sharks — load once, instantiate multiple
    const sharkLoader=new GLTFLoader();
    const sharkMixers:THREE.AnimationMixer[]=[];
    const sharkModels:THREE.Object3D[]=[];
    const sharkSpawns=[{x:-8,y:-3,z:-25,vx:0.6,vz:0,s:0.12},{x:10,y:-5,z:-60,vx:-0.5,vz:0,s:0.15},{x:3,y:-2.5,z:-40,vx:0.7,vz:0.05,s:0.1},{x:-6,y:-4,z:-85,vx:0.4,vz:-0.03,s:0.13}];
    sharkLoader.load("/shark.glb",(gltf)=>{
      sharkSpawns.forEach(sd=>{
        const model=gltf.scene.clone(true);
        model.scale.setScalar(sd.s);
        model.position.set(sd.x,sd.y,sd.z);
        model.userData={vx:sd.vx,vz:sd.vz,baseY:sd.y,type:"shark"};
        // Ensure materials are visible
        model.traverse((child:any)=>{if(child.isMesh&&child.material){
          child.material=child.material.clone();
          child.material.emissive=new THREE.Color(0x1a3a5a);child.material.emissiveIntensity=0.3;
        }});
        // Animation mixer per clone
        if(gltf.animations.length>0){
          const mixer=new THREE.AnimationMixer(model);
          gltf.animations.forEach(clip=>{mixer.clipAction(clip.clone()).play();});
          sharkMixers.push(mixer);
        }
        this.scene.add(model);sharkModels.push(model);
      });
    },undefined,(err)=>{console.warn("Shark GLB failed:",err);});
    this.scene.userData.sharkMixers=sharkMixers;
    this.scene.userData.sharkModels=sharkModels;
    // Grid on glass
    const grid=new THREE.GridHelper(W,50,0x00D4FF,0x041020);grid.position.set(0,0.003,-L/2+12);
    (grid.material as THREE.LineBasicMaterial).transparent=true;(grid.material as THREE.LineBasicMaterial).opacity=0.1;this.scene.add(grid);
    const wm=new THREE.MeshStandardMaterial({color:0x04080f,roughness:0.92,metalness:0.08});
    [[-W/2,Math.PI/2],[W/2,-Math.PI/2]].forEach(([x,ry])=>{const w=new THREE.Mesh(new THREE.PlaneGeometry(L,H),wm.clone());w.rotation.y=ry as number;w.position.set(x as number,H/2,-L/2+12);this.scene.add(w);});
    const bk=new THREE.Mesh(new THREE.PlaneGeometry(W,H),wm.clone());bk.position.set(0,H/2,-L+12);this.scene.add(bk);
    const bm2=new THREE.MeshStandardMaterial({color:0x080d18,roughness:0.8,metalness:0.5});
    [-14,-24,-34,-44,-54,-64,-74,-88].forEach(z=>{const b=new THREE.Mesh(new THREE.BoxGeometry(W+0.4,0.35,0.5),bm2);b.position.set(0,H-0.17,z);this.scene.add(b);});
    const sc=[0x00D4FF,0x8B5CF6,0xFFB800,0x00E5B0,0xFF2D95,0x00D4FF,0x8B5CF6,0xFFB800];
    [-8,-18,-28,-38,-48,-58,-68,-80].forEach((z,i)=>{
      const col=sc[i%sc.length];const sm=new THREE.MeshStandardMaterial({color:0x000000,emissive:new THREE.Color(col),emissiveIntensity:2.5});
      [[-W/2+0.04,1.4],[W/2-0.04,1.4]].forEach(([x,y])=>{const s=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.07,8),sm.clone());s.position.set(x,y,z);this.scene.add(s);this.neonStrips.push(s);});
      const cs=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.05,10),sm.clone());cs.position.set(0,H-0.03,z);this.scene.add(cs);this.neonStrips.push(cs);
      const pl=new THREE.PointLight(col,0.9,16);pl.position.set(0,1.6,z);this.scene.add(pl);
    });
  }

  buildCeiling(){
    const H=8,W=26,L=160;
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(W,L),new THREE.MeshStandardMaterial({color:0x020408,roughness:0.85,metalness:0.3}));
    ceil.rotation.x=Math.PI/2;ceil.position.set(0,H,-L/2+12);this.scene.add(ceil);
    const cg=new THREE.GridHelper(W,30,0x8B5CF6,0x0a0520);cg.position.set(0,H-0.02,-L/2+12);
    (cg.material as THREE.LineBasicMaterial).transparent=true;(cg.material as THREE.LineBasicMaterial).opacity=0.22;this.scene.add(cg);
    for(let zi=0;zi<10;zi++){for(let xi=0;xi<3;xi++){
      const px=(xi-1)*8,pz=-8-zi*14,ecol=[0x00D4FF,0x8B5CF6,0xFFB800][xi];
      const em=new THREE.MeshStandardMaterial({color:0x000,emissive:new THREE.Color(ecol),emissiveIntensity:0.5});
      [[7.1,0],[0,12.1],[0,-12.1],[-7.1,0]].forEach(([dx,dz],si)=>{const isH=si>1;const eg=isH?new THREE.BoxGeometry(7.2,0.04,0.05):new THREE.BoxGeometry(0.05,0.04,12.2);const eb=new THREE.Mesh(eg,em.clone());eb.position.set(px+dx,H-0.03,pz+dz);this.scene.add(eb);});
    }}
    const b1=new THREE.Mesh(new THREE.BoxGeometry(W,0.04,1.4),new THREE.MeshBasicMaterial({color:0x00D4FF,transparent:true,opacity:0.28}));
    b1.position.set(0,H-0.03,0);b1.userData={speed:0.2};this.scene.add(b1);
    const b2=new THREE.Mesh(new THREE.BoxGeometry(W,0.04,1.1),new THREE.MeshBasicMaterial({color:0xFF2D95,transparent:true,opacity:0.16}));
    b2.position.set(0,H-0.03,-55);b2.userData={speed:0.08};this.scene.add(b2);
    this.scene.userData.ceilBars=[b1,b2];
    [0,-22,-44,-66].forEach((z,i)=>{
      const cols=[0x00D4FF,0x8B5CF6,0xFFB800,0x00E5B0];
      const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.3,1.0,H,8,1,true),new THREE.MeshBasicMaterial({color:cols[i],transparent:true,opacity:0.03,side:THREE.BackSide}));
      sh.position.set(0,H/2,z);this.scene.add(sh);
      const pl=new THREE.PointLight(cols[i],1.6,15);pl.position.set(0,H-0.5,z);this.scene.add(pl);
    });
    const cCv=document.createElement("canvas");cCv.width=512;cCv.height=2048;const ctx=cCv.getContext("2d")!;
    ctx.fillStyle="#000010";ctx.fillRect(0,0,512,2048);
    const lines=["EPISODE I","","THE SIGNAL","NOT THE NOISE","","In a world rebuilt from ruin,","one studio stands.","","FLEMING STUDIOS","","Brands are FORGED.","Not born.","","In fire. In data.","In creative will.","","Five doors.","Five disciplines.","One mission:","Make your mark.","","Walk forward.","Choose your path.","","FLEMINGSTUDIOS.EU","","",""];
    ctx.textAlign="center";let cy=80;
    lines.forEach(l=>{if(["EPISODE I","FLEMING STUDIOS","THE SIGNAL","NOT THE NOISE"].includes(l)){ctx.font="bold 38px system-ui";ctx.fillStyle="#00D4FF";}else if(l==="FLEMINGSTUDIOS.EU"){ctx.font="bold 26px system-ui";ctx.fillStyle="#FF2D95";}else if(l.length>0&&l===l.toUpperCase()&&l.length<20){ctx.font="bold 28px system-ui";ctx.fillStyle="#FFB800";}else{ctx.font="18px system-ui";ctx.fillStyle="rgba(245,241,232,0.5)";}if(l)ctx.fillText(l,256,cy);cy+=l?48:22;});
    const ct=new THREE.CanvasTexture(cCv);ct.wrapT=THREE.RepeatWrapping;
    const crawl=new THREE.Mesh(new THREE.PlaneGeometry(13,L),new THREE.MeshBasicMaterial({map:ct,transparent:true,opacity:0.48,depthWrite:false}));
    crawl.rotation.x=Math.PI/2;crawl.position.set(0,H-0.01,-L/2+20);crawl.userData={crawlOffset:0};this.scene.add(crawl);this.scene.userData.crawl=crawl;
  }

  buildLighting(){
    this.scene.add(new THREE.AmbientLight(0x020510,1.3));
    const v=new THREE.PointLight(0x00D4FF,5,130);v.position.set(0,2,-95);this.scene.add(v);
    const rim=new THREE.DirectionalLight(0x8B5CF6,0.25);rim.position.set(0,10,5);this.scene.add(rim);
  }

  buildDoors(){
    const DW=4.5,DH=5.5;
    DOOR_CONFIG.forEach(d=>{
      const col=new THREE.Color(d.color);const[px,,pz]=d.pos;const rot=d.rot;
      const fm=new THREE.MeshStandardMaterial({color:0x000,emissive:col,emissiveIntensity:1.0,roughness:0.1,metalness:0.95});
      [{g:new THREE.BoxGeometry(DW+0.4,0.12,0.12),p:[px,DH,pz]},{g:new THREE.BoxGeometry(DW+0.4,0.12,0.12),p:[px,0.06,pz]},{g:new THREE.BoxGeometry(0.12,DH,0.12),p:[px-DW/2,DH/2,pz]},{g:new THREE.BoxGeometry(0.12,DH,0.12),p:[px+DW/2,DH/2,pz]}].forEach(({g,p})=>{const m=new THREE.Mesh(g,fm.clone());m.position.set(p[0],p[1],p[2]);m.rotation.y=rot;this.scene.add(m);});
      if(d.room==="secret"){
        // Living portal — animated swirling canvas
        const pCv=document.createElement("canvas");pCv.width=512;pCv.height=512;
        const portalTex=new THREE.CanvasTexture(pCv);
        const portal=new THREE.Mesh(new THREE.PlaneGeometry(DW,DH),new THREE.MeshBasicMaterial({map:portalTex,transparent:true,opacity:0.95}));
        portal.position.set(px,DH/2,pz);portal.rotation.y=rot;this.scene.add(portal);this.portalMeshes.push(portal);
        // Store for animation
        portal.userData.portalCanvas=pCv;portal.userData.portalCtx=pCv.getContext("2d")!;portal.userData.isPortal=true;
        // Glowing ring around portal
        const ringMat=new THREE.MeshBasicMaterial({color:0x00FFD0,transparent:true,opacity:0.25,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
        const ring1=new THREE.Mesh(new THREE.TorusGeometry(3.2,0.06,8,48),ringMat);ring1.position.set(px,DH/2,pz);ring1.rotation.y=rot;this.scene.add(ring1);
        const ring2=new THREE.Mesh(new THREE.TorusGeometry(2.8,0.04,8,48),ringMat.clone());ring2.position.set(px,DH/2,pz);ring2.rotation.y=rot;this.scene.add(ring2);
        portal.userData.ring1=ring1;portal.userData.ring2=ring2;
        // Extra particles around portal
        for(let i=0;i<15;i++){const sp=new THREE.Mesh(new THREE.SphereGeometry(0.03,4,4),new THREE.MeshBasicMaterial({color:0x00FFD0,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending}));
          const a=i*Math.PI*2/15;sp.position.set(px+Math.cos(a)*2.5,DH/2+Math.sin(a)*2.5,pz+0.1);sp.userData={angle:a,speed:0.3+Math.random()*0.5};this.scene.add(sp);this.scene.userData.portalParticles=(this.scene.userData.portalParticles||[]);(this.scene.userData.portalParticles as THREE.Mesh[]).push(sp);}
      } else {
        const portal=new THREE.Mesh(new THREE.PlaneGeometry(DW,DH),new THREE.MeshBasicMaterial({map:makeDoorTexture(d.room,d.hex),transparent:true,opacity:0.92}));
        portal.position.set(px,DH/2,pz);portal.rotation.y=rot;this.scene.add(portal);this.portalMeshes.push(portal);
      }
      const ring=new THREE.Mesh(new THREE.PlaneGeometry(DW+2,DH+2),new THREE.MeshBasicMaterial({color:d.color,transparent:true,opacity:0.07,side:THREE.DoubleSide}));
      ring.position.set(px,DH/2,pz);ring.rotation.y=rot;this.scene.add(ring);
      const pud=new THREE.Mesh(new THREE.PlaneGeometry(4,10),new THREE.MeshBasicMaterial({color:d.color,transparent:true,opacity:0.06}));
      pud.rotation.x=-Math.PI/2;pud.position.set(px,0.005,pz+4);this.scene.add(pud);
      const gl=new THREE.PointLight(d.color,5,18);gl.position.set(px,DH/2,pz+1.5);this.scene.add(gl);this.doorGlows.push(gl);
      const lblCv=document.createElement("canvas");lblCv.width=512;lblCv.height=128;const lc=lblCv.getContext("2d")!;lc.clearRect(0,0,512,128);
      lc.font="bold 32px system-ui";lc.fillStyle=d.hex;lc.textAlign="center";lc.fillText(d.label,256,50);
      lc.font="17px system-ui";lc.fillStyle=d.hex+"99";lc.fillText(d.sub,256,85);
      const lbl=new THREE.Mesh(new THREE.PlaneGeometry(5.5,1.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(lblCv),transparent:true,side:THREE.FrontSide}));
      lbl.position.set(px,DH+1.0,pz);lbl.rotation.y=rot;this.scene.add(lbl);
    });
  }

  buildNewsScreens(){
    const positions=[{x:-12.4,z:-10,rot:Math.PI/2},{x:12.4,z:-10,rot:-Math.PI/2},{x:-12.4,z:-25,rot:Math.PI/2},{x:12.4,z:-25,rot:-Math.PI/2},{x:-12.4,z:-42,rot:Math.PI/2},{x:12.4,z:-42,rot:-Math.PI/2},{x:-12.4,z:-60,rot:Math.PI/2},{x:12.4,z:-60,rot:-Math.PI/2},{x:-12.4,z:-75,rot:Math.PI/2},{x:12.4,z:-75,rot:-Math.PI/2}];
    positions.forEach((p,i)=>{
      const bezel=new THREE.Mesh(new THREE.BoxGeometry(4.8,3.1,0.09),new THREE.MeshStandardMaterial({color:0x050810,roughness:0.2,metalness:0.9,emissive:new THREE.Color(0x111122),emissiveIntensity:0.4}));
      bezel.rotation.y=p.rot;bezel.position.set(p.x,3.2,p.z);this.scene.add(bezel);
      const sc=new THREE.Mesh(new THREE.PlaneGeometry(4.5,2.85),new THREE.MeshBasicMaterial({map:makeNewsTexture(i)}));
      sc.rotation.y=p.rot;sc.position.set(p.x+(p.rot>0?0.06:-0.06),3.2,p.z);this.scene.add(sc);
      const gc=i%3===0?0xFF4400:i%3===1?0xFFB800:0x00D4FF;
      const sg=new THREE.PointLight(gc,0.8,10);sg.position.set(p.x+(p.rot>0?-2:2),3.2,p.z);this.scene.add(sg);
    });
  }

  buildLogoDisplay(){
    const base=new THREE.Mesh(new THREE.PlaneGeometry(11,2.0),new THREE.MeshStandardMaterial({color:0x000,emissive:new THREE.Color(0x00D4FF),emissiveIntensity:0.05,transparent:true,opacity:0.7}));
    base.position.set(0,5.0,-3);this.scene.add(base);
    [4.2,5.8].forEach(y=>{const gl=new THREE.Mesh(new THREE.BoxGeometry(10,0.02,0.02),new THREE.MeshBasicMaterial({color:0x00D4FF,transparent:true,opacity:0.5}));gl.position.set(0,y,-3);this.scene.add(gl);});
    const ll=new THREE.PointLight(0x00D4FF,3,18);ll.position.set(0,5.0,-2);this.scene.add(ll);
    const loader=new THREE.TextureLoader();
    loader.load("/logo.png",(tex)=>{tex.colorSpace=THREE.SRGBColorSpace;const a=(tex.image.naturalWidth||300)/(tex.image.naturalHeight||100);const h=1.8,w=h*a;const logo=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));logo.position.set(0,5.0,-2.97);this.scene.add(logo);},undefined,()=>{const cv=document.createElement("canvas");cv.width=700;cv.height=160;const ctx=cv.getContext("2d")!;ctx.clearRect(0,0,700,160);ctx.font="bold 90px system-ui";ctx.fillStyle="#00D4FF";ctx.textAlign="center";ctx.fillText("FLEMING",350,88);ctx.font="bold 56px system-ui";ctx.fillStyle="#F5F1E8";ctx.fillText("STUDIOS",350,148);const logo=new THREE.Mesh(new THREE.PlaneGeometry(8,1.8),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));logo.position.set(0,5.0,-2.97);this.scene.add(logo);});
  }

  buildDustParticles(){
    const count=600;const geo=new THREE.BufferGeometry();
    const pos=new Float32Array(count*3);const sizes=new Float32Array(count);const colors=new Float32Array(count*3);
    const palette=[new THREE.Color(0x00D4FF),new THREE.Color(0x8B5CF6),new THREE.Color(0xFF2D95),new THREE.Color(0xFFB800),new THREE.Color(0x00E5B0)];
    for(let i=0;i<count;i++){
      pos[i*3]=(Math.random()-0.5)*24;pos[i*3+1]=Math.random()*8;pos[i*3+2]=-Math.random()*150+10;
      sizes[i]=Math.random()*3+1;const c=palette[Math.floor(Math.random()*palette.length)];
      colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
    }
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    geo.setAttribute("size",new THREE.BufferAttribute(sizes,1));
    geo.setAttribute("color",new THREE.BufferAttribute(colors,3));
    const mat=new THREE.PointsMaterial({size:0.06,vertexColors:true,transparent:true,opacity:0.35,blending:THREE.AdditiveBlending,depthWrite:false});
    this.dustParticles=new THREE.Points(geo,mat);this.scene.add(this.dustParticles);
  }

  buildHoloColumns(){
    const zPositions=[-12,-24,-38,-52,-66,-80];const cols=[0x00D4FF,0x8B5CF6,0xFFB800,0x00E5B0,0xFF2D95,0x00D4FF];
    zPositions.forEach((z,i)=>{
      const g=new THREE.Group();const col=new THREE.Color(cols[i]);
      // Solid pillar base
      const pillarMat=new THREE.MeshStandardMaterial({color:0x080d18,roughness:0.3,metalness:0.85,emissive:col,emissiveIntensity:0.08});
      const pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.35,7.5,8),pillarMat);pillar.position.y=3.75;g.add(pillar);
      // Glowing ring bands
      const ringMat=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.3,blending:THREE.AdditiveBlending});
      [1.5,3.5,5.5].forEach(ry=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(0.38,0.025,8,24),ringMat.clone());ring.position.y=ry;ring.rotation.x=Math.PI/2;g.add(ring);});
      // Top cap glow
      const capMat=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.15,blending:THREE.AdditiveBlending});
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.25,0.15,8),capMat);cap.position.y=7.5;g.add(cap);
      // Base glow disc
      const disc=new THREE.Mesh(new THREE.CircleGeometry(0.8,24),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.1,blending:THREE.AdditiveBlending}));
      disc.rotation.x=-Math.PI/2;disc.position.y=0.01;g.add(disc);
      const side=i%2===0?-10:10;g.position.set(side,0,z);this.scene.add(g);this.holoColumns.push(g);
      // Accent light
      const pl=new THREE.PointLight(cols[i],0.8,8);pl.position.set(side,3,z);this.scene.add(pl);
    });
  }

  buildFloorTrails(){
    DOOR_CONFIG.forEach(d=>{
      const col=new THREE.Color(d.color);
      // Pulsing light trail leading to each door
      const trailLen=6;const trailMat=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.08,blending:THREE.AdditiveBlending});
      const trail=new THREE.Mesh(new THREE.PlaneGeometry(0.8,trailLen),trailMat);
      trail.rotation.x=-Math.PI/2;
      const dir=new THREE.Vector3(d.pos[0],0,d.pos[2]).normalize();
      trail.position.set(d.pos[0]-dir.x*trailLen*0.5,0.005,d.pos[2]+trailLen*0.5);
      trail.userData={color:d.color,baseOpacity:0.08};
      this.scene.add(trail);this.floorTrails.push(trail);
    });
  }

  buildDoorIcons(){
    const iconBuilders:{[k:string]:(col:THREE.Color)=>THREE.Group}={
      branding:(col)=>{const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0x000,emissive:col,emissiveIntensity:2,roughness:0.1,metalness:0.9});
        const d=new THREE.Mesh(new THREE.OctahedronGeometry(0.35,0),m);g.add(d);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.015,8,32),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.4}));ring.rotation.x=Math.PI/2;g.add(ring);return g;},
      websites:(col)=>{const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0x000,emissive:col,emissiveIntensity:2,roughness:0.1,metalness:0.9});
        const frame=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.04),m);g.add(frame);
        const screen=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.35),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.3}));screen.position.z=0.025;g.add(screen);return g;},
      content:(col)=>{const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0x000,emissive:col,emissiveIntensity:2,roughness:0.1,metalness:0.9});
        const body=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.35,0.3),m);g.add(body);
        const lens=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.14,0.2,12),m);lens.rotation.x=Math.PI/2;lens.position.z=0.25;g.add(lens);return g;},
      campaigns:(col)=>{const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0x000,emissive:col,emissiveIntensity:2,roughness:0.1,metalness:0.9});
        const body=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.25,0.6,8),m);body.rotation.x=Math.PI/2;g.add(body);
        const cone=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.35,8),m);cone.position.y=0.35;g.add(cone);return g;},
      ai:(col)=>{const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0x000,emissive:col,emissiveIntensity:2,roughness:0.1,metalness:0.9});
        const core=new THREE.Mesh(new THREE.IcosahedronGeometry(0.2,1),m);g.add(core);
        for(let i=0;i<6;i++){const n=new THREE.Mesh(new THREE.SphereGeometry(0.06,8,8),m);const a=i*Math.PI*2/6;n.position.set(Math.cos(a)*0.45,Math.sin(a)*0.45,0);g.add(n);}
        return g;},
    };
    DOOR_CONFIG.forEach(d=>{
      const builder=iconBuilders[d.room];if(!builder)return;
      const col=new THREE.Color(d.color);const icon=builder(col);
      icon.position.set(d.pos[0],7.2,d.pos[2]);icon.userData={baseY:7.2,room:d.room};
      this.scene.add(icon);this.doorIcons.push(icon);
    });
  }

  // ═══ FEATURE 1: AI Neural Network on ceiling ═══
  buildNeuralNet(){
    const nodeCount=40;const nm=new THREE.MeshBasicMaterial({color:0x00D4FF,transparent:true,opacity:0.6});
    const positions:THREE.Vector3[]=[];
    for(let i=0;i<nodeCount;i++){
      const p=new THREE.Vector3((Math.random()-0.5)*20,7.2+Math.random()*0.6,-5-Math.random()*85);
      const node=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),nm.clone());
      node.position.copy(p);this.scene.add(node);this.neuralNet.nodes.push(node);positions.push(p);
    }
    // Connect nearby nodes
    const lineMat=new THREE.LineBasicMaterial({color:0x00D4FF,transparent:true,opacity:0.08});
    for(let i=0;i<nodeCount;i++){for(let j=i+1;j<nodeCount;j++){
      if(positions[i].distanceTo(positions[j])<12){
        const geo=new THREE.BufferGeometry().setFromPoints([positions[i],positions[j]]);
        const line=new THREE.Line(geo,lineMat.clone());this.scene.add(line);this.neuralNet.lines.push(line);
      }
    }}
    // Data pulses that travel along connections
    for(let i=0;i<8;i++){
      const pulse=new THREE.Mesh(new THREE.SphereGeometry(0.04,4,4),new THREE.MeshBasicMaterial({color:0x00D4FF,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending}));
      pulse.userData={lineIdx:Math.floor(Math.random()*this.neuralNet.lines.length),progress:Math.random()};
      this.scene.add(pulse);this.neuralNet.pulses.push(pulse);
    }
  }

  // ═══ FEATURE 2: AI Hologram Entity at entrance ═══
  buildAIBrain(){
    const g=new THREE.Group();
    // Load humanoid fly GLB model
    const loader=new GLTFLoader();
    loader.load("/humanoid_fly.glb",(gltf)=>{
      const model=gltf.scene;
      model.scale.setScalar(1.2);
      model.position.set(0,1.4,0);
      // Preserve original materials — only add subtle glow, don't change base colors
      model.traverse((child:any)=>{
        if(child.isMesh&&child.material){
          child.material=child.material.clone();
          child.material.emissive=child.material.color.clone().multiplyScalar(0.15);
          child.material.emissiveIntensity=0.3;
        }
      });
      g.add(model);
      g.userData.model=model;
    },undefined,()=>{
      // Fallback wireframe if GLB fails
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.35,12,10),new THREE.MeshBasicMaterial({color:0x00D4FF,wireframe:true,transparent:true,opacity:0.3}));
      head.position.y=2.9;g.add(head);
      const torso=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.4,1.2,8,1,true),new THREE.MeshBasicMaterial({color:0x8B5CF6,wireframe:true,transparent:true,opacity:0.2}));
      torso.position.y=2.0;g.add(torso);
    });
    // Glowing pedestal base
    const base=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1.0,0.2,24),new THREE.MeshStandardMaterial({color:0x040810,roughness:0.05,metalness:0.98,emissive:new THREE.Color(0x00D4FF),emissiveIntensity:0.3}));
    base.position.y=1.3;g.add(base);
    // Rotating holographic rings
    [1.35,1.6,1.85].forEach((ry,i)=>{
      const cols=[0x00D4FF,0x8B5CF6,0x00E5B0];
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.9+i*0.2,0.01,8,40),new THREE.MeshBasicMaterial({color:cols[i],transparent:true,opacity:0.2,blending:THREE.AdditiveBlending}));
      ring.rotation.x=Math.PI/2;ring.position.y=ry;ring.userData={speed:0.4+i*0.25};g.add(ring);
    });
    // Floating data particles
    for(let i=0;i<25;i++){
      const p=new THREE.Mesh(new THREE.BoxGeometry(0.025,0.025,0.025),new THREE.MeshBasicMaterial({color:0x00D4FF,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending}));
      const a=i*Math.PI*2/25;const r=1.0+Math.random()*0.5;
      p.position.set(Math.cos(a)*r,1.6+Math.random()*2.0,Math.sin(a)*r);
      p.userData={angle:a,radius:r,baseY:p.position.y,speed:0.4+Math.random()*0.6};
      g.add(p);
    }
    // Strong point light
    const bl=new THREE.PointLight(0x00D4FF,4,18);bl.position.set(0,2.5,0);g.add(bl);
    // Secondary purple underglow
    const bl2=new THREE.PointLight(0x8B5CF6,2,10);bl2.position.set(0,1.4,0);g.add(bl2);
    // Speech bubble — dynamic canvas for AI messages
    const sCv=document.createElement("canvas");sCv.width=640;sCv.height=160;
    const bubble=new THREE.Mesh(new THREE.PlaneGeometry(4.5,1.1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sCv),transparent:true,opacity:0,depthWrite:false}));
    bubble.position.set(0,4.2,0);g.add(bubble);
    g.position.set(0,0,3);
    g.userData={bubble,bubbleCanvas:sCv,bubbleCtx:sCv.getContext("2d")!,lastMessage:""};
    this.aiBrain=g;this.scene.add(g);
  }

  // Update AI speech bubble text
  updateAIBubble(text:string){
    if(!this.aiBrain)return;
    const u=this.aiBrain.userData;if(u.lastMessage===text)return;
    u.lastMessage=text;
    const c=u.bubbleCtx as CanvasRenderingContext2D;const cv=u.bubbleCanvas as HTMLCanvasElement;
    c.clearRect(0,0,640,160);
    c.fillStyle="rgba(0,4,12,0.82)";c.fillRect(0,0,640,160);
    c.strokeStyle="#00D4FF44";c.lineWidth=1.5;c.strokeRect(2,2,636,156);
    // Top accent line
    c.fillStyle="#00D4FF";c.fillRect(0,0,640,2);
    // AI label
    c.font="bold 11px system-ui";c.fillStyle="#00D4FF66";c.textAlign="left";c.fillText("FLEMING AI",16,22);
    // Message text — word wrap
    c.font="15px system-ui";c.fillStyle="#00D4FF";
    const words=text.split(" ");let line="";let y=50;
    words.forEach(w=>{const test=line+(line?" ":"")+w;
      if(c.measureText(test).width>600){c.fillText(line,16,y);line=w;y+=22;}else line=test;});
    if(line)c.fillText(line,16,y);
    (u.bubble.material as THREE.MeshBasicMaterial).map!.needsUpdate=true;
  }

  // ═══ FEATURE 3: Data Stream / Matrix walls ═══
  buildDataStreams(){
    const chars="01アイデータ品質革新AIMLNNGPTΔΣΩλ∞</>{}::";
    [[-12.8,Math.PI/2],[12.8,-Math.PI/2]].forEach(([x,ry],wi)=>{
      const cv=document.createElement("canvas");cv.width=1024;cv.height=512;const c=cv.getContext("2d")!;
      c.fillStyle="#000205";c.fillRect(0,0,1024,512);
      c.font="14px monospace";
      // Create columns of characters
      for(let col=0;col<60;col++){
        const cx=col*17+4;const hue=wi===0?180:270;
        for(let row=0;row<35;row++){
          const a=Math.random();if(a<0.3)continue;
          c.fillStyle=`hsla(${hue},80%,60%,${0.05+a*0.2})`;
          c.fillText(chars[Math.floor(Math.random()*chars.length)],cx,row*15+12);
        }
      }
      const tex=new THREE.CanvasTexture(cv);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(80,6),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0.35,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
      mesh.rotation.y=ry as number;mesh.position.set(x as number,4.5,-40);
      mesh.userData={scrollSpeed:0.015+wi*0.005};
      this.scene.add(mesh);this.dataStreams.push(mesh);
    });
  }

  // ═══ FEATURE 4: Ambient Patrol Drones ═══
  buildDrones(){
    const droneCols=[0x00D4FF,0x8B5CF6,0x00E5B0];
    for(let i=0;i<3;i++){
      const g=new THREE.Group();
      const bodyMat=new THREE.MeshStandardMaterial({color:0x080d18,roughness:0.1,metalness:0.95,emissive:new THREE.Color(droneCols[i]),emissiveIntensity:0.3});
      // Octahedron body
      const body=new THREE.Mesh(new THREE.OctahedronGeometry(0.25,0),bodyMat);g.add(body);
      // Scanner ring
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.01,6,24),new THREE.MeshBasicMaterial({color:droneCols[i],transparent:true,opacity:0.4}));
      ring.rotation.x=Math.PI/2;g.add(ring);
      // Eye light
      const eye=new THREE.PointLight(droneCols[i],1.5,8);eye.position.set(0,-0.2,0);g.add(eye);
      // Patrol path data
      const cx=(i-1)*8;const cz=-15-i*22;
      g.position.set(cx,5.5,cz);
      g.userData={cx,cz,radius:4+i*2,speed:0.2+i*0.08,phase:i*Math.PI*2/3};
      this.scene.add(g);this.drones.push(g);
    }
  }

  // ═══ FEATURE 5: Interactive Door Previews ═══
  buildDoorPreviews(){
    const icons:{[k:string]:string}={branding:"◆ BRAND",websites:"⬡ WEB",content:"▶ CONTENT",campaigns:"⚡ CAMPAIGNS",ai:"⊛ A.I.",secret:"? ? ?"};
    DOOR_CONFIG.forEach(d=>{
      const g=new THREE.Group();
      // Holographic preview panel
      const cv=document.createElement("canvas");cv.width=256;cv.height=128;const c=cv.getContext("2d")!;
      c.fillStyle="rgba(0,2,5,0.7)";c.fillRect(0,0,256,128);
      c.strokeStyle=d.hex+"66";c.lineWidth=1;c.strokeRect(2,2,252,124);
      c.font="bold 22px system-ui";c.fillStyle=d.hex;c.textAlign="center";c.fillText(icons[d.room]||d.label,128,50);
      c.font="11px system-ui";c.fillStyle=d.hex+"88";c.fillText(d.sub,128,80);
      c.fillStyle=d.hex+"22";c.fillRect(10,100,236,3);
      // Animated scan line position stored
      const tex=new THREE.CanvasTexture(cv);
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(2.5,1.2),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0,blending:THREE.AdditiveBlending}));
      panel.position.set(d.pos[0],5.8,d.pos[2]);panel.rotation.y=d.rot;
      // Small particles around preview
      const sparkGeo=new THREE.BufferGeometry();const sp=new Float32Array(18);
      for(let j=0;j<6;j++){sp[j*3]=(Math.random()-0.5)*1.5;sp[j*3+1]=(Math.random()-0.5)*0.8;sp[j*3+2]=(Math.random()-0.5)*0.3;}
      sparkGeo.setAttribute("position",new THREE.BufferAttribute(sp,3));
      const sparks=new THREE.Points(sparkGeo,new THREE.PointsMaterial({color:d.color,size:0.04,transparent:true,opacity:0,blending:THREE.AdditiveBlending}));
      sparks.position.copy(panel.position);
      g.add(panel);g.add(sparks);
      g.userData={room:d.room,panel,sparks};
      this.scene.add(g);this.doorPreviews.push(g);
    });
  }

  // ═══ FEATURE 7: Parallax Starfield ═══
  buildStarField(){
    const count=400;const geo=new THREE.BufferGeometry();
    const pos=new Float32Array(count*3);const sizes=new Float32Array(count);
    for(let i=0;i<count;i++){
      pos[i*3]=(Math.random()-0.5)*60;pos[i*3+1]=Math.random()*8;pos[i*3+2]=-100-Math.random()*80;
      sizes[i]=Math.random()*2+0.5;
    }
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    geo.setAttribute("size",new THREE.BufferAttribute(sizes,1));
    const mat=new THREE.PointsMaterial({color:0x8B5CF6,size:0.08,transparent:true,opacity:0.25,blending:THREE.AdditiveBlending,depthWrite:false});
    this.starField=new THREE.Points(geo,mat);this.scene.add(this.starField);
  }

  bindEvents(){
    window.addEventListener("resize",this.onResize);window.addEventListener("mousemove",this.onMove);
    window.addEventListener("mousedown",this.onDown);window.addEventListener("mouseup",this.onUp);
    window.addEventListener("keydown",this.onKD);window.addEventListener("keyup",this.onKU);
    window.addEventListener("blur",this.resetKeys);window.addEventListener("focus",this.resetKeys);
    window.addEventListener("contextmenu",e=>e.preventDefault());
    document.addEventListener("visibilitychange",this.resetKeys);
    document.addEventListener("pointerlockchange",this.resetKeys);
    this.canvas.addEventListener("mouseenter",this.resetKeys);
    // Failsafe interval: if no keydown for 100ms but keys are true, reset
    this._keyCheck=setInterval(()=>{if(!document.hasFocus())this.resetKeys();},200);
  }
  _keyCheck:any=null;
  resetKeys=()=>{this.keys={w:false,s:false,a:false,d:false};this.mouseBtn=false;};
  onResize=()=>{this.camera.aspect=window.innerWidth/window.innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(window.innerWidth,window.innerHeight);};
  onMove=(e:MouseEvent)=>{if(this.mouseBtn){this.yaw-=e.movementX*0.0022;this.pitch-=e.movementY*0.0022;this.pitch=Math.max(-0.6,Math.min(0.6,this.pitch));}};
  onDown=(e:MouseEvent)=>{if(e.button===2)this.mouseBtn=true;};
  onUp=(e:MouseEvent)=>{if(e.button===2)this.mouseBtn=false;};
  onKD=(e:KeyboardEvent)=>{const c=e.code;if(c==="KeyW"||c==="ArrowUp")this.keys.w=true;if(c==="KeyS"||c==="ArrowDown")this.keys.s=true;if(c==="KeyA"||c==="ArrowLeft")this.keys.a=true;if(c==="KeyD"||c==="ArrowRight")this.keys.d=true;};
  onKU=(e:KeyboardEvent)=>{const c=e.code;if(c==="KeyW"||c==="ArrowUp")this.keys.w=false;if(c==="KeyS"||c==="ArrowDown")this.keys.s=false;if(c==="KeyA"||c==="ArrowLeft")this.keys.a=false;if(c==="KeyD"||c==="ArrowRight")this.keys.d=false;};

  updateCamera(delta:number){
    const qY=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),this.yaw);
    const qX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),this.pitch);
    this.camera.quaternion.copy(qY).multiply(qX);
    const sp=7*delta;const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);fwd.y=0;fwd.normalize();
    const right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);right.y=0;right.normalize();
    const mv=this.keys.w||this.keys.s||this.keys.a||this.keys.d;
    if(this.keys.w)this.camPos.addScaledVector(fwd,sp);if(this.keys.s)this.camPos.addScaledVector(fwd,-sp);
    if(this.keys.a)this.camPos.addScaledVector(right,-sp);if(this.keys.d)this.camPos.addScaledVector(right,sp);
    this.camPos.x=Math.max(-11,Math.min(11,this.camPos.x));this.camPos.y=1.8;this.camPos.z=Math.max(-150,Math.min(10,this.camPos.z));
    if(mv){this.headBobPhase+=delta*10;this.camPos.y=1.8+Math.sin(this.headBobPhase)*0.04;}else{this.headBobPhase=0;}
    this.camera.position.copy(this.camPos);
    if(mv)playStep(this.clock.elapsedTime);
    let found:string|null=null;let foundHex="#00D4FF";
    DOOR_CONFIG.forEach(d=>{if(this.camPos.distanceTo(new THREE.Vector3(d.pos[0],1.8,d.pos[2]))<3.5){found=d.room;foundHex=d.hex;}});
    if(found!==this.nearDoor){this.nearDoor=found;if(found)playDoorApproach(DOOR_CONFIG.find(d=>d.room===found)!.color);this.onDoorNear(found,foundHex);}
  }

  start(){
    this.clock.start();
    const loop=()=>{
      if(this.disposed)return;this.rafId=requestAnimationFrame(loop);
      const delta=this.clock.getDelta();const t=this.clock.elapsedTime;
      this.updateCamera(delta);
      this.neonStrips.forEach((s,i)=>{(s.material as THREE.MeshStandardMaterial).emissiveIntensity=1.8+Math.sin(t*1.1+i*0.35)*0.55;});
      this.doorGlows.forEach((g,i)=>{g.intensity=3.5+Math.sin(t*0.85+i*1.3)*1.5;});
      this.portalMeshes.forEach((p,i)=>{
        if(p.userData.isPortal){
          // Animate portal swirl
          const c=p.userData.portalCtx as CanvasRenderingContext2D;const cv=p.userData.portalCanvas as HTMLCanvasElement;
          c.fillStyle="rgba(0,5,15,0.92)";c.fillRect(0,0,512,512);
          for(let r=0;r<8;r++){const radius=40+r*28;const col=r%2===0?"#00FFD0":"#008B8B";
            c.strokeStyle=col;c.lineWidth=2+r*0.5;c.globalAlpha=0.15+Math.sin(t*1.5+r)*0.1;
            c.beginPath();c.arc(256,256,radius,t*0.8+r*0.4,t*0.8+r*0.4+Math.PI*1.5);c.stroke();
          }c.globalAlpha=1;
          // Center glow
          const cg=c.createRadialGradient(256,256,0,256,256,80);cg.addColorStop(0,"rgba(0,255,208,0.3)");cg.addColorStop(0.5,"rgba(0,139,139,0.1)");cg.addColorStop(1,"transparent");
          c.fillStyle=cg;c.fillRect(0,0,512,512);
          // Floating text
          c.font="bold 16px system-ui";c.fillStyle="#00FFD0";c.textAlign="center";c.globalAlpha=0.4+Math.sin(t*2)*0.2;
          c.fillText("ENTER IF YOU DARE",256,256);c.globalAlpha=1;
          (p.material as THREE.MeshBasicMaterial).map!.needsUpdate=true;
          // Rings rotate
          if(p.userData.ring1)p.userData.ring1.rotation.z=t*0.5;
          if(p.userData.ring2)p.userData.ring2.rotation.z=-t*0.7;
        } else {
          (p.material as THREE.MeshBasicMaterial).opacity=0.85+Math.sin(t*1.4+i*0.8)*0.1;
        }
      });
      // Portal particles orbit
      const pp=this.scene.userData.portalParticles as THREE.Mesh[]|undefined;
      if(pp){const sd=DOOR_CONFIG.find(d=>d.room==="secret");if(sd){pp.forEach(sp=>{sp.userData.angle+=sp.userData.speed*delta;const a=sp.userData.angle;sp.position.x=sd.pos[0]+Math.cos(a)*2.5;sp.position.y=2.75+Math.sin(a)*2.5;sp.position.z=sd.pos[2]+0.1+Math.sin(t+a)*0.1;});}};
      const bars=this.scene.userData.ceilBars as THREE.Mesh[]|undefined;
      if(bars){bars.forEach(b=>{b.position.z+=b.userData.speed;if(b.position.z>15)b.position.z=-155;});}
      const crawl=this.scene.userData.crawl as THREE.Mesh|undefined;
      if(crawl){crawl.userData.crawlOffset+=delta*0.85;const mat=crawl.material as THREE.MeshBasicMaterial;if(mat.map){mat.map.offset.y=crawl.userData.crawlOffset*0.018;mat.map.needsUpdate=true;}}
      // Dust particles drift
      if(this.dustParticles){const pa=this.dustParticles.geometry.attributes.position as THREE.BufferAttribute;for(let i=0;i<pa.count;i++){let y=pa.getY(i)+delta*0.15;let x=pa.getX(i)+Math.sin(t*0.3+i*0.1)*delta*0.08;if(y>8){y=0;x=(Math.random()-0.5)*24;}pa.setY(i,y);pa.setX(i,x);}pa.needsUpdate=true;}
      // Floor trails pulse
      this.floorTrails.forEach((tr,i)=>{const dist=this.camPos.distanceTo(new THREE.Vector3(DOOR_CONFIG[i].pos[0],1.8,DOOR_CONFIG[i].pos[2]));const prox=Math.max(0,1-dist/12);(tr.material as THREE.MeshBasicMaterial).opacity=0.05+prox*0.2+Math.sin(t*2+i)*0.03;});
      // Door icons float and rotate
      this.doorIcons.forEach((ic,i)=>{ic.rotation.y=t*0.6+i;ic.position.y=ic.userData.baseY+Math.sin(t*0.7+i*1.1)*0.2;});
      // ── Neural net pulses ──
      this.neuralNet.nodes.forEach((n,i)=>{(n.material as THREE.MeshBasicMaterial).opacity=0.3+Math.sin(t*1.5+i*0.4)*0.3;});
      this.neuralNet.pulses.forEach(p=>{const li=p.userData.lineIdx;if(li>=this.neuralNet.lines.length)return;
        p.userData.progress+=0.004;if(p.userData.progress>1){p.userData.progress=0;p.userData.lineIdx=Math.floor(Math.random()*this.neuralNet.lines.length);}
        const line=this.neuralNet.lines[li];const pa=line.geometry.attributes.position;
        if(pa&&pa.count>=2){const pr=p.userData.progress;
          p.position.set(pa.getX(0)+(pa.getX(1)-pa.getX(0))*pr,pa.getY(0)+(pa.getY(1)-pa.getY(0))*pr,pa.getZ(0)+(pa.getZ(1)-pa.getZ(0))*pr);}
      });
      // ── AI Entity animate ──
      if(this.aiBrain){
        // Rings rotate, particles orbit
        this.aiBrain.children.forEach(c=>{if(c.userData.speed)c.rotation.y+=c.userData.speed*delta;
          if(c.userData.angle!==undefined){const u=c.userData;u.angle+=u.speed*delta;c.position.x=Math.cos(u.angle)*u.radius;c.position.z=Math.sin(u.angle)*u.radius;c.position.y=u.baseY+Math.sin(t*2+u.angle)*0.15;}});
        // GLB model gentle hover and slow rotate
        const model=this.aiBrain.userData.model as THREE.Object3D|undefined;
        if(model){model.position.y=1.4+Math.sin(t*0.7)*0.12;model.rotation.y=t*0.15;}
        // Speech bubble proximity
        const bubble=this.aiBrain.userData.bubble as THREE.Mesh;
        const dist=this.camPos.distanceTo(this.aiBrain.position.clone().setY(1.8));
        const near=dist<5;
        if(bubble){const vis=Math.max(0,Math.min(1,(6-dist)/3));(bubble.material as THREE.MeshBasicMaterial).opacity=vis*0.9;bubble.lookAt(this.camPos);}
        // Proximity callback
        if(near&&!this.aiNear){this.aiNear=true;this.onAINear(true);}
        else if(!near&&this.aiNear){this.aiNear=false;this.onAINear(false);}
        // Glow intensifies when near
        this.aiBrain.children.forEach(c=>{if(c instanceof THREE.PointLight){c.intensity=near?6:4;}});
      }
      // ── Data streams scroll ──
      this.dataStreams.forEach(ds=>{const mat=ds.material as THREE.MeshBasicMaterial;if(mat.map){mat.map.offset.y+=ds.userData.scrollSpeed;mat.map.needsUpdate=true;}});
      // ── Drones patrol ──
      this.drones.forEach(d=>{const u=d.userData;const angle=t*u.speed+u.phase;
        d.position.x=u.cx+Math.cos(angle)*u.radius;d.position.z=u.cz+Math.sin(angle)*u.radius;
        d.position.y=5.5+Math.sin(t*1.2+u.phase)*0.3;d.rotation.y=angle+Math.PI;
        d.children.forEach(c=>{if(c instanceof THREE.Mesh&&c.geometry instanceof THREE.TorusGeometry)c.rotation.z=t*2;});});
      // ── Door previews proximity ──
      this.doorPreviews.forEach(g=>{const u=g.userData;const dCfg=DOOR_CONFIG.find(d=>d.room===u.room);if(!dCfg)return;
        const dist=this.camPos.distanceTo(new THREE.Vector3(dCfg.pos[0],1.8,dCfg.pos[2]));
        const vis=Math.max(0,Math.min(1,(8-dist)/5));
        (u.panel.material as THREE.MeshBasicMaterial).opacity=vis*0.7;
        (u.sparks.material as THREE.PointsMaterial).opacity=vis*0.5;
        if(vis>0){const spa=u.sparks.geometry.attributes.position as THREE.BufferAttribute;
          for(let i=0;i<spa.count;i++){let y=spa.getY(i)+0.01;if(y>0.5)y=-0.5;spa.setY(i,y);}spa.needsUpdate=true;}
      });
      // ── Starfield parallax ──
      if(this.starField){const pa=this.starField.geometry.attributes.position as THREE.BufferAttribute;
        const camZ=this.camPos.z;for(let i=0;i<pa.count;i++){
          const baseZ=-100-((i*137)%80);const parallax=(camZ-8)*0.15*(0.5+(i%3)*0.25);
          pa.setZ(i,baseZ+parallax+Math.sin(t*0.2+i*0.05)*0.5);}pa.needsUpdate=true;}
      // ── GLB sharks swim ──
      const sharkModels=this.scene.userData.sharkModels as THREE.Group[]|undefined;
      if(sharkModels){sharkModels.forEach(s=>{const u=s.userData;if(!u.vx)return;
        s.position.x+=u.vx*delta;s.position.z+=u.vz*delta;
        s.position.y=u.baseY+Math.sin(t*0.4+s.position.x*0.08)*0.4;
        if(s.position.x>25){s.position.x=-25;}if(s.position.x<-25){s.position.x=25;}
        if(s.position.z>15){s.position.z=-155;}if(s.position.z<-155){s.position.z=15;}
        s.rotation.y=u.vx>0?-Math.PI/2:Math.PI/2;
      });}
      const sharkMixers=this.scene.userData.sharkMixers as THREE.AnimationMixer[]|undefined;
      if(sharkMixers)sharkMixers.forEach(m=>m.update(delta));
      // Ocean wave animation
      const oceanGeo=this.scene.userData.oceanGeo as THREE.BufferGeometry|undefined;
      if(oceanGeo){const pa=oceanGeo.attributes.position as THREE.BufferAttribute;
        for(let i=0;i<pa.count;i++){const x=pa.getX(i);const z=pa.getZ(i);
          pa.setY(i,Math.sin(t*0.5+x*0.3)*0.15+Math.cos(t*0.3+z*0.2)*0.1);}pa.needsUpdate=true;oceanGeo.computeVertexNormals();}
      this.renderer.render(this.scene,this.camera);
    };
    loop();
  }
  dispose(){
    this.disposed=true;cancelAnimationFrame(this.rafId);
    if(this._keyCheck)clearInterval(this._keyCheck);
    ["resize","mousemove","mousedown","mouseup","keydown","keyup","blur","focus"].forEach(ev=>{const m:any={resize:this.onResize,mousemove:this.onMove,mousedown:this.onDown,mouseup:this.onUp,keydown:this.onKD,keyup:this.onKU,blur:this.resetKeys,focus:this.resetKeys};window.removeEventListener(ev,m[ev]);});
    document.removeEventListener("visibilitychange",this.resetKeys);
    document.removeEventListener("pointerlockchange",this.resetKeys);
    this.renderer.dispose();
  }
}
