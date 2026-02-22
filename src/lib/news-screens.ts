
import * as THREE from "three";

const HEADLINES = [
  {tag:"THE NEW YORK HERALD",date:"March 14, 2025",headline:"AI ELIMINATES 80% OF WHITE-COLLAR JOBS IN 18 MONTHS",body:"Unemployment hits 34% globally as automation replaces lawyers, accountants, designers and writers overnight.",col:"#e8e0cc",type:"newspaper"},
  {tag:"REUTERS BREAKING",date:"July 2, 2025",headline:"LAST HUMAN STOCKBROKER RETIRES",body:"Wall Street empties as autonomous agents execute 100% of global financial transactions.",col:"#c8e8ff",type:"live"},
  {tag:"WIRED — COLLAPSE EDITION",date:"Sep 1, 2025",headline:"CREATIVE AGENCIES MASS CLOSING",body:"AI-generated campaigns outperform human teams 94% of the time at 0.3% of the cost.",col:"#ff6b35",type:"magazine"},
  {tag:"THE GUARDIAN",date:"Oct 18, 2025",headline:"EDUCATION SYSTEM IMPLODES AS AI TUTORS REPLACE 2M TEACHERS",body:"Schools shuttered in 40 countries. Children learn faster with AI than any human ever could.",col:"#a8e6cf",type:"newspaper"},
  {tag:"DER SPIEGEL SPECIAL",date:"Nov 5, 2025",headline:"'DIE MASCHINEN HABEN GEWONNEN'",body:"Germany's manufacturing sector achieves zero human workers. GDP rises 22%.",col:"#ffd93d",type:"photo"},
  {tag:"@TechCrash",date:"2 hours ago",headline:"bro I just got replaced by a $20/month subscription 💀",body:"me and 400 colleagues got our redundancy letters today. the AI does our job better and never sleeps.",col:"#ff2d95",type:"social"},
  {tag:"BBC WORLD SERVICE",date:"Dec 1, 2025",headline:"UN DECLARES 'CIVILISATIONAL TRANSITION'",body:"Secretary-General: 'This is not the end of humanity. It is the end of busywork.'",col:"#00d4ff",type:"live"},
  {tag:"FORTUNE 500 MEMO — LEAKED",date:"Q4 2025",headline:"ALL CREATIVE ROLES ELIMINATED BY Q1 2026",body:"'AI output now indistinguishable from senior creative work. Headcount reduction mandatory.'",col:"#8b5cf6",type:"leaked"},
  {tag:"@DesignerLost",date:"45 min ago",headline:"10 years of design school. replaced in 4 seconds.",body:"Midjourney, Sora, Claude. That's the whole agency now. I'm not mad. I just don't know what I am anymore.",col:"#ffb800",type:"social"},
  {tag:"BLOOMBERG INTELLIGENCE",date:"Jan 2026",headline:"ONLY BRANDS THAT EMBRACED AI SURVIVED",body:"Study of 10,000 companies: those with AI-native creative pipelines grew 3x. The rest are gone.",col:"#00e5b0",type:"chart"},
];

