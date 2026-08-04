import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const ThreeHeadScene = () => {
	const containerRef = useRef(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let renderer;
		let scene;
		let camera;
		let head;
		let animationId;

		scene = new THREE.Scene();

		camera = new THREE.PerspectiveCamera(
			45,
			container.clientWidth / container.clientHeight,
			0.1,
			100
		);
		camera.position.set(0, 1.2, 3);

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(window.devicePixelRatio || 1);
		renderer.setSize(container.clientWidth, container.clientHeight);
		container.appendChild(renderer.domElement);

		const hemiLight = new THREE.HemisphereLight(0xffffff, 0x404040, 1);
		scene.add(hemiLight);
		const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
		dirLight.position.set(2, 4, 2);
		scene.add(dirLight);

		const loader = new GLTFLoader();
		loader.load(
			'/Head.glb',
			(gltf) => {
				head = gltf.scene;

				const box = new THREE.Box3().setFromObject(head);
				const size = new THREE.Vector3();
				const center = new THREE.Vector3();
				box.getSize(size);
				box.getCenter(center);
				head.position.sub(center);

				const maxDim = Math.max(size.x, size.y, size.z) || 1;
				const fov = camera.fov * (Math.PI / 180);
				const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.4;
				camera.position.set(0, maxDim * 0.3, distance);
				camera.lookAt(0, 0, 0);

				scene.add(head);
			},
			undefined,
			(err) => {
				console.error('Failed to load Head.glb', err);
			}
		);

		const handleResize = () => {
			if (!container || !renderer || !camera) return;
			const { clientWidth: w, clientHeight: h } = container;
			renderer.setSize(w, h);
			camera.aspect = (w || 1) / (h || 1);
			camera.updateProjectionMatrix();
		};

		window.addEventListener('resize', handleResize);

		const animate = () => {
			animationId = requestAnimationFrame(animate);
			if (head) {
				head.rotation.y += 0.005;
			}
			renderer.render(scene, camera);
		};

		animate();

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	return <div className="hero-three" ref={containerRef} />;
};

export default ThreeHeadScene;
