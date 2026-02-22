
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { playShoot, playFlamingoHit } from "./sound";

interface FlamingoTarget { group:THREE.Group; vx:number; vz:number; alive:boolean; walkPhase:number; }

export class SecretRoom {
  renderer:THREE.WebGLRenderer; scene:THREE.Scene; camera:THREE.PerspectiveCamera;
  clock:THREE.Clock; rafId=0; disposed=false;
  mouseBtn=false; yaw=0; pitch=0;
  camPos=new THREE.Vector3(0,2.2,14);
  keys={w:false,s:false,a:false,d:false};
  targets:FlamingoTarget[]=[];
  spawnTimer=0; score=0;
  gunGroup:THREE.Group|null=null; muzzleLight:THREE.PointLight|null=null;
  onScoreChange:(s:number)=>void=()=>{}; onUnlock:()=>void=()=>{};
  unlocked=false; water:THREE.Mesh|null=null;
  scoreDisplay:THREE.Mesh|null=null; scoreCv:HTMLCanvasElement|null=null; scoreCtx:CanvasRenderingContext2D|null=null;
  flamingoTemplate:THREE.Group|null=null;
  loader=new GLTFLoader();

  constructor(public canvas:HTMLCanvasElement){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth,window.innerHeight);
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x1a2a3a);
    this.scene.fog=new THREE.FogExp2(0x1a2a3a,0.006);
    this.camera=new THREE.PerspectiveCamera(72,window.innerWidth/window.innerHeight,0.1,500);
    this.camera.position.copy(this.camPos);
    this.clock=new THREE.Clock();
    this.build();this.loadGun();this.preloadFlamingo();this.bindEvents();
  }

  build(){
    // Sky dome
    const skyGeo=new THREE.SphereGeometry(200,32,16);
    const skyCv=document.createElement("canvas");skyCv.width=512;skyCv.height=512;const sc=skyCv.getContext("2d")!;
    const sg=sc.createLinearGradient(0,0,0,512);
    sg.addColorStop(0,"#0a1628");sg.addColorStop(0.3,"#1a2a4a");sg.addColorStop(0.55,"#2a3a5a");
    sg.addColorStop(0.7,"#4a3060");sg.addColorStop(0.85,"#6a4070");sg.addColorStop(1,"#3a2050");
    sc.fillStyle=sg;sc.fillRect(0,0,512,512);
    sc.beginPath();sc.arc(380,340,30,0,Math.PI*2);
    const sng=sc.createRadialGradient(380,340,0,380,340,30);
    sng.addColorStop(0,"#FFFFFF");sng.addColorStop(0.5,"#FFD700");sng.addColorStop(1,"#FFA500");
    sc.fillStyle=sng;sc.fill();
    this.scene.add(new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(skyCv),side:THREE.BackSide})));

    // Sand
    const sandGeo=new THREE.PlaneGeometry(200,200,40,40);
    const sp=sandGeo.attributes.position;
    for(let i=0;i<sp.count;i++)sp.setZ(i,Math.sin(sp.getX(i)*0.1)*0.15+Math.random()*0.05);
    sandGeo.computeVertexNormals();
    const sand=new THREE.Mesh(sandGeo,new THREE.MeshStandardMaterial({color:0xF4D58D,roughness:0.95}));
    sand.rotation.x=-Math.PI/2;sand.position.y=-0.1;this.scene.add(sand);

    // Ocean
    const wGeo=new THREE.PlaneGeometry(400,200,60,30);
    this.water=new THREE.Mesh(wGeo,new THREE.MeshStandardMaterial({color:0x1E90FF,roughness:0.1,metalness:0.3,transparent:true,opacity:0.75}));
    this.water.rotation.x=-Math.PI/2;this.water.position.set(0,-0.3,-60);this.scene.add(this.water);
    // Shallow edge
    const shallow=new THREE.Mesh(new THREE.PlaneGeometry(200,40,30,10),new THREE.MeshStandardMaterial({color:0x40E0D0,roughness:0.15,metalness:0.2,transparent:true,opacity:0.5}));
    shallow.rotation.x=-Math.PI/2;shallow.position.set(0,-0.15,-20);this.scene.add(shallow);

    // Palm trees
    [[-15,5],[18,2],[-25,-5],[22,-8],[-10,18],[30,10]].forEach(([px,pz])=>{
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.25,6,8),new THREE.MeshStandardMaterial({color:0x8B6914,roughness:0.9}));
      trunk.position.set(px,3,pz);this.scene.add(trunk);
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7;
        const leaf=new THREE.Mesh(new THREE.ConeGeometry(0.3,3,4),new THREE.MeshStandardMaterial({color:0x228B22,roughness:0.8}));
        leaf.position.set(px+Math.cos(a)*1.2,6.2,pz+Math.sin(a)*1.2);leaf.rotation.x=Math.PI/2-0.4;leaf.rotation.y=a;this.scene.add(leaf);}
      const top=new THREE.Mesh(new THREE.SphereGeometry(0.6,8,8),new THREE.MeshStandardMaterial({color:0x2E8B2E,roughness:0.7}));
      top.position.set(px,6.3,pz);top.scale.set(1.5,0.8,1.5);this.scene.add(top);
    });

    // Mysterious lighting
    this.scene.add(new THREE.AmbientLight(0x8080AA,0.5));
    const sun=new THREE.DirectionalLight(0x6040A0,1.2);sun.position.set(30,20,-40);this.scene.add(sun);
    this.scene.add(new THREE.DirectionalLight(0x4060A0,0.4));
    this.scene.add(new THREE.HemisphereLight(0x2a3a5a,0x1a1030,0.6));
    // Floating crystals
    for(let i=0;i<8;i++){
      const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(0.3+Math.random()*0.4,0),new THREE.MeshStandardMaterial({color:0x00FFD0,emissive:new THREE.Color(0x00FFD0),emissiveIntensity:0.5,roughness:0.1,metalness:0.8,transparent:true,opacity:0.7}));
      crystal.position.set((Math.random()-0.5)*60,3+Math.random()*5,(Math.random()-0.5)*40-10);
      crystal.userData={baseY:crystal.position.y,speed:0.5+Math.random()};
      this.scene.add(crystal);
      const gl=new THREE.PointLight(0x00FFD0,0.5,8);gl.position.copy(crystal.position);this.scene.add(gl);
    }
    // Mysterious rocks
    for(let i=0;i<12;i++){
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(0.5+Math.random()*1.5,0),new THREE.MeshStandardMaterial({color:0x2a2a3a,roughness:0.9,metalness:0.2}));
      rock.position.set((Math.random()-0.5)*80,0.3,(Math.random()-0.5)*60-15);
      rock.scale.set(1+Math.random(),0.5+Math.random()*0.5,1+Math.random());this.scene.add(rock);
    }
    // Firefly particles
    const ffGeo=new THREE.BufferGeometry();const ffPos=new Float32Array(60*3);
    for(let i=0;i<60;i++){ffPos[i*3]=(Math.random()-0.5)*80;ffPos[i*3+1]=1+Math.random()*6;ffPos[i*3+2]=(Math.random()-0.5)*60-10;}
    ffGeo.setAttribute("position",new THREE.BufferAttribute(ffPos,3));
    const fireflies=new THREE.Points(ffGeo,new THREE.PointsMaterial({color:0xFFD700,size:0.15,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending}));
    this.scene.add(fireflies);this.scene.userData.fireflies=fireflies;

    // Score board
    this.scoreCv=document.createElement("canvas");this.scoreCv.width=512;this.scoreCv.height=128;
    this.scoreCtx=this.scoreCv.getContext("2d")!;
    this.scoreDisplay=new THREE.Mesh(new THREE.PlaneGeometry(4,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(this.scoreCv),transparent:true}));
    this.scoreDisplay.position.set(0,8,0);this.scene.add(this.scoreDisplay);this.updateScoreDisplay();

    // Title sign
    const sCv=document.createElement("canvas");sCv.width=1024;sCv.height=256;const stc=sCv.getContext("2d")!;
    stc.fillStyle="#F5F1E8";stc.fillRect(0,0,1024,256);
    stc.fillStyle="#C0692E";stc.fillRect(0,0,1024,8);stc.fillRect(0,248,1024,8);stc.fillRect(0,0,8,256);stc.fillRect(1016,0,8,256);
    stc.font="bold 84px Georgia,serif";stc.fillStyle="#1a1a1a";stc.textAlign="center";stc.fillText("FLAMINGO HUNT",512,105);
    stc.font="30px Georgia,serif";stc.fillStyle="#333333";stc.fillText("Shoot 10 flamingos to unlock your reward!",512,165);
    stc.font="20px system-ui";stc.fillStyle="#66666688";stc.fillText("LEFT CLICK — SHOOT  ·  WASD — MOVE  ·  RIGHT-CLICK DRAG — AIM",512,220);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(14,3.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sCv)}));
    sign.position.set(0,5,-28);this.scene.add(sign);
    [[-4],[4]].forEach(([ox])=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,4,8),new THREE.MeshStandardMaterial({color:0x8B6914,roughness:0.9}));p.position.set(ox,2,-28);this.scene.add(p);});
  }

  updateScoreDisplay(){
    if(!this.scoreCtx||!this.scoreCv||!this.scoreDisplay)return;
    const c=this.scoreCtx;c.clearRect(0,0,512,128);
    c.fillStyle="rgba(139,90,20,0.8)";c.fillRect(0,0,512,128);
    c.strokeStyle="#F4D58D";c.lineWidth=3;c.strokeRect(4,4,504,120);
    c.font="bold 56px Georgia,serif";c.fillStyle=this.score>=10?"#2E8B2E":"#F5F1E8";c.textAlign="center";
    c.fillText(`${this.score} / 10`,256,82);
    (this.scoreDisplay.material as THREE.MeshBasicMaterial).map!.needsUpdate=true;
  }

  loadGun(){
    this.loader.load("/pistolorange.glb",(gltf)=>{
      const model=gltf.scene;model.scale.setScalar(0.008);
      // FPS position: lower-right of screen, close to camera
      model.position.set(0.18,-0.12,-0.3);model.rotation.set(0,Math.PI,0);
      model.userData.baseY=-0.12;
      const ml=new THREE.PointLight(0xFFAA00,0,2);ml.position.set(0,0.05,0.3);model.add(ml);this.muzzleLight=ml;
      this.camera.add(model);this.scene.add(this.camera);this.gunGroup=model;
    },undefined,()=>{
      const g=new THREE.Group();
      const dm=new THREE.MeshStandardMaterial({color:0xCC6600,roughness:0.15,metalness:0.9});
      const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.024,0.32,10),dm);barrel.rotation.x=Math.PI/2;barrel.position.set(0,-0.01,0.14);g.add(barrel);
      const body=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.08,0.18),dm);body.position.set(0,-0.01,0.01);g.add(body);
      const grip=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.14,0.08),dm);grip.position.set(0,-0.11,-0.02);grip.rotation.x=-0.2;g.add(grip);
      const ml=new THREE.PointLight(0xFFAA00,0,1);ml.position.set(0,0,0.36);g.add(ml);this.muzzleLight=ml;
      g.position.set(0.18,-0.12,-0.35);g.userData.baseY=-0.12;g.scale.setScalar(0.75);
      this.camera.add(g);this.scene.add(this.camera);this.gunGroup=g;
    });
  }

  preloadFlamingo(){
    this.loader.load("/flamingo.glb",(gltf)=>{
      this.flamingoTemplate=gltf.scene;
      for(let i=0;i<4;i++)this.spawnFlamingo();
    },undefined,()=>{
      this.flamingoTemplate=new THREE.Group();
      const m=new THREE.MeshStandardMaterial({color:0xFF6B6B,roughness:0.4});
      this.flamingoTemplate.add(new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8),m));
      for(let i=0;i<4;i++)this.spawnFlamingo();
    });
  }

  spawnFlamingo(){
    if(!this.flamingoTemplate)return;
    const group=this.flamingoTemplate.clone();
    group.scale.setScalar(0.5+Math.random()*0.3);
    const side=Math.random()>0.5?1:-1;
    group.position.set(side*(12+Math.random()*15),0,-5-Math.random()*20);
    group.rotation.y=side>0?-Math.PI/2:Math.PI/2;
    this.scene.add(group);
    this.targets.push({group,vx:-side*(0.015+Math.random()*0.015),vz:(Math.random()-0.5)*0.008,alive:true,walkPhase:Math.random()*Math.PI*2});
  }

  shootAt(cx:number,cy:number){
    playShoot();
    if(this.muzzleLight){this.muzzleLight.intensity=12;setTimeout(()=>{if(this.muzzleLight)this.muzzleLight.intensity=0;},180);}
    if(this.gunGroup){this.gunGroup.position.z-=0.04;setTimeout(()=>{if(this.gunGroup)this.gunGroup.position.z+=0.04;},150);}
    const ndc=new THREE.Vector2((cx/window.innerWidth)*2-1,-(cy/window.innerHeight)*2+1);
    const ray=new THREE.Raycaster();ray.setFromCamera(ndc,this.camera);
    for(const t2 of this.targets){if(!t2.alive)continue;
      const box=new THREE.Box3().setFromObject(t2.group);box.expandByScalar(0.8);
      if(ray.ray.intersectsBox(box)){
        t2.alive=false;
        const g=t2.group;const startY=g.position.y;const startScale=g.scale.x;
        // Funny popup text
        const phrases=["MAD CUNT!","FLAMINGO KILLING BASTARD!","NO MERCY!","SAVAGE!","BRUTAL!","RUTHLESS HUNTER!","COLD BLOODED!","LEGEND!","ABSOLUTELY MENTAL!","GET REKT!","DESTROYED!","ANNIHILATED!"];
        const phrase=phrases[Math.floor(Math.random()*phrases.length)];
        const tCv=document.createElement("canvas");tCv.width=512;tCv.height=128;const tc=tCv.getContext("2d")!;
        tc.clearRect(0,0,512,128);tc.font="bold 42px system-ui";tc.fillStyle="#FFD700";tc.strokeStyle="#000";tc.lineWidth=3;tc.textAlign="center";
        tc.strokeText(phrase,256,70);tc.fillText(phrase,256,70);
        const popup=new THREE.Mesh(new THREE.PlaneGeometry(4,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(tCv),transparent:true,depthWrite:false}));
        popup.position.copy(g.position);popup.position.y+=1;popup.lookAt(this.camera.position);
        this.scene.add(popup);
        // Animate popup float up and fade
        let pt=0;const popAnim=()=>{pt+=0.016;popup.position.y+=0.04;(popup.material as THREE.MeshBasicMaterial).opacity=1-pt*1.2;
          popup.lookAt(this.camera.position);if(pt<0.8)requestAnimationFrame(popAnim);else this.scene.remove(popup);};popAnim();
        // Death animation — spin up, shrink
        let deathTime=0;
        const deathAnim=()=>{deathTime+=0.016;
          g.position.y=startY+deathTime*8;g.rotation.x+=0.3;g.rotation.z+=0.2;
          const s=Math.max(0,startScale*(1-deathTime*1.5));g.scale.setScalar(s);
          if(deathTime<0.7)requestAnimationFrame(deathAnim);
          else this.scene.remove(g);
        };deathAnim();
        this.score++;playFlamingoHit();
        this.onScoreChange(this.score);this.updateScoreDisplay();
        if(this.score>=10&&!this.unlocked){this.unlocked=true;this.onUnlock();}
        break;
      }
    }
  }

  bindEvents(){
    window.addEventListener("resize",this.onResize);window.addEventListener("mousemove",this.onMove);
    window.addEventListener("mousedown",this.onDown);window.addEventListener("mouseup",this.onUp);
    window.addEventListener("click",this.onClick);window.addEventListener("keydown",this.onKD);window.addEventListener("keyup",this.onKU);
  }
  onResize=()=>{this.camera.aspect=window.innerWidth/window.innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(window.innerWidth,window.innerHeight);};
  onMove=(e:MouseEvent)=>{if(this.mouseBtn){this.yaw-=e.movementX*0.0022;this.pitch-=e.movementY*0.0022;this.pitch=Math.max(-0.6,Math.min(0.6,this.pitch));}};
  onDown=(e:MouseEvent)=>{if(e.button===2)this.mouseBtn=true;};
  onUp=(e:MouseEvent)=>{if(e.button===2)this.mouseBtn=false;};
  onClick=(e:MouseEvent)=>{if(e.button===0)this.shootAt(e.clientX,e.clientY);};
  onKD=(e:KeyboardEvent)=>{if(e.code==="KeyW"||e.code==="ArrowUp")this.keys.w=true;if(e.code==="KeyS"||e.code==="ArrowDown")this.keys.s=true;if(e.code==="KeyA"||e.code==="ArrowLeft")this.keys.a=true;if(e.code==="KeyD"||e.code==="ArrowRight")this.keys.d=true;};
  onKU=(e:KeyboardEvent)=>{if(e.code==="KeyW"||e.code==="ArrowUp")this.keys.w=false;if(e.code==="KeyS"||e.code==="ArrowDown")this.keys.s=false;if(e.code==="KeyA"||e.code==="ArrowLeft")this.keys.a=false;if(e.code==="KeyD"||e.code==="ArrowRight")this.keys.d=false;};

  start(){
    this.clock.start();
    const loop=()=>{
      if(this.disposed)return;this.rafId=requestAnimationFrame(loop);
      const delta=this.clock.getDelta();const t=this.clock.elapsedTime;
      const qY=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),this.yaw);
      const qX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),this.pitch);
      this.camera.quaternion.copy(qY).multiply(qX);
      const sp=5*delta;const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);fwd.y=0;fwd.normalize();
      const right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);right.y=0;right.normalize();
      const mv=this.keys.w||this.keys.s||this.keys.a||this.keys.d;
      if(this.keys.w)this.camPos.addScaledVector(fwd,sp);if(this.keys.s)this.camPos.addScaledVector(fwd,-sp);
      if(this.keys.a)this.camPos.addScaledVector(right,-sp);if(this.keys.d)this.camPos.addScaledVector(right,sp);
      this.camPos.x=Math.max(-30,Math.min(30,this.camPos.x));this.camPos.y=2.2;this.camPos.z=Math.max(-25,Math.min(20,this.camPos.z));
      this.camera.position.copy(this.camPos);
      if(this.gunGroup){const bob=mv?Math.sin(t*9)*0.006:Math.sin(t*1.5)*0.002;
        this.gunGroup.position.y=(this.gunGroup.userData.baseY||-0.2)+bob;}
      // Water waves
      if(this.water){const wp=(this.water.geometry as THREE.PlaneGeometry).attributes.position;
        for(let i=0;i<wp.count;i++){wp.setZ(i,Math.sin(wp.getX(i)*0.08+t*1.5)*0.3+Math.cos(wp.getY(i)*0.1+t*1.2)*0.2);}
        wp.needsUpdate=true;this.water.geometry.computeVertexNormals();}
      // Spawn
      // Spawn — keep going even after 10 for fun
      if(this.flamingoTemplate){this.spawnTimer+=delta;
        if(this.spawnTimer>2.5&&this.targets.filter(x=>x.alive).length<6){this.spawnTimer=0;this.spawnFlamingo();}}
      // Flamingos walk
      this.targets.forEach(f=>{if(!f.alive)return;f.walkPhase+=delta*3;
        f.group.position.x+=f.vx;f.group.position.z+=f.vz;
        f.group.position.y=Math.abs(Math.sin(f.walkPhase))*0.08;
        f.group.rotation.z=Math.sin(f.walkPhase)*0.03;
        const p=f.group.position;if(Math.abs(p.x)>35||p.z>25||p.z<-35){f.alive=false;this.scene.remove(f.group);}});
      this.targets=this.targets.filter(x=>x.alive);
      if(this.scoreDisplay)this.scoreDisplay.position.y=8+Math.sin(t*0.6)*0.1;
      this.renderer.render(this.scene,this.camera);
    };loop();
  }

  dispose(){
    this.disposed=true;cancelAnimationFrame(this.rafId);
    ["resize","mousemove","mousedown","mouseup","click","keydown","keyup"].forEach(ev=>{
      const m:any={resize:this.onResize,mousemove:this.onMove,mousedown:this.onDown,mouseup:this.onUp,click:this.onClick,keydown:this.onKD,keyup:this.onKU};
      window.removeEventListener(ev,m[ev]);});
    this.renderer.dispose();
  }
}
