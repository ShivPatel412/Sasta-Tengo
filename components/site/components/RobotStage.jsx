'use client';

import { useEffect, useRef, useState } from 'react';

export default function RobotStage({ compact = false }) {
  const host = useRef(null);
  const controls = useRef(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = host.current;
    let disposed = false, observer, resize, renderer, scene, frame = 0;
    let visible = false, model, rotation = 0, targetX = 0, targetY = 0;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const state = { paused: motion.matches, reset: () => {} };
    controls.current = state;
    setPaused(state.paused);

    async function init() {
      try {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        if (disposed) return;
        scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
        camera.position.set(0, 0.35, compact ? 6.6 : 6.8);
        camera.lookAt(0, 0.1, 0);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.65;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        element.appendChild(renderer.domElement);
        scene.add(new THREE.HemisphereLight(0xeaffdf, 0x373e3a, 3));
        const key = new THREE.DirectionalLight(0xffffff, 5);
        key.position.set(-3, 4, 5); scene.add(key);
        const rim = new THREE.DirectionalLight(0x98ff02, 5);
        rim.position.set(3, 2, -2); scene.add(rim);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x98ff02 }));
        ring.rotation.x = Math.PI / 2; ring.position.y = -1.28; scene.add(ring);
        const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.55, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x272727, roughness: 0.5, metalness: 0.7 }));
        platform.position.y = -1.4; scene.add(platform);
        const gltf = await new GLTFLoader().loadAsync('/models/shiv-robot.glb');
        if (disposed) {
          gltf.scene.traverse(o => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
          return;
        }
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const scale = 2.35 / Math.max(size.x, size.y, size.z);
        gltf.scene.position.copy(center).multiplyScalar(-scale);
        gltf.scene.scale.setScalar(scale);
        model = new THREE.Group(); model.add(gltf.scene); scene.add(model);
        model.rotation.y = -0.2;
        setReady(true);
        state.reset = () => { rotation = 0; targetX = 0; targetY = 0; model.rotation.set(0, -0.2, 0); draw(); };
        resize = new ResizeObserver(() => {
          const width = element.clientWidth, height = element.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height; camera.updateProjectionMatrix(); draw();
        });
        resize.observe(element);
        function draw() { if (!disposed) renderer.render(scene, camera); }
        function tick(now) {
          frame = 0;
          if (disposed || !visible || document.hidden) return;
          if (!state.paused && !motion.matches) {
            model.rotation.y += ((-0.2 + targetX * 0.45 + rotation) - model.rotation.y) * 0.055;
            model.rotation.x += (targetY * 0.1 - model.rotation.x) * 0.055;
            model.position.y = Math.sin(now * 0.0013) * 0.045;
          }
          draw();
          if (!state.paused && !motion.matches) frame = requestAnimationFrame(tick);
        }
        state.start = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); };
        observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) state.start(); else { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: '120px' });
        observer.observe(element);
        state.start();
      } catch { if (!disposed) setFailed(true); }
    }
    function move(event) {
      if (state.paused || motion.matches) return;
      const rect = element.getBoundingClientRect();
      targetX = (event.clientX - rect.left) / rect.width * 2 - 1;
      targetY = (event.clientY - rect.top) / rect.height * 2 - 1;
    }
    function visibility() { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else state.start?.(); }
    function changeMotion() { state.paused = motion.matches; setPaused(state.paused); state.reset(); state.start?.(); }
    element.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', changeMotion);
    const start = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { start.disconnect(); init(); } }, { rootMargin: '200px' });
    start.observe(element);
    return () => {
      disposed = true; cancelAnimationFrame(frame); start.disconnect(); observer?.disconnect(); resize?.disconnect();
      element.removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', changeMotion);
      scene?.traverse(o => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { Object.values(m).forEach(v => { if (v?.isTexture) v.dispose(); }); m.dispose(); }); });
      renderer?.dispose(); renderer?.domElement.remove(); controls.current = null;
    };
  }, [compact]);

  function toggle() { const state = controls.current; if (!state) return; state.paused = !state.paused; setPaused(state.paused); state.start?.(); }

  return <div className={`robot-stage ${compact ? 'robot-stage-compact' : ''}`}>
    <div className="robot-orbit" aria-hidden="true" />
    <div className="robot-viewport" ref={host} role="img" aria-label="Shiv’s small mechanical robot on an illuminated green dock">
      <img className={`robot-poster ${ready ? 'robot-poster-hidden' : ''}`} src="/models/robot-poster.png" alt="" width="640" height="640" />
    </div>
    <div className="robot-caption caption-4"><span className="status-dot" />{failed ? 'Meet my studio companion' : ready ? 'A little curiosity. A lot of possibility.' : 'Meet my studio companion'}</div>
    {ready && <div className="robot-controls"><button type="button" className="caption-4" onClick={toggle} aria-pressed={paused}>{paused ? 'Resume motion' : 'Pause motion'}</button><button type="button" className="caption-4" onClick={() => controls.current?.reset()}>Reset view</button></div>}
  </div>;
}
