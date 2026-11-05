'use client';
import {Suspense,useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Physics,RigidBody,CuboidCollider,CapsuleCollider,useRapier,useBeforePhysicsStep} from '@react-three/rapier';
import {CanvasTexture,Vector3,Euler,MathUtils,Matrix4,Color,RepeatWrapping} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {stations,movement,interactionTarget} from './world.mjs';
import {agentState} from './data.mjs';

function SoftBox({position,size,color='#202623',radius=.06,solid=false}){
  const geometry=useMemo(()=>new RoundedBoxGeometry(...size,2,radius),[...size,radius]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  const mesh=<mesh position={solid?undefined:position} geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.6}/></mesh>;
  return solid?<RigidBody type="fixed" position={position} colliders={false}><CuboidCollider args={size.map(n=>n/2)}/>{mesh}</RigidBody>:mesh;
}
function WoodFloor(){
  const boards=useRef();
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#a58058';ctx.fillRect(0,0,512,128);
    for(let i=0;i<160;i++){ctx.strokeStyle=`rgba(${i%2?'45,25,12':'224,186,132'},.12)`;ctx.lineWidth=i%3+1;ctx.beginPath();ctx.moveTo(0,i*.8);ctx.bezierCurveTo(180,i*.8+Math.sin(i)*5,300,i*.8-Math.cos(i)*4,512,i*.8);ctx.stroke();}
    const map=new CanvasTexture(canvas);map.wrapS=map.wrapT=RepeatWrapping;map.repeat.set(2,1);return map;
  },[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  useLayoutEffect(()=>{const matrix=new Matrix4();for(let i=0;i<48;i++){matrix.makeTranslation(i%2?-4:4,.009,-5.75+Math.floor(i/2)*.5);boards.current.setMatrixAt(i,matrix);boards.current.setColorAt(i,new Color(['#b89878','#b09a80','#c0a38a','#ae947d'][i%4]));}boards.current.instanceMatrix.needsUpdate=true;},[]);
  return <instancedMesh ref={boards} args={[null,null,48]} receiveShadow><boxGeometry args={[7.98,.02,.485]}/><meshStandardMaterial map={texture} roughness={.77}/></instancedMesh>;
}
function Cup({position}){
  return <group position={position}><mesh><cylinderGeometry args={[.075,.055,.13,16]}/><meshStandardMaterial color="#ded9cc" roughness={.3}/></mesh><mesh position={[0,.067,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.06,16]}/><meshStandardMaterial color="#443023"/></mesh><mesh position={[.075,0,0]}><torusGeometry args={[.038,.012,6,12]}/><meshStandardMaterial color="#ded9cc"/></mesh></group>;
}
function Chair({position,accent}){
  return <group position={position}><SoftBox position={[0,.58,0]} size={[.72,.16,.7]} color="#292f36" solid/><SoftBox position={[0,1.14,.27]} size={[.68,1,.19]} color="#22282d" solid/><SoftBox position={[0,1.55,.24]} size={[.43,.2,.23]} color={accent}/><Box position={[0,1.15,.158]} size={[.05,.55,.012]} color={accent}/>{[-.46,.46].map(x=><group key={x}><SoftBox position={[x,.83,0]} size={[.15,.1,.53]}/><Box position={[x,.67,.15]} size={[.07,.3,.07]}/></group>)}<mesh position={[0,.28,0]}><cylinderGeometry args={[.06,.07,.5,12]}/><meshStandardMaterial color="#606b71" metalness={.7} roughness={.3}/></mesh>{[0,1,2,3,4].map(i=><group key={i} rotation={[0,i*Math.PI*.4,0]}><Box position={[0,.075,.23]} size={[.07,.06,.48]} color="#4c565d"/><mesh position={[0,.07,.45]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.065,.065,.09,8]}/><meshStandardMaterial color="#111716"/></mesh></group>)}</group>;
}
function CoffeeBar(){
  return <group position={[-5.5,0,2.8]}><SoftBox position={[0,.53,0]} size={[3.2,1.05,.95]} color="#524633" solid/><SoftBox position={[0,1.09,0]} size={[3.35,.12,1.05]} color="#c9bda6"/><Box position={[0,.95,.49]} size={[3,.025,.02]} color="#edb66b"/>{[-1.35,-1,-.65,-.3,.05,.4,.75,1.1,1.4].map(x=><Box key={x} position={[x,.48,.48]} size={[.025,.8,.018]} color="#877457"/>)}<SoftBox position={[-.6,1.43,0]} size={[.9,.6,.55]} color="#83908e"/><Box position={[-.6,1.46,.29]} size={[.74,.27,.035]} color="#17221c"/>{[-.8,-.45].map(x=><group key={x}><Box position={[x,1.35,.35]} size={[.1,.08,.3]}/><Cup position={[x,1.23,.38]}/></group>)}<Cup position={[.25,1.23,.1]}/><Cup position={[.5,1.23,.1]}/><Box position={[1.1,1.28,-.05]} size={[.5,.07,.4]}/><Box position={[1.1,1.48,-.18]} size={[.42,.35,.05]} color="#304339"/><mesh position={[-1.3,1.36,0]}><cylinderGeometry args={[.12,.14,.4,16]}/><meshStandardMaterial color="#333d34" metalness={.5}/></mesh></group>;
}

