export const stations=[
  {id:'workflows',name:'Workflow gaming station',position:[-3,2,-3.45],kind:'workflows'},
  {id:'executions',name:'Execution monitor',position:[3,2,-3.45],kind:'executions'},
  {id:'host',name:'AI workflow representative',position:[5.7,1.4,0],kind:'agent'},
  {id:'server',name:'Infrastructure rack',position:[-6.6,1.4,-3],kind:'server'},
  {id:'hub',name:'Command table',position:[0,1.5,0],kind:'overview'},
  {id:'cafe',name:'Coffee bar · activity lounge',position:[-5.5,1.6,2.8],kind:'executions'}
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