export function makeNewsTexture(idx:number):THREE.CanvasTexture{
  const n=HEADLINES[idx%HEADLINES.length];
  const cv=document.createElement("canvas"); cv.width=640; cv.height=400;
  const c=cv.getContext("2d")!;

  // Each type gets a unique visual treatment
  if(n.type==="social"){
    // Dark social media card with avatar, engagement metrics
    c.fillStyle="#0d1117"; c.fillRect(0,0,640,400);
    c.fillStyle="#161b22"; c.fillRect(10,10,620,380);
    c.fillStyle=n.col; c.fillRect(10,10,4,380);
    // Avatar circle
    c.beginPath();c.arc(40,45,14,0,Math.PI*2);c.fillStyle=n.col;c.fill();
    c.font="bold 11px system-ui";c.fillStyle="#fff";c.textAlign="center";c.fillText("U",40,49);
    c.textAlign="left";
    c.font="bold 14px system-ui";c.fillStyle="#f0f0f0";c.fillText(n.tag,64,42);
    c.font="12px system-ui";c.fillStyle="#666";c.fillText(n.date,64,58);
    // Post text
    c.font="bold 22px Georgia,serif";c.fillStyle="#fff";
    wrapText(c,n.headline,28,95,590,28);
    c.font="15px system-ui";c.fillStyle="#999";
    wrapText(c,n.body,28,180,590,22);
    // Engagement bar
    c.fillStyle="#21262d";c.fillRect(10,340,620,50);
    c.font="13px system-ui";c.fillStyle="#666";
    ["♥ 24.5K","⟲ 8.2K","💬 3.1K","📊 892K"].forEach((t,i)=>c.fillText(t,30+i*155,370));
  } else if(n.type==="live"){
    // Live broadcast — dark with red LIVE badge, ticker
    const bg=c.createLinearGradient(0,0,640,400);bg.addColorStop(0,"#080010");bg.addColorStop(1,"#100020");
    c.fillStyle=bg;c.fillRect(0,0,640,400);
    // LIVE badge
    c.fillStyle="#cc0000";c.fillRect(20,16,60,24);
    c.font="bold 14px system-ui";c.fillStyle="#fff";c.textAlign="center";c.fillText("● LIVE",50,33);c.textAlign="left";
    c.font="12px system-ui";c.fillStyle=n.col;c.fillText(n.tag,92,33);
    // Breaking bar
    c.fillStyle="rgba(200,0,0,0.8)";c.fillRect(0,50,640,4);
    // Main headline
    c.font="bold 28px Georgia,serif";c.fillStyle="#fff";
    wrapText(c,n.headline,24,95,596,34);
    c.font="15px system-ui";c.fillStyle="rgba(255,255,255,0.6)";
    wrapText(c,n.body,24,200,596,22);
    // Bottom ticker bar
    c.fillStyle="rgba(0,0,0,0.85)";c.fillRect(0,360,640,40);
    c.fillStyle="#cc0000";c.fillRect(0,360,640,2);
    c.font="12px system-ui";c.fillStyle="rgba(255,255,255,0.5)";
    c.fillText("BREAKING NEWS  ·  MARKETS DOWN 12%  ·  AI DISRUPTION ACCELERATES  ·  "+n.tag,20,385);
  } else if(n.type==="magazine"){
    // WIRED-style tech magazine with bold graphic layout
    const bg=c.createLinearGradient(0,0,640,400);bg.addColorStop(0,"#0a0a0a");bg.addColorStop(1,"#1a0800");
    c.fillStyle=bg;c.fillRect(0,0,640,400);
    c.fillStyle=n.col;c.fillRect(0,0,640,6);c.fillRect(0,394,640,6);
    // Large issue label
    c.font="bold 10px system-ui";c.fillStyle=n.col;c.fillText("WIRED",24,28);
    c.fillStyle="#555";c.fillText("COLLAPSE EDITION — VOL.33 NO.9",80,28);
    // Giant headline
    c.font="bold 36px Georgia,serif";c.fillStyle=n.col;
    wrapText(c,n.headline,24,80,596,42);
    // Pull quote style body
    c.fillStyle=n.col+"33";c.fillRect(24,200,4,80);
    c.font="italic 16px Georgia,serif";c.fillStyle="rgba(255,255,255,0.55)";
    wrapText(c,n.body,40,215,580,22);
    // Data viz placeholder
    for(let i=0;i<12;i++){const h=20+Math.random()*80;c.fillStyle=n.col+(Math.floor(Math.random()*40+20).toString(16));
      c.fillRect(24+i*50,380-h,36,h);}
  } else if(n.type==="photo"){
    // Photo-based news with overlay text
    const bg=c.createLinearGradient(0,0,0,400);bg.addColorStop(0,"#0a0a10");bg.addColorStop(0.4,"#151520");bg.addColorStop(1,"#000");
    c.fillStyle=bg;c.fillRect(0,0,640,400);
    // Simulated photo grid
    [[20,20,180,160],[210,20,200,160],[420,20,200,160]].forEach(([x,y,w,h])=>{
      c.fillStyle=`hsl(${Math.random()*60+200},30%,${15+Math.random()*10}%)`;c.fillRect(x,y,w,h);
      c.strokeStyle="rgba(255,255,255,0.08)";c.strokeRect(x,y,w,h);
    });
    // Bottom text overlay
    c.fillStyle="rgba(0,0,0,0.8)";c.fillRect(0,200,640,200);
    c.font="bold 11px system-ui";c.fillStyle=n.col;c.fillText(n.tag+"  ·  "+n.date,24,225);
    c.font="bold 24px Georgia,serif";c.fillStyle="#fff";
    wrapText(c,n.headline,24,260,596,30);
    c.font="14px system-ui";c.fillStyle="rgba(255,255,255,0.5)";
    wrapText(c,n.body,24,330,596,20);
  } else if(n.type==="leaked"){
    // Classified document style
    c.fillStyle="#120800";c.fillRect(0,0,640,400);
    for(let x=0;x<640;x+=28){c.fillStyle="rgba(255,60,0,0.12)";c.fillRect(x,0,14,6);}
    c.fillStyle="rgba(255,0,0,0.08)";c.fillRect(0,0,640,6);
    // CONFIDENTIAL watermark
    c.save();c.translate(320,200);c.rotate(-0.3);c.font="bold 60px system-ui";
    c.fillStyle="rgba(255,60,0,0.06)";c.textAlign="center";c.fillText("CONFIDENTIAL",0,0);c.restore();
    c.textAlign="left";
    c.font="bold 11px monospace";c.fillStyle="#ff4400";c.fillText("⚠ "+n.tag,16,30);
    c.fillStyle="rgba(255,200,100,0.35)";c.font="10px monospace";c.fillText("CLASSIFICATION: RESTRICTED · "+n.date,16,46);
    c.strokeStyle="rgba(255,60,0,0.15)";c.setLineDash([4,4]);c.strokeRect(12,56,616,2);c.setLineDash([]);
    c.font="bold 22px monospace";c.fillStyle="#ff8844";
    wrapText(c,n.headline,16,90,608,28);
    c.font="14px monospace";c.fillStyle="rgba(255,200,150,0.5)";
    wrapText(c,n.body,16,190,608,20);
    // Redacted bars
    [[200,280,180,16],[100,310,220,16],[350,340,140,16]].forEach(([x,y,w,h])=>{
      c.fillStyle="rgba(255,60,0,0.15)";c.fillRect(x,y,w,h);});
  } else if(n.type==="chart"){
    // Data/analytics dashboard
    c.fillStyle="#0a0c14";c.fillRect(0,0,640,400);
    c.fillStyle=n.col;c.fillRect(0,0,640,3);
    c.font="bold 11px system-ui";c.fillStyle=n.col;c.fillText(n.tag,16,22);
    c.fillStyle="#555";c.fillText(n.date,250,22);
    c.font="bold 20px Georgia,serif";c.fillStyle="#fff";
    wrapText(c,n.headline,16,55,608,26);
    // Chart area
    c.strokeStyle=n.col+"44";c.lineWidth=1;
    for(let y=120;y<330;y+=35){c.beginPath();c.moveTo(30,y);c.lineTo(620,y);c.stroke();}
    // Line chart
    c.beginPath();c.strokeStyle=n.col;c.lineWidth=2;
    const pts:number[]=[];for(let i=0;i<20;i++)pts.push(280-Math.random()*150-i*3);
    pts.forEach((py,i)=>{const px=30+i*31;i===0?c.moveTo(px,py):c.lineTo(px,py);});c.stroke();
    // Fill under
    c.lineTo(620,330);c.lineTo(30,330);c.closePath();c.fillStyle=n.col+"11";c.fill();
    // Labels
    c.font="10px system-ui";c.fillStyle="#555";
    ["2020","2021","2022","2023","2024","2025"].forEach((l,i)=>c.fillText(l,30+i*118,350));
    c.font="13px system-ui";c.fillStyle="rgba(255,255,255,0.45)";
    wrapText(c,n.body,16,365,608,18);
  } else {
    // Default newspaper
    const bg=c.createLinearGradient(0,0,0,400);bg.addColorStop(0,"#0c0c08");bg.addColorStop(1,"#0a0a06");
    c.fillStyle=bg;c.fillRect(0,0,640,400);
    c.fillStyle=n.col;c.fillRect(0,0,640,4);c.fillStyle=n.col+"33";c.fillRect(0,0,3,400);
    for(let i=0;i<400;i+=4){c.fillStyle="rgba(255,255,255,0.012)";c.fillRect(0,i,640,1);}
    c.font="bold 12px system-ui";c.fillStyle=n.col;c.fillText(n.tag.toUpperCase(),16,24);
    c.fillStyle="rgba(245,241,232,0.3)";c.font="10px system-ui";c.fillText(n.date,16,40);
    c.strokeStyle="rgba(255,255,255,0.06)";c.lineWidth=0.5;c.beginPath();c.moveTo(16,48);c.lineTo(624,48);c.stroke();
    c.font="bold 24px Georgia,serif";c.fillStyle=n.col;
    wrapText(c,n.headline,16,75,608,30);
    c.strokeStyle="rgba(255,255,255,0.06)";c.beginPath();c.moveTo(16,180);c.lineTo(624,180);c.stroke();
    // Two column body
    c.font="13px Georgia,serif";c.fillStyle="rgba(245,241,232,0.5)";
    wrapText(c,n.body,16,200,290,18);
    wrapText(c,n.body,330,200,290,18);
  }

  // Scanlines on all
  for(let y=0;y<400;y+=3){c.fillStyle="rgba(0,0,0,0.08)";c.fillRect(0,y,640,1);}
  // Subtle vignette
  const vig=c.createRadialGradient(320,200,100,320,200,380);vig.addColorStop(0,"transparent");vig.addColorStop(1,"rgba(0,0,0,0.3)");
  c.fillStyle=vig;c.fillRect(0,0,640,400);
  // Bottom branding
  c.font="bold 9px system-ui";c.fillStyle=n.col+"55";c.textAlign="right";
  c.fillText("FLEMINGSTUDIOS.EU",624,394);c.textAlign="left";
  return new THREE.CanvasTexture(cv);
}

function wrapText(c:CanvasRenderingContext2D,text:string,x:number,y:number,maxW:number,lineH:number){
  const words=text.split(" ");let line="";
  words.forEach(w=>{const test=line+(line?" ":"")+w;
    if(c.measureText(test).width>maxW){c.fillText(line,x,y);line=w;y+=lineH;}else line=test;});
  if(line)c.fillText(line,x,y);
}
