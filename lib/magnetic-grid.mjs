export function magneticTarget(x,y,pointer,radius=165) {
  if(!pointer.active)return{x,y,influence:0};
  const dx=pointer.x-x,dy=pointer.y-y,distance=Math.hypot(dx,dy);
  const influence=Math.max(0,1-distance/radius);
  const pull=Math.min(18*influence*influence,distance*.3)/(distance||1);
  return{x:x+dx*pull,y:y+dy*pull,influence};
}
export function stepGridPoint(point,target,dt=1) {
  const damping=Math.pow(.77,dt);
  point.vx=(point.vx+(target.x-point.x)*.09*dt)*damping;
  point.vy=(point.vy+(target.y-point.y)*.09*dt)*damping;
  point.x+=point.vx*dt;point.y+=point.vy*dt;
}
