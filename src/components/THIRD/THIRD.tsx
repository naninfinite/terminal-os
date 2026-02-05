/**
 * `THIRD` mounts a minimal Three.js scene into a div.
 * The renderer resizes with the panel via `ResizeObserver` and uses a lightweight wireframe scene.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './THIRD.module.scss';

const THIRD: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene + camera are created once. We only mutate camera aspect on resize.
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 3;

    // Renderer DOM element is appended to the mount div and cleaned up on unmount.
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    renderer.domElement.className = styles.canvas;

    // Minimal wireframe objects
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const group = new THREE.Group();
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), material);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 8, 32), material);
    sphere.position.x = -1.2;
    torus.position.x = 1.2;
    group.add(cube, sphere, torus);
    scene.add(group);

    const resize = () => {
      if (!mount) return;
      const { clientWidth: w, clientHeight: h } = mount;
      if (w === 0 || h === 0) return;
      
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(mount);

    let raf = 0;
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      // Render once without continuous animation
      renderer.render(scene, camera);
    } else {
      const tick = () => {
        raf = requestAnimationFrame(tick);
        group.rotation.x += 0.003;
        group.rotation.y += 0.004;
        renderer.render(scene, camera);
      };
      tick();
    }

    return () => {
      // Full cleanup: stop raf, disconnect observers, dispose GPU resources, and remove canvas.
      cancelAnimationFrame(raf);
      obs.disconnect();
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={styles.root} />;
};

export default THIRD;