function Box({position,size,color='#141a17',solid=false,...props}){
  const mesh=<mesh position={solid?undefined:position} castShadow receiveShadow {...props}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.7}/></mesh>;
  return solid?<RigidBody type="fixed" position={position} colliders={false}><CuboidCollider args={size.map(n=>n/2)}/>{mesh}</RigidBody>:mesh;
}
function Screen({position,title,lines,color='#98ff02',onClick}){
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
    const context=canvas.getContext('2d');context.fillStyle='#09120f';context.fillRect(0,0,768,384);
    context.fillStyle=color;context.font='bold 24px monospace';context.fillText('SHIV / WORKSPACE',35,50);
    context.fillStyle='#ffffff';context.font='bold 36px sans-serif';context.fillText(title,35,112);
    context.font='22px monospace';lines.forEach((line,i)=>{context.fillStyle=i===0?color:'#aab4aa';context.fillText(line.slice(0,49),35,175+i*48);});
    return new CanvasTexture(canvas);
  },[title,lines.join('|'),color]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <group position={position}><Box size={[2.5,1.3,.14]}/><mesh position={[0,0,.08]} onClick={onClick}><planeGeometry args={[2.36,1.16]}/><meshBasicMaterial map={texture}/></mesh><Box position={[0,-.8,0]} size={[.12,.35,.12]}/><Box position={[0,-.96,.1]} size={[.65,.05,.4]}/></group>;
}
function Human({motion,typing=false,color='#777bc1',npc=false,...props}){
  const left=useRef(),right=useRef(),arm=useRef();
  useFrame(({clock},delta)=>{const state=motion?.current,wave=state?.moving?Math.sin(clock.elapsedTime*(state.running?13:8))*.55:0,blend=1-Math.exp(-12*delta);if(left.current)left.current.rotation.x=MathUtils.lerp(left.current.rotation.x,wave,blend);if(right.current)right.current.rotation.x=MathUtils.lerp(right.current.rotation.x,-wave,blend);if(arm.current)arm.current.rotation.x=MathUtils.lerp(arm.current.rotation.x,typing ? .85+Math.sin(clock.elapsedTime*9)*.06:-wave,blend);});
  return <group {...props}>
    <mesh position={[0,1.52,0]} castShadow><sphereGeometry args={[.2,12,10]}/><meshStandardMaterial color={npc?'#b48062':'#c99476'}/></mesh>
    <mesh position={[0,1.66,-.03]}><sphereGeometry args={[.195,12,8,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#25201b"/></mesh>
    <SoftBox position={[0,1.13,0]} size={[.48,.55,.28]} color={color}/>
    {[-.073,.073].map(x=><mesh key={x} position={[x,1.54,-.178]}><sphereGeometry args={[.022,8,6]}/><meshBasicMaterial color="#211c18"/></mesh>)}<SoftBox position={[0,1.42,-.16]} size={[.08,.025,.025]} color="#8b5242" radius={.01}/><Box position={[0,1.13,-.15]} size={[.02,.46,.01]} color="#c8d6cc"/>
    {npc&&<group position={[0,1.05,-.38]} rotation={[-.45,0,0]}><SoftBox size={[.32,.23,.04]} color="#121b1d" position={[0,0,0]} radius={.015}/><Box position={[0,0,-.025]} size={[.27,.18,.005]} color={typing?'#98ff02':'#718d94'}/></group>}
    <group ref={left} position={[-.14,.86,0]}><Box position={[0,-.34,0]} size={[.18,.68,.22]} color="#252e33"/><Box position={[0,-.7,-.05]} size={[.21,.13,.32]} color="#161918"/></group>
    <group ref={right} position={[.14,.86,0]}><Box position={[0,-.34,0]} size={[.18,.68,.22]} color="#252e33"/><Box position={[0,-.7,-.05]} size={[.21,.13,.32]} color="#161918"/></group>
    <group ref={arm} position={[-.33,1.3,0]}><Box position={[0,-.23,0]} size={[.14,.5,.17]} color={color}/><Box position={[0,-.5,0]} size={[.13,.14,.15]} color="#c99476"/></group><Box position={[.33,1.08,0]} size={[.14,.5,.17]} color={color}/>
  </group>;
}
function Desk({x,index,stats,onOpen}){
  const item=stations[index],latest=stats?.executions?.[0],lines=index===0?[`${stats?.counts.workflows??'—'} WORKFLOWS / ${stats?.counts.agents??'—'} AI WORKFLOWS`,stats?.workflows?.[0]?.name||'No workflows available','E · INSPECT WORKFLOWS']:[stats?.n8nConnected?`${stats.counts.running??'—'} RUNNING / ${stats.counts.failures??'—'} ERRORS TODAY`:'SOURCE DISCONNECTED OR STALE',latest?`${latest.name}: ${latest.status}`:'No executions in snapshot','E · EXECUTION HISTORY'];
  return <group position={[x,0,-3.4]}>
    <SoftBox position={[0,.92,0]} size={[3.4,.16,1.45]} color="#151815" solid/>
    {[-1.45,1.45].map(dx=><Box key={dx} position={[dx,.43,0]} size={[.12,.9,1.2]} solid/>)}
    <Box position={[0,.98,.68]} size={[3.3,.02,.025]} color={index?'#8e68da':'#98ff02'}/>
    <Screen position={[0,1.85,-.25]} title={index?'EXECUTION CONSOLE':'WORKFLOW STATION'} lines={lines} color={index?'#b19ae3':'#98ff02'} onClick={e=>{e.stopPropagation();onOpen(item);}}/>
    <Box position={[0,1.015,.34]} size={[1.9,.014,.6]} color={index?'#332643':'#233d31'}/>
    {Array.from({length:30},(_,i)=><Box key={i} position={[-.7+i%10*.095,1.065,.29+Math.floor(i/10)*.08]} size={[.07,.012,.05]} color={i%6===0?'#859f78':'#515b58'}/>)}
    <Cup position={[-1.4,1.09,.4]}/>
    <Box position={[-.25,1.03,.4]} size={[1.05,.05,.36]} color="#383d3b"/><Box position={[.6,1.04,.4]} size={[.18,.07,.26]}/>
    <Box position={[1.32,1.35,-.1]} size={[.45,.72,.65]}/>{[1.15,1.4,1.65].map(y=><mesh key={y} position={[1.32,y,.24]}><torusGeometry args={[.09,.015,6,20]}/><meshBasicMaterial color={index?'#a589e1':'#98ff02'}/></mesh>)}
    <Chair position={[0,0,1.4]} accent={index?'#9a7ad2':'#99b574'}/>
    <mesh position={[1.57,1.37,-.1]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[.6,.62]}/><meshPhysicalMaterial color="#93b8bc" transparent opacity={.18} roughness={.15} depthWrite={false}/></mesh>
  </group>;
}
function Plant({x,z}){
  return <group position={[x,0,z]}><mesh position={[0,.25,0]} castShadow><cylinderGeometry args={[.3,.23,.5,10]}/><meshStandardMaterial color="#a69b83"/></mesh>{[0,1,2,3,4].map(i=><mesh key={i} position={[Math.sin(i*2)*.15,.7+i*.12,Math.cos(i*2)*.15]} rotation={[.2,i,.4]} castShadow><sphereGeometry args={[.28,8,6]}/><meshStandardMaterial color={i%2?'#426448':'#59774c'}/></mesh>)}</group>;
}
function Room({stats,onOpen}){
  return <>
    <color attach="background" args={['#050807']}/><fog attach="fog" args={['#050807',22,45]}/>
    <ambientLight intensity={.85}/><hemisphereLight args={['#e2e9df','#50402b',1.6]}/><directionalLight position={[2,9,5]} intensity={2.5} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-.001}/>
    <pointLight position={[-3,2.7,-3]} color="#98ff02" intensity={7} distance={6}/><pointLight position={[3,2.7,-3]} color="#9b74df" intensity={9} distance={6}/>
    <Box position={[0,-.15,0]} size={[16,.3,12]} color="#332a22" solid/>
    <WoodFloor/>
    <Box position={[0,1.8,-6]} size={[16,3.6,.2]} color="#111a16" solid/>
    <Box position={[-8,1.8,0]} size={[.2,3.6,12]} color="#15201a" solid/>
    <Box position={[8,1.8,0]} size={[.2,3.6,12]} color="#17201c" solid/>
    <RigidBody type="fixed" colliders={false}><CuboidCollider position={[0,1.8,6]} args={[8,1.8,.1]}/></RigidBody>
    <Box position={[0,3.1,-5.85]} size={[14,.035,.05]} color="#98ff02"/>
    <Screen position={[0,2.25,-5.84]} title="SHIV / GAMING CAFÉ" lines={[`${stats?.counts.workflows??'—'} WORKFLOWS CONNECTED`,'CREATE · CONNECT · RECHARGE']} onClick={()=>onOpen(stations[4])}/>
    {[-3,3].map(x=><group key={x}><Box position={[x,3.45,-3.2]} size={[3.6,.1,.16]}/><mesh position={[x,3.39,-3.2]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[3.4,.13]}/><meshBasicMaterial color="#e2e8d4"/></mesh><Box position={[x-1.3,3.75,-3.2]} size={[.025,.6,.025]}/><Box position={[x+1.3,3.75,-3.2]} size={[.025,.6,.025]}/></group>)}
    {Array.from({length:14},(_,i)=><Box key={i} position={[-7.87,1.7,-4.6+i*.26]} size={[.04,3.2,.05]} color="#66563d"/>)}
    <Box position={[7.86,1.95,2.1]} size={[.05,1.8,2.6]} color="#94bfc0"/>{Array.from({length:10},(_,i)=><Box key={i} position={[7.8,1.16+i*.17,2.1]} size={[.12,.035,2.7]} color="#303c3b"/>)}
    <Desk x={-3} index={0} stats={stats} onOpen={onOpen}/><Desk x={3} index={1} stats={stats} onOpen={onOpen}/>
    <Box position={[0,.55,0]} size={[2,.95,1.35]} color="#1d2925" solid/><Box position={[0,1.05,0]} size={[2.1,.05,1.45]} color="#5e7870"/>
    <mesh position={[0,1.2,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.4,.43,48]}/><meshBasicMaterial color="#98ff02" transparent opacity={.8}/></mesh>
    <mesh position={[0,1.45,0]} rotation={[.3,.7,.2]}><icosahedronGeometry args={[.25,0]}/><meshBasicMaterial color="#98ff02" wireframe/></mesh>
    <group position={[-6.6,0,-3]}><Box position={[0,1.15,0]} size={[.9,2.3,1]} color="#101616" solid/>{Array.from({length:7},(_,i)=><group key={i}><Box position={[0,.3+i*.28,.52]} size={[.74,.2,.035]} color="#29342e"/><Box position={[.25,.3+i*.28,.55]} size={[.035,.035,.015]} color="#7d8981"/></group>)}</group>
    <Human position={[5.7,0,0]} rotation={[0,-1,0]} npc typing={agentState(stats)==='running'}/><RigidBody type="fixed" colliders={false}><CapsuleCollider position={[5.7,.9,0]} args={[.6,.3]}/></RigidBody>
    <SoftBox position={[5.8,.35,3.8]} size={[3,.6,1.2]} color="#4c6055" solid/><SoftBox position={[5.8,.8,4.3]} size={[3,.8,.22]} color="#627568" solid/>{[4.9,5.8,6.7].map(x=><SoftBox key={x} position={[x,.69,3.7]} size={[.86,.15,.85]} color="#748678"/>)}{[4.35,7.25].map(x=><SoftBox key={x} position={[x,.67,3.8]} size={[.2,.6,1.1]} color="#566c5c"/>)}
    <Box position={[5.5,.045,2.9]} size={[3.6,.025,3]} color="#384647"/><SoftBox position={[5.5,.4,2]} size={[1.4,.08,.7]} color="#a18e73" solid/><Box position={[5.5,.2,2]} size={[.5,.4,.4]}/><Cup position={[5.3,.51,2]}/>
    <CoffeeBar/>
    <Plant x={-7} z={-5}/><Plant x={7} z={-5}/><Plant x={-7} z={4.8}/><Plant x={7} z={1.8}/>
    <Box position={[-7.5,2.3,.4]} size={[.65,.1,2]} color="#66513e"/>{[0,1,2,3,4].map(i=><Box key={i} position={[-7.5,2.55,-.2+i*.22]} size={[.4,.4,.15]} color={['#c4bb9c','#676e98','#8f9b75'][i%3]}/>)}
    <mesh position={[7.1,1.65,-.9]}><boxGeometry args={[.03,3.3,3]}/><meshPhysicalMaterial color="#9abca9" transparent opacity={.12} roughness={.18} depthWrite={false}/></mesh><Box position={[7.1,1.65,-2.4]} size={[.07,3.3,.07]} color="#586a5c"/>
  </>;
}
function Controller({mode,active,onTarget,player,sensitivity,fov,bob,destination}){
  const body=useRef(),avatar=useRef(),keys=useRef(new Set()),dragging=useRef(false),angles=useRef({yaw:0,pitch:0}),motion=useRef({moving:false,running:false}),lastTarget=useRef(null);
  const {camera,gl}=useThree(),{world,rapier}=useRapier();
  const orbit=useRef(),tick=useRef(0),wasMode=useRef(mode),visited=useRef(null);
  const scratch=useMemo(()=>({eye:new Vector3(),desired:new Vector3(),direction:new Vector3(),rotation:new Euler(0,0,0,'YXZ')}),[]);
  useEffect(()=>{camera.fov=fov;camera.updateProjectionMatrix();},[camera,fov]);
  useEffect(()=>{
    const controls=new OrbitControls(camera,gl.domElement);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=24;controls.maxPolarAngle=Math.PI/2-.05;controls.target.set(0,1,0);controls.enabled=false;orbit.current=controls;
    return()=>controls.dispose();
  },[camera,gl]);
  useEffect(()=>{
    const clear=()=>{keys.current.clear();dragging.current=false;};
    const down=e=>{if(active&&(document.pointerLockElement===gl.domElement||document.activeElement===gl.domElement)&&!e.ctrlKey&&!e.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Tab'].includes(e.code))e.preventDefault();keys.current.add(e.code);}};
    const up=e=>keys.current.delete(e.code);
    const look=e=>{if(!active||!['first','third'].includes(mode)||(document.pointerLockElement!==gl.domElement&&!dragging.current))return;angles.current.yaw-=e.movementX*.002*sensitivity;angles.current.pitch=MathUtils.clamp(angles.current.pitch-e.movementY*.002*sensitivity,-1.15,1.15);};
    const drag=()=>{gl.domElement.focus();dragging.current=true;},release=()=>{dragging.current=false;};
    const lock=()=>{if(active&&(mode==='first'||mode==='third'))gl.domElement.requestPointerLock?.()?.catch?.(()=>{});};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);gl.domElement.addEventListener('blur',clear);document.addEventListener('pointerlockchange',clear);document.addEventListener('mousemove',look);gl.domElement.addEventListener('click',lock);gl.domElement.addEventListener('pointerdown',drag);window.addEventListener('pointerup',release);
    return()=>{clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);gl.domElement.removeEventListener('blur',clear);document.removeEventListener('pointerlockchange',clear);document.removeEventListener('mousemove',look);gl.domElement.removeEventListener('click',lock);gl.domElement.removeEventListener('pointerdown',drag);window.removeEventListener('pointerup',release);if(document.pointerLockElement===gl.domElement)document.exitPointerLock();};
  },[active,mode,sensitivity,gl]);
  useEffect(()=>{if(!active){keys.current.clear();document.exitPointerLock?.();}},[active]);
  useEffect(()=>{if(destination&&destination!==visited.current&&mode==='overview'&&body.current){visited.current=destination;body.current.setTranslation({x:MathUtils.clamp(destination.x,-6.5,6.5),y:1,z:MathUtils.clamp(destination.z,-4.5,5)},true);body.current.setLinvel({x:0,y:0,z:0},true);}},[destination,mode]);
  useBeforePhysicsStep(()=>{
    if(!body.current)return;
    const velocity=active&&(mode==='first'||mode==='third')&&(document.pointerLockElement===gl.domElement||document.activeElement===gl.domElement)?movement(keys.current,angles.current.yaw):{x:0,z:0};
    body.current.setLinvel({...velocity,y:body.current.linvel().y},true);motion.current={moving:Math.hypot(velocity.x,velocity.z)>.1,running:keys.current.has('ShiftLeft')||keys.current.has('ShiftRight')};
  });
  useFrame(({clock},delta)=>{
    if(!body.current)return;
    const p=body.current.translation(),yaw=angles.current.yaw;
    if(p.y<-3){body.current.setTranslation({x:0,y:1,z:4},true);body.current.setLinvel({x:0,y:0,z:0},true);}
    player.current={x:p.x,z:p.z,yaw};
    if(avatar.current){avatar.current.position.set(p.x,p.y-.9,p.z);avatar.current.rotation.y=yaw;avatar.current.visible=mode!=='first';}
    if(orbit.current)orbit.current.enabled=active&&mode==='free';
    if(wasMode.current!==mode){if(mode==='free'){camera.position.set(p.x+6,6,p.z+6);orbit.current?.target.set(p.x,1,p.z);}wasMode.current=mode;}
    scratch.eye.set(p.x,p.y+.72+(bob&&motion.current.moving?Math.sin(clock.elapsedTime*10)*.025:0),p.z);
    scratch.rotation.set(angles.current.pitch,yaw,0);scratch.direction.set(0,0,-1).applyEuler(scratch.rotation);
    if(mode==='first'){camera.position.copy(scratch.eye);camera.rotation.copy(scratch.rotation);}
    if(mode==='third'){
      scratch.desired.copy(scratch.direction).multiplyScalar(-3.6);scratch.desired.y+=.7;
      const length=scratch.desired.length(),ray=new rapier.Ray(scratch.eye,scratch.desired.clone().normalize());
      const hit=world.castRay(ray,length,true,undefined,undefined,undefined,body.current);
      if(hit)scratch.desired.setLength(Math.max(.25,hit.timeOfImpact-.18));
      scratch.desired.add(scratch.eye);camera.position.lerp(scratch.desired,1-Math.exp(-12*delta));camera.lookAt(scratch.eye.clone().add(scratch.direction));
    }
    if(mode==='overview'){camera.position.lerp(new Vector3(9,10,12),1-Math.exp(-5*delta));camera.lookAt(0,0,0);}
    if(mode==='free')orbit.current?.update();
    tick.current+=delta;if(tick.current>.12){tick.current=0;let target=active&&(mode==='first'||mode==='third')?interactionTarget(scratch.eye.toArray(),scratch.direction.toArray()):null;
      if(target){const toward=new Vector3(...target.position).sub(scratch.eye),distance=toward.length();const hit=world.castRay(new rapier.Ray(scratch.eye,toward.normalize()),Math.max(0,distance-.65),true,undefined,undefined,undefined,body.current);if(hit)target=null;}
      if(lastTarget.current!==target?.id){lastTarget.current=target?.id;onTarget(target);}
    }
  });
  return <><RigidBody ref={body} position={[0,1,4]} colliders={false} enabledRotations={[false,false,false]} friction={0} restitution={0} ccd linearDamping={0}><CapsuleCollider args={[.55,.3]}/></RigidBody><group ref={avatar}><Human color="#8582ac" motion={motion}/></group></>;
}
function AdaptiveResolution({quality}){
  const {setDpr,gl}=useThree(),sample=useRef({elapsed:0,frames:0,warmup:0});
  useEffect(()=>{sample.current={elapsed:0,frames:0,warmup:0};},[quality]);
  useFrame((_,delta)=>{
    const current=sample.current;if(document.hidden||delta>.2){current.elapsed=0;current.frames=0;return;}
    current.warmup+=delta;if(current.warmup<4)return;
    current.elapsed+=delta;current.frames++;
    if(current.elapsed>=3){if(current.frames/current.elapsed<35&&gl.getPixelRatio()>.8)setDpr(Math.max(.8,gl.getPixelRatio()-.2));current.elapsed=0;current.frames=0;}
  });
  return null;
}
export default function World(props){
  return <Canvas shadows={props.quality!=='low'} dpr={props.quality==='low'?1:[1,props.quality==='high'?1.75:1.25]} camera={{position:[9,10,12],fov:70,near:.08,far:65}} gl={{antialias:true,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.setClearColor('#050807');gl.domElement.tabIndex=0;gl.domElement.setAttribute('aria-label','Playable office. Click then WASD to move. Drag to look if mouse capture is unavailable.');}}><AdaptiveResolution quality={props.quality}/><Suspense fallback={null}><Physics timeStep={1/60}><Room stats={props.stats} onOpen={item=>{if(props.active&&(props.mode==='overview'||props.mode==='free'))props.onOpen(item);}}/><Controller {...props}/></Physics></Suspense></Canvas>;
}
