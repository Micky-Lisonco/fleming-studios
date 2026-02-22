
import * as THREE from "three";
export function makeDoorTexture(room:string,hex:string):THREE.CanvasTexture{
  const cv=document.createElement("canvas");cv.width=256;cv.height=512;const c=cv.getContext("2d")!;
  c.fillStyle="#000008";c.fillRect(0,0,256,512);
  if(room==="branding"){
    c.strokeStyle=hex;c.lineWidth=2;[50,35,22,12].forEach(r=>{c.beginPath();c.arc(128,200,r,0,Math.PI*2);c.stroke();});
    for(let i=0;i<5;i++){for(let j=0;j<5;j++){const x=78+i*20,y=150+j*20;c.fillStyle=(i+j)%2===0?hex+"88":hex+"22";c.fillRect(x,y,16,16);}}
    c.font="bold 30px system-ui";c.fillStyle=hex;c.textAlign="center";c.fillText("BRAND",128,295);
    c.font="bold 30px system-ui";c.fillStyle="#F5F1E8";c.fillText("IDENTITY",128,332);
    c.font="13px system-ui";c.fillStyle=hex+"77";c.fillText("Make your mark.",128,365);
  } else if(room==="websites"){
    c.strokeStyle=hex+"77";c.lineWidth=1;c.strokeRect(40,130,176,130);c.fillStyle=hex+"22";c.fillRect(40,130,176,22);
    c.fillStyle=hex;[50,60,70].forEach(x=>c.fillRect(x,138,6,6));
    [160,175,190,205,220].forEach((y,i)=>{c.fillStyle=hex+(i===0?"99":"44");c.fillRect(55,y,i===0?140:80,8);});
    c.font="bold 26px system-ui";c.fillStyle=hex;c.textAlign="center";c.fillText("WEBSITES",128,310);
    c.font="bold 26px system-ui";c.fillStyle="#F5F1E8";c.fillText("& DIGITAL",128,342);
    c.font="13px system-ui";c.fillStyle=hex+"77";c.fillText("Built to convert.",128,372);
  } else if(room==="content"){
    [90,130,170,210,250,290,330].forEach(y=>{c.fillStyle=hex+"33";c.fillRect(20,y,216,32);c.fillStyle=hex+"88";[25,215].forEach(x=>c.fillRect(x,y+4,12,24));});
    c.strokeStyle=hex;c.lineWidth=2;c.beginPath();c.moveTo(128,80);c.lineTo(150,110);c.lineTo(106,110);c.closePath();c.stroke();
    c.font="bold 24px system-ui";c.fillStyle=hex;c.textAlign="center";c.fillText("CONTENT",128,380);
    c.font="bold 24px system-ui";c.fillStyle="#F5F1E8";c.fillText("PRODUCTION",128,410);
  } else if(room==="campaigns"){
    const pts=[[40,370],[80,340],[110,360],[140,300],[170,275],[200,225],[220,165]];
    c.strokeStyle=hex;c.lineWidth=2.5;c.beginPath();pts.forEach(([x,y],i)=>i===0?c.moveTo(x,y):c.lineTo(x,y));c.stroke();
    c.lineTo(220,390);c.lineTo(40,390);c.closePath();c.fillStyle=hex+"22";c.fill();
    pts.forEach(([x,y])=>{c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fillStyle=hex;c.fill();});
    c.font="bold 24px system-ui";c.fillStyle=hex;c.textAlign="center";c.fillText("CAMPAIGNS",128,440);
    c.font="13px system-ui";c.fillStyle=hex+"77";c.fillText("Data-led creative.",128,465);
  } else if(room==="secret"){
    // Mysterious glitchy secret door
    for(let y=0;y<512;y+=6){c.fillStyle=`rgba(255,45,149,${Math.random()*0.15})`;c.fillRect(0,y,256,4);}
    for(let i=0;i<20;i++){c.fillStyle=`rgba(255,45,149,${Math.random()*0.2})`;const rx=Math.random()*256,ry=Math.random()*512,rw=Math.random()*60+10;c.fillRect(rx,ry,rw,2);}
    c.font="bold 48px system-ui";c.fillStyle="#FF2D95";c.textAlign="center";c.fillText("???",128,220);
    c.font="bold 18px system-ui";c.fillStyle="#FF2D9566";c.fillText("FIND ME",128,270);
    c.font="13px system-ui";c.fillStyle="#FF2D9544";c.fillText("Keep walking...",128,310);
  } else {
    const nodes=[[128,130],[80,195],[176,195],[55,265],[128,250],[200,265],[128,330]];
    const edges=[[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[5,6]];
    c.strokeStyle=hex+"55";c.lineWidth=1;edges.forEach(([a,b])=>{c.beginPath();c.moveTo(nodes[a][0],nodes[a][1]);c.lineTo(nodes[b][0],nodes[b][1]);c.stroke();});
    nodes.forEach(([x,y],i)=>{const r=i===0||i===6?14:9;const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,hex+"ff");gr.addColorStop(1,hex+"22");c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=gr;c.fill();});
    c.font="bold 28px system-ui";c.fillStyle=hex;c.textAlign="center";c.fillText("AI",128,390);
    c.font="bold 28px system-ui";c.fillStyle="#F5F1E8";c.fillText("PRODUCTION",128,425);
    c.font="13px system-ui";c.fillStyle=hex+"77";c.fillText("Agents that never sleep.",128,452);
  }
  for(let y=0;y<512;y+=4){c.fillStyle="rgba(0,0,0,0.16)";c.fillRect(0,y,256,2);}
  const vg=c.createRadialGradient(128,256,80,128,256,200);vg.addColorStop(0,"transparent");vg.addColorStop(1,"rgba(0,0,8,0.5)");
  c.fillStyle=vg;c.fillRect(0,0,256,512);
  return new THREE.CanvasTexture(cv);
}
