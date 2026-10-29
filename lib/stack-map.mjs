export const nodeWidth = 170, nodeHeight = 84;
export const groups = [
  { id:'frontend',label:'FRONTEND',color:'#b197ef',x:40,y:40,width:430,height:190 },
  { id:'backend',label:'BACKEND',color:'#98ff02',x:560,y:130,width:420,height:290 },
  { id:'delivery',label:'DELIVERY',color:'#b197ef',x:40,y:340,width:430,height:190 }
];
export const nodes = [
  {id:'design',color:'#b197ef',group:'frontend',title:'design',tool:'HTML / CSS',tag:'form + function',x:65,y:108,description:'Responsive layouts, clear typography and thoughtful details that make a website feel like yours.'},
  {id:'interface',color:'#98ff02',group:'frontend',title:'interface',tool:'React / Next.js',tag:'the experience',x:270,y:108,description:'Component-driven interfaces that turn a design into something people can actually explore and use.'},
  {id:'api',color:'#b197ef',group:'backend',title:'application',tool:'Next.js / Node.js',tag:'logic + APIs',x:585,y:200,description:'The logic behind the interface: processing requests, validating inputs and connecting the pieces.'},
  {id:'data',color:'#98ff02',group:'backend',title:'database',tool:'MySQL',tag:'a solid foundation',x:790,y:310,description:'Structured records, useful relationships and careful handling of the data a product depends on.'},
  {id:'git',color:'#b197ef',group:'delivery',title:'version control',tool:'Git / GitHub',tag:'track every change',x:65,y:410,description:'A clear history of changes, a place to collaborate and a reliable starting point for each release.'},
  {id:'deploy',color:'#98ff02',group:'delivery',title:'deployment',tool:'Vercel',tag:'preview → publish',x:270,y:410,description:'The delivery path for this Next.js migration: review a preview, verify the details, then publish the accepted build.'}
];
export const edges = [['design','interface'],['interface','api'],['api','data'],['interface','git'],['git','deploy'],['deploy','api']];
export function clampNode(node, x, y) {
  const group = groups.find(g => g.id === node.group);
  return {x:Math.max(group.x+18,Math.min(group.x+group.width-nodeWidth-18,x)),y:Math.max(group.y+58,Math.min(group.y+group.height-nodeHeight-16,y))};
}
export function connectionPath(a,b) {
  const dx = b.x-a.x, dy = b.y-a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const sign = dx >= 0 ? 1 : -1;
    const sx=a.x+(sign>0?nodeWidth:0),sy=a.y+nodeHeight/2;
    const tx=b.x+(sign>0?0:nodeWidth),ty=b.y+nodeHeight/2;
    const middle=(sx+tx)/2;
    return `M ${sx} ${sy} C ${middle} ${sy}, ${middle} ${ty}, ${tx} ${ty}`;
  }
  const sign = dy >= 0 ? 1 : -1;
  const sx=a.x+nodeWidth/2,sy=a.y+(sign>0?nodeHeight:0);
  const tx=b.x+nodeWidth/2,ty=b.y+(sign>0?0:nodeHeight);
  const middle=(sy+ty)/2;
  return `M ${sx} ${sy} C ${sx} ${middle}, ${tx} ${middle}, ${tx} ${ty}`;
}
export function neighbors(id) {
  return new Set([id,...edges.filter(edge=>edge.includes(id)).flat()]);
}
