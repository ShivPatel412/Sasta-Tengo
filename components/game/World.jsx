'use client';
import {Suspense,useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Physics,RigidBody,CuboidCollider,CapsuleCollider,useRapier,useBeforePhysicsStep} from '@react-three/rapier';
import {CanvasTexture,Vector3,Euler,MathUtils} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {stations,movement,interactionTarget} from '../../lib/hq.mjs';

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
function Human({motion,color='#777bc1',npc=false,...props}){
  const left=useRef(),right=useRef(),arm=useRef();
  useFrame(({clock},delta)=>{const state=motion?.current,wave=state?.moving?Math.sin(clock.elapsedTime*(state.running?13:8))*.55:0,blend=1-Math.exp(-12*delta);if(left.current)left.current.rotation.x=MathUtils.lerp(left.current.rotation.x,wave,blend);if(right.current)right.current.rotation.x=MathUtils.lerp(right.current.rotation.x,-wave,blend);if(arm.current)arm.current.rotation.x=MathUtils.lerp(arm.current.rotation.x,-wave,blend);});
  return <group {...props}>
    <mesh position={[0,1.52,0]} castShadow><sphereGeometry args={[.2,12,10]}/><meshStandardMaterial color={npc?'#b48062':'#c99476'}/></mesh>
    <mesh position={[0,1.66,-.03]}><sphereGeometry args={[.195,12,8,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#25201b"/></mesh>
    <Box position={[0,1.13,0]} size={[.48,.55,.28]} color={color}/>
    <group ref={left} position={[-.14,.86,0]}><Box position={[0,-.34,0]} size={[.18,.68,.22]} color="#252e33"/><Box position={[0,-.7,-.05]} size={[.21,.13,.32]} color="#161918"/></group>
    <group ref={right} position={[.14,.86,0]}><Box position={[0,-.34,0]} size={[.18,.68,.22]} color="#252e33"/><Box position={[0,-.7,-.05]} size={[.21,.13,.32]} color="#161918"/></group>
    <group ref={arm} position={[-.33,1.3,0]}><Box position={[0,-.23,0]} size={[.14,.5,.17]} color={color}/><Box position={[0,-.5,0]} size={[.13,.14,.15]} color="#c99476"/></group><Box position={[.33,1.08,0]} size={[.14,.5,.17]} color={color}/>
  </group>;
}
function Desk({x,index,stats,onOpen}){
  const item=stations[index],lines=index===0?[`${stats?.counts.projects??'—'} PROJECTS / ${stats?.counts.experience??'—'} EXPERIENCE`,`${stats?.counts.unread_contacts??'—'} UNREAD MESSAGES`,'E · OPEN WORKSPACE']:['NOT CONNECTED','No workflow API configured','E · CONNECTION DETAILS'];
  return <group position={[x,0,-3.4]}>
    <Box position={[0,.92,0]} size={[3.4,.16,1.45]} color="#151815" solid/>
    {[-1.45,1.45].map(dx=><Box key={dx} position={[dx,.43,0]} size={[.12,.9,1.2]} solid/>)}
    <Box position={[0,.98,.68]} size={[3.3,.02,.025]} color={index?'#8e68da':'#98ff02'}/>
    <Screen position={[0,1.85,-.25]} title={index?'AUTOMATION':'PORTFOLIO'} lines={lines} color={index?'#b19ae3':'#98ff02'} onClick={e=>{e.stopPropagation();onOpen(item);}}/>
    <Box position={[-.25,1.03,.4]} size={[1.05,.05,.36]} color="#383d3b"/><Box position={[.6,1.04,.4]} size={[.18,.07,.26]}/>
    <Box position={[1.32,1.35,-.1]} size={[.45,.72,.65]}/>{[1.15,1.4,1.65].map(y=><mesh key={y} position={[1.32,y,.24]}><torusGeometry args={[.09,.015,6,20]}/><meshBasicMaterial color={index?'#a589e1':'#98ff02'}/></mesh>)}
    <Box position={[0,.55,1.35]} size={[.68,.18,.65]} solid/><Box position={[0,1.05,1.65]} size={[.65,.9,.16]} color="#292c32" solid/><Box position={[0,.24,1.35]} size={[.12,.45,.12]}/>
  </group>;
}
function Plant({x,z}){
  return <group position={[x,0,z]}><mesh position={[0,.25,0]} castShadow><cylinderGeometry args={[.3,.23,.5,10]}/><meshStandardMaterial color="#a69b83"/></mesh>{[0,1,2,3,4].map(i=><mesh key={i} position={[Math.sin(i*2)*.15,.7+i*.12,Math.cos(i*2)*.15]} rotation={[.2,i,.4]} castShadow><sphereGeometry args={[.28,8,6]}/><meshStandardMaterial color={i%2?'#426448':'#59774c'}/></mesh>)}</group>;
}
function Room({stats,onOpen}){
  return <>
    <color attach="background" args={['#050807']}/><fog attach="fog" args={['#050807',22,45]}/>
    <ambientLight intensity={.65}/><hemisphereLight args={['#d3e2dc','#33291d',1.3]}/><directionalLight position={[2,9,5]} intensity={2} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-.001}/>
    <pointLight position={[-3,2.7,-3]} color="#98ff02" intensity={7} distance={6}/><pointLight position={[3,2.7,-3]} color="#9b74df" intensity={9} distance={6}/>
    <Box position={[0,-.15,0]} size={[16,.3,12]} color="#332a22" solid/>
    {Array.from({length:24},(_,i)=><Box key={i} position={[0,.008,-5.75+i*.5]} size={[15.8,.015,.48]} color={['#514032','#44352b','#5a4635','#49392d'][i%4]}/>)}
    <Box position={[0,1.8,-6]} size={[16,3.6,.2]} color="#111a16" solid/>
    <Box position={[-8,1.8,0]} size={[.2,3.6,12]} color="#15201a" solid/>
    <Box position={[8,1.8,0]} size={[.2,3.6,12]} color="#17201c" solid/>
    <RigidBody type="fixed" colliders={false}><CuboidCollider position={[0,1.8,6]} args={[8,1.8,.1]}/></RigidBody>
    <Box position={[0,3.1,-5.85]} size={[14,.035,.05]} color="#98ff02"/>
    <Screen position={[0,2.25,-5.84]} title="AI AUTOMATION HQ" lines={['YOUR SPACE TO BUILD','PORTFOLIO / AUTOMATION / IDEAS']} onClick={()=>onOpen(stations[4])}/>
    <Desk x={-3} index={0} stats={stats} onOpen={onOpen}/><Desk x={3} index={1} stats={stats} onOpen={onOpen}/>
    <Box position={[0,.55,0]} size={[2,.95,1.35]} color="#1d2925" solid/><Box position={[0,1.05,0]} size={[2.1,.05,1.45]} color="#5e7870"/>
    <mesh position={[0,1.2,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.4,.43,48]}/><meshBasicMaterial color="#98ff02" transparent opacity={.8}/></mesh>
    <mesh position={[0,1.45,0]} rotation={[.3,.7,.2]}><icosahedronGeometry args={[.25,0]}/><meshBasicMaterial color="#98ff02" wireframe/></mesh>
    <group position={[-6.6,0,-3]}><Box position={[0,1.15,0]} size={[.9,2.3,1]} color="#101616" solid/>{Array.from({length:7},(_,i)=><group key={i}><Box position={[0,.3+i*.28,.52]} size={[.74,.2,.035]} color="#29342e"/><Box position={[.25,.3+i*.28,.55]} size={[.035,.035,.015]} color="#7d8981"/></group>)}</group>
    <Human position={[5.7,0,0]} rotation={[0,-1,0]} npc/><RigidBody type="fixed" colliders={false}><CapsuleCollider position={[5.7,.9,0]} args={[.6,.3]}/></RigidBody>
    <Box position={[5.8,.35,3.8]} size={[3,.6,1.2]} color="#5b6557" solid/><Box position={[5.8,.8,4.3]} size={[3,.8,.22]} color="#62705e" solid/>
    <Box position={[-5.5,.8,2.8]} size={[2,.1,.7]} color="#514335" solid/>{[-6.2,-4.8].map(x=><Box key={x} position={[x,.4,2.8]} size={[.1,.8,.6]}/>)}
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
