
import * as THREE from "three";

export class BrandingRoom {
  renderer:THREE.WebGLRenderer; scene:THREE.Scene; camera:THREE.PerspectiveCamera;
  clock:THREE.Clock; rafId=0; disposed=false;
  cube:THREE.Mesh|null=null; rings:THREE.Mesh[]=[];
  floaters:THREE.Mesh[]=[];
  mouseBtn=false; yaw=0; pitch=0;
  camPos=new THREE.Vector3(0,1.8,7);
  keys={w:false,s:false,a:false,d:false};

  constructor(public canvas:HTMLCanvasElement){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.setSize(window.innerWidth,window.innerHeight);
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.6;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x000510);
    this.scene.fog=new THREE.FogExp2(0x000510,0.045);
    this.camera=new THREE.PerspectiveCamera(72,window.innerWidth/window.innerHeight,0.1,200);
    this.camera.position.copy(this.camPos);
    this.clock=new THREE.Clock();
    this.build(); this.bindEvents();
  }

  build(){
    // === FLOOR ===
    const floorMat=new THREE.MeshStandardMaterial({color:0x010408,roughness:0.02,metalness:0.98});
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(28,28),floorMat);
    floor.rotation.x=-Math.PI/2; floor.position.y=0; this.scene.add(floor);
    const grid=new THREE.GridHelper(28,28,0x00D4FF,0x020d1a);
    grid.position.y=0.002;
    (grid.material as THREE.LineBasicMaterial).transparent=true;
    (grid.material as THREE.LineBasicMaterial).opacity=0.25; this.scene.add(grid);

    // === WALLS ===
    const wallMat=new THREE.MeshStandardMaterial({color:0x020810,roughness:0.9,metalness:0.1});
    [[-14,0,Math.PI/2],[14,0,-Math.PI/2]].forEach(([x,,r])=>{
      const w=new THREE.Mesh(new THREE.PlaneGeometry(28,10),wallMat.clone()); w.rotation.y=r as number; w.position.set(x as number,5,0); this.scene.add(w);
    });
    const fw=new THREE.Mesh(new THREE.PlaneGeometry(28,10),wallMat.clone()); fw.position.set(0,5,-14); this.scene.add(fw);
    const bw=new THREE.Mesh(new THREE.PlaneGeometry(28,10),wallMat.clone()); bw.rotation.y=Math.PI; bw.position.set(0,5,14); this.scene.add(bw);
    // Ceiling
    const cm=new THREE.MeshStandardMaterial({color:0x010306,roughness:0.85});
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(28,28),cm); ceil.rotation.x=Math.PI/2; ceil.position.y=10; this.scene.add(ceil);

    // === NEON WALL STRIPS ===
    const nm=new THREE.MeshStandardMaterial({color:0x000,emissive:new THREE.Color(0x00D4FF),emissiveIntensity:2.5});
    [[-13.8,2],[13.8,2]].forEach(([x,y])=>{
      const s=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.06,28),nm.clone()); s.position.set(x,y,0); this.scene.add(s);
    });
    const cm2=new THREE.MeshStandardMaterial({color:0x000,emissive:new THREE.Color(0x00D4FF),emissiveIntensity:1.8});
    const cstrip=new THREE.Mesh(new THREE.BoxGeometry(28,0.05,0.05),cm2); cstrip.position.set(0,9.95,0); this.scene.add(cstrip);

    // === LIGHTING ===
    this.scene.add(new THREE.AmbientLight(0x020612,1.2));
    const kl=new THREE.PointLight(0x00D4FF,8,30); kl.position.set(0,8,0); this.scene.add(kl);
    const fl=new THREE.PointLight(0x00D4FF,4,20); fl.position.set(0,1.5,0); this.scene.add(fl);
    [-8,8].forEach(x=>{const sl=new THREE.PointLight(0x00D4FF,2,15);sl.position.set(x,5,-8);this.scene.add(sl);});

    // === CENTRE HERO: Floating Brand Cube ===
    // Faces: 6 canvases — BRAND, VISION, COLOUR, MOTION, VOICE, SYSTEM
    const faceTextures=["BRAND","VISION","COLOUR","MOTION","VOICE","SYSTEM"].map((word,i)=>{
      const cv=document.createElement("canvas"); cv.width=256; cv.height=256; const c=cv.getContext("2d")!;
      const cols=["#00D4FF","#8B5CF6","#FFB800","#00E5B0","#FF2D95","#00D4FF"];
      const bg=c.createLinearGradient(0,0,256,256); bg.addColorStop(0,"#000510"); bg.addColorStop(1,"#001020");
      c.fillStyle=bg; c.fillRect(0,0,256,256);
      c.strokeStyle=cols[i]+"88"; c.lineWidth=3; c.strokeRect(8,8,240,240);
      for(let r=20;r<110;r+=18){c.strokeStyle=cols[i]+(r%36===0?"44":"22");c.lineWidth=0.5;c.beginPath();c.arc(128,128,r,0,Math.PI*2);c.stroke();}
      c.font="bold 38px system-ui"; c.fillStyle=cols[i]; c.textAlign="center"; c.fillText(word,128,140);
      c.font="12px system-ui"; c.fillStyle=cols[i]+"77"; c.fillText("FLEMING STUDIOS",128,168);
      return new THREE.CanvasTexture(cv);
    });
    const cubeGeo=new THREE.BoxGeometry(2.6,2.6,2.6);
    const cubeMats=faceTextures.map(t=>new THREE.MeshStandardMaterial({map:t,emissive:new THREE.Color(0x002244),emissiveIntensity:0.5,roughness:0.1,metalness:0.8}));
    const cube=new THREE.Mesh(cubeGeo,cubeMats); cube.position.set(0,3.5,0); this.scene.add(cube); this.cube=cube;
    // Orbit rings
    [1.9,2.4,3.0].forEach((r,i)=>{
      const ring=new THREE.Mesh(new THREE.TorusGeometry(r,0.025,8,64),
        new THREE.MeshStandardMaterial({color:0x000,emissive:new THREE.Color(0x00D4FF),emissiveIntensity:1.5+i*0.3}));
      ring.position.set(0,3.5,0); ring.rotation.x=i===0?Math.PI/2:i===1?Math.PI/4:0; this.scene.add(ring); this.rings.push(ring);
    });
    // Point light orbiting the cube
    const oLight=new THREE.PointLight(0x00D4FF,6,10); oLight.position.set(3,3.5,0); this.scene.add(oLight);
    this.scene.userData.orbitLight=oLight;

    // === COLOUR PALETTE WALL (LEFT) ===
    const palette=["#00D4FF","#FF2D95","#8B5CF6","#FFB800","#00E5B0","#F5F1E8","#000205"];
    const palCv=document.createElement("canvas"); palCv.width=128; palCv.height=512; const pc=palCv.getContext("2d")!;
    pc.fillStyle="#000510"; pc.fillRect(0,0,128,512);
    palette.forEach((col,i)=>{pc.fillStyle=col;pc.fillRect(8,8+i*68,112,56);pc.font="bold 11px system-ui";pc.fillStyle="#000";pc.textAlign="center";pc.fillText(col.toUpperCase(),64,36+i*68);});
    const palMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.4,8.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(palCv)}));
    palMesh.position.set(-13.4,5,-2); palMesh.rotation.y=Math.PI/2; this.scene.add(palMesh);
    // Glow per colour
    palette.slice(0,5).forEach((col,i)=>{const pl=new THREE.PointLight(new THREE.Color(col),0.8,5);pl.position.set(-12.5,1.5+i*1.5,-2);this.scene.add(pl);});

    // === TYPOGRAPHY WALL (RIGHT) ===
    const typoCV=document.createElement("canvas"); typoCV.width=1024; typoCV.height=512; const tc=typoCV.getContext("2d")!;
    tc.fillStyle="#000208"; tc.fillRect(0,0,1024,512);
    tc.font="bold 86px Georgia,serif"; tc.fillStyle="#F5F1E8"; tc.textAlign="center"; tc.fillText("IDENTITY",512,120);
    tc.font="bold 86px Georgia,serif"; tc.fillStyle="#00D4FF"; tc.textAlign="center"; tc.fillText("THAT SPEAKS",512,218);
    tc.font="bold 72px Georgia,serif"; tc.fillStyle="rgba(245,241,232,0.4)"; tc.fillText("before you do.",512,305);
    tc.font="20px system-ui"; tc.fillStyle="#00D4FF88"; tc.fillText("— FLEMING STUDIOS BRAND PHILOSOPHY",512,370);
    const typoMesh=new THREE.Mesh(new THREE.PlaneGeometry(11,6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(typoCV)}));
    typoMesh.position.set(13.4,5,-2); typoMesh.rotation.y=-Math.PI/2; this.scene.add(typoMesh);

    // === HERO BACK WALL TEXT ===
    const hwCv=document.createElement("canvas"); hwCv.width=1024; hwCv.height=512; const hw=hwCv.getContext("2d")!;
    hw.fillStyle="#000208"; hw.fillRect(0,0,1024,512);
    hw.font="bold 130px system-ui"; hw.fillStyle="#00D4FF"; hw.textAlign="center"; hw.fillText("MAKE",512,175);
    hw.font="bold 130px system-ui"; hw.fillStyle="#F5F1E8"; hw.textAlign="center"; hw.fillText("YOUR MARK",512,320);
    hw.font="18px system-ui"; hw.fillStyle="#00D4FF55"; hw.fillText("BRANDING & IDENTITY — FLEMING STUDIOS",512,380);
    const hwMesh=new THREE.Mesh(new THREE.PlaneGeometry(22,10),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(hwCv)}));
    hwMesh.position.set(0,5,-13.8); this.scene.add(hwMesh);
    const hglow=new THREE.PointLight(0x00D4FF,3,18); hglow.position.set(0,5,-11); this.scene.add(hglow);

    // === FLOATING SERVICE CARDS ===
    const cards=[
      {text:"Logo Design",sub:"Icon · Wordmark · Emblem",col:"#00D4FF",x:-5,z:-5},
      {text:"Brand Guidelines",sub:"Rules that set you apart",col:"#8B5CF6",x:5,z:-5},
      {text:"Visual Identity",sub:"The full system",col:"#FFB800",x:-5,z:2},
      {text:"Brand Strategy",sub:"Position. Purpose. Power.",col:"#00E5B0",x:5,z:2},
      {text:"Motion Brand",sub:"Identity in motion",col:"#FF2D95",x:0,z:-8},
    ];
    cards.forEach((cd,i)=>{
      const cv=document.createElement("canvas"); cv.width=384; cv.height=192; const c=cv.getContext("2d")!;
      const bg=c.createLinearGradient(0,0,384,192); bg.addColorStop(0,"#000510"); bg.addColorStop(1,"#000c18");
      c.fillStyle=bg; c.fillRect(0,0,384,192);
      c.strokeStyle=cd.col+"66"; c.lineWidth=1.5; c.strokeRect(4,4,376,184);
      c.fillStyle=cd.col; c.fillRect(4,4,4,184);
      c.font="bold 30px system-ui"; c.fillStyle=cd.col; c.textAlign="left"; c.fillText(cd.text,22,58);
      c.font="16px system-ui"; c.fillStyle="rgba(245,241,232,0.5)"; c.fillText(cd.sub,22,90);
      c.font="12px system-ui"; c.fillStyle=cd.col+"66"; c.fillText("FLEMINGSTUDIOS.EU →",22,168);
      const m=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,opacity:0.92}));
      m.position.set(cd.x,2.2+i*0.3,cd.z); m.userData={baseY:2.2+i*0.3,ph:i*1.2}; this.scene.add(m); this.floaters.push(m);
      const gl=new THREE.PointLight(new THREE.Color(cd.col),1.2,7); gl.position.set(cd.x,2.5+i*0.3,cd.z+0.5); this.scene.add(gl);
    });

    // === FLOOR BRAND RING ===
    const ringFloor=new THREE.Mesh(new THREE.RingGeometry(4.5,4.7,64),
      new THREE.MeshBasicMaterial({color:0x00D4FF,transparent:true,opacity:0.2,side:THREE.DoubleSide}));
    ringFloor.rotation.x=-Math.PI/2; ringFloor.position.y=0.01; this.scene.add(ringFloor);
    const ringFloor2=new THREE.Mesh(new THREE.RingGeometry(5.8,6.0,64),
      new THREE.MeshBasicMaterial({color:0x00D4FF,transparent:true,opacity:0.1,side:THREE.DoubleSide}));
    ringFloor2.rotation.x=-Math.PI/2; ringFloor2.position.y=0.01; this.scene.add(ringFloor2);
  }

  bindEvents(){
    window.addEventListener("resize",this.onResize);
    window.addEventListener("mousemove",this.onMove);
    window.addEventListener("mousedown",this.onDown);
    window.addEventListener("mouseup",this.onUp);
    window.addEventListener("keydown",this.onKD);
    window.addEventListener("keyup",this.onKU);
  }
  onResize=()=>{this.camera.aspect=window.innerWidth/window.innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(window.innerWidth,window.innerHeight);};
  onMove=(e:MouseEvent)=>{if(this.mouseBtn){this.yaw-=e.movementX*0.0022;this.pitch-=e.movementY*0.0022;this.pitch=Math.max(-0.55,Math.min(0.55,this.pitch));}};
  onDown=(e:MouseEvent)=>{if(e.button===2)this.mouseBtn=true;};
  onUp=(e:MouseEvent)=>{if(e.button===2)this.mouseBtn=false;};
  onKD=(e:KeyboardEvent)=>{if(e.code==="KeyW"||e.code==="ArrowUp")this.keys.w=true;if(e.code==="KeyS"||e.code==="ArrowDown")this.keys.s=true;if(e.code==="KeyA"||e.code==="ArrowLeft")this.keys.a=true;if(e.code==="KeyD"||e.code==="ArrowRight")this.keys.d=true;};
  onKU=(e:KeyboardEvent)=>{if(e.code==="KeyW"||e.code==="ArrowUp")this.keys.w=false;if(e.code==="KeyS"||e.code==="ArrowDown")this.keys.s=false;if(e.code==="KeyA"||e.code==="ArrowLeft")this.keys.a=false;if(e.code==="KeyD"||e.code==="ArrowRight")this.keys.d=false;};

  start(){
    this.clock.start();
    const loop=()=>{
      if(this.disposed)return;
      this.rafId=requestAnimationFrame(loop);
      const delta=this.clock.getDelta(); const t=this.clock.elapsedTime;
      // Camera move
      const qY=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),this.yaw);
      const qX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),this.pitch);
      this.camera.quaternion.copy(qY).multiply(qX);
      const sp=5*delta;
      const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);fwd.y=0;fwd.normalize();
      const right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);right.y=0;right.normalize();
      if(this.keys.w)this.camPos.addScaledVector(fwd,sp);if(this.keys.s)this.camPos.addScaledVector(fwd,-sp);
      if(this.keys.a)this.camPos.addScaledVector(right,-sp);if(this.keys.d)this.camPos.addScaledVector(right,sp);
      this.camPos.x=Math.max(-12,Math.min(12,this.camPos.x));this.camPos.y=1.8;this.camPos.z=Math.max(-12,Math.min(12,this.camPos.z));
      this.camera.position.copy(this.camPos);
      // Cube rotate
      if(this.cube){this.cube.rotation.y=t*0.35;this.cube.rotation.x=t*0.12;this.cube.position.y=3.5+Math.sin(t*0.6)*0.18;}
      // Rings
      this.rings.forEach((r,i)=>{r.rotation.y=t*(0.4+i*0.15);r.rotation.z=t*(0.2+i*0.1);});
      // Orbit light
      const ol=this.scene.userData.orbitLight as THREE.PointLight;
      if(ol){ol.position.x=Math.cos(t*0.7)*4;ol.position.z=Math.sin(t*0.7)*4;ol.position.y=3.5+Math.sin(t*1.2)*0.5;}
      // Floaters
      this.floaters.forEach(f=>{f.position.y=f.userData.baseY+Math.sin(t*0.8+f.userData.ph)*0.18;f.rotation.y=Math.sin(t*0.4+f.userData.ph)*0.08;});
      this.renderer.render(this.scene,this.camera);
    };
    loop();
  }
  dispose(){
    this.disposed=true;cancelAnimationFrame(this.rafId);
    ["resize","mousemove","mousedown","mouseup","keydown","keyup"].forEach(ev=>{
      const map:any={resize:this.onResize,mousemove:this.onMove,mousedown:this.onDown,mouseup:this.onUp,keydown:this.onKD,keyup:this.onKU};
      window.removeEventListener(ev,map[ev]);
    });
    this.renderer.dispose();
  }
}
