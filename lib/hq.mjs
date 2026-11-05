export const stations=[
  {id:'portfolio',name:'Portfolio workstation',position:[-3,1.55,-3.45],kind:'portfolio'},
  {id:'automation',name:'Automation workstation',position:[3,1.55,-3.45],kind:'automation'},
  {id:'host',name:'Office host · placeholder',position:[5.7,1.4,0],kind:'agent'},
  {id:'server',name:'Infrastructure rack',position:[-6.6,1.4,-3],kind:'server'},
  {id:'hub',name:'Command table',position:[0,1.5,0],kind:'portfolio'}
];
export const cameraModes=['first','third','free','overview'];
export function movement(keys,yaw){
  let x=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  let z=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
  const length=Math.hypot(x,z)||1,speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?5:2.7;
  x=x/length*speed;z=z/length*speed;
  return {x:x*Math.cos(yaw)+z*Math.sin(yaw),z:z*Math.cos(yaw)-x*Math.sin(yaw)};
}
export function interactionTarget(position,direction,items=stations){
  let best=null,nearest=2.8;
  for(const item of items){
    const offset=item.position.map((n,i)=>n-position[i]),distance=Math.hypot(...offset);
    const alignment=offset.reduce((sum,n,i)=>sum+n*direction[i],0)/(distance||1);
    if(distance<nearest&&alignment>.78){best=item;nearest=distance;}
  }
  return best;
}
