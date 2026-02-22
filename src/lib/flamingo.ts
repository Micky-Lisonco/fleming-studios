
import*as THREE from"three";
export function buildFlamingo3D(col:number,accent:number):THREE.Group{
  const g=new THREE.Group();
  const m=(c:number,ei=0.35)=>new THREE.MeshStandardMaterial({color:c,emissive:new THREE.Color(c),emissiveIntensity:ei,roughness:0.4,metalness:0.6});
  const bm=m(col),am=m(accent,0.5),dm=m(0x111122,0.1);
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.36,14,10),bm.clone());body.scale.set(1,0.72,1.45);g.add(body);
  for(let i=0;i<5;i++){const tf=new THREE.Mesh(new THREE.ConeGeometry(0.055-i*0.007,0.3,6),am.clone());tf.position.set((i-2)*0.07,0.04,-0.52);tf.rotation.x=0.5;g.add(tf);}
  [[0,0.28,0.14],[0,0.52,0.26],[0,0.74,0.36],[0,0.93,0.42],[0,1.06,0.4],[0,1.17,0.33]].forEach(([x,y,z])=>{const n=new THREE.Mesh(new THREE.SphereGeometry(0.09,10,8),bm.clone());n.position.set(x,y,z);g.add(n);});
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.12,12,10),bm.clone());head.position.set(0,1.25,0.28);g.add(head);
  [-0.06,0.06].forEach(ex=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(0.026,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));eye.position.set(ex,1.29,0.36);g.add(eye);const p=new THREE.Mesh(new THREE.SphereGeometry(0.014,8,8),new THREE.MeshBasicMaterial({color:0}));p.position.set(ex*1.05,1.29,0.38);g.add(p);});
  const ub=new THREE.Mesh(new THREE.CylinderGeometry(0.024,0.016,0.26,8),dm.clone());ub.rotation.z=Math.PI/2;ub.position.set(0.19,1.26,0.28);g.add(ub);
  [-0.11,0.11].forEach((lx,li)=>{const ul=new THREE.Mesh(new THREE.CylinderGeometry(0.033,0.026,0.4,8),bm.clone());ul.position.set(lx,-0.46,0.04);g.add(ul);const kn=new THREE.Mesh(new THREE.SphereGeometry(0.038,8,8),am.clone());kn.position.set(lx+(li===0?0.02:-0.02),-0.7,0.04);g.add(kn);const ll=new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.02,0.38,8),bm.clone());ll.position.set(lx+(li===0?0.03:-0.03),-0.91,-0.04);ll.rotation.x=0.18;g.add(ll);[-0.055,0,0.055].forEach(tx=>{const t=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.005,0.18,6),dm.clone());t.rotation.x=-Math.PI/2+0.2;t.position.set(lx+(li===0?0.03:-0.03)+tx,-1.13,0.05);g.add(t);});});
  [-1,1].forEach(side=>{const wg=new THREE.Group();const w1=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.68,8),m(col,0.28));w1.rotation.z=side*(Math.PI/2-0.3);w1.rotation.x=0.2;w1.position.set(side*0.4,0.05,0);wg.add(w1);wg.userData={side};g.userData[side>0?"wingR":"wingL"]=wg;g.add(wg);});
  const visor=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.04,0.05),am.clone());visor.position.set(0,1.3,0.37);g.add(visor);
  return g;
}
