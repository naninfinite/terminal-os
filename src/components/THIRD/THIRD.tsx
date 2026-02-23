/**
 * `THIRD` mounts a minimal Three.js scene into a div.
 * The renderer tracks panel size via `ResizeObserver` and runs a lightweight
 * wireframe scene tuned for dashboard use.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './THIRD.module.scss';
import { useTheme } from '../../theme/ThemeProvider';
import { RUNTIME_THEME_PALETTE } from '../../theme/runtimePalette';
import type { ResolvedTheme } from '../../theme/types';

const toThreeHex = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getThirdPalette = (theme: ResolvedTheme): { background: number; wireframe: number } => {
  const palette = RUNTIME_THEME_PALETTE[theme];
  return {
    background: toThreeHex(palette.background, 0x000000),
    wireframe: toThreeHex(palette.text, 0x00ff66),
  };
};

const THIRD: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const palette = getThirdPalette(resolvedTheme);

    // Scene + camera are created once. We only mutate camera aspect on resize.
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 3;
    cameraRef.current = camera;

    // Renderer DOM element is appended to the mount div and cleaned up on unmount.
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    renderer.domElement.className = styles.canvas;

    // Minimal wireframe objects: low geometry complexity for responsiveness.
    const material = new THREE.MeshBasicMaterial({ color: palette.wireframe, wireframe: true });
    materialRef.current = material;
    const group = new THREE.Group();
    groupRef.current = group;
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), material);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 8, 32), material);
    sphere.position.x = -1.2;
    torus.position.x = 1.2;
    group.add(cube, sphere, torus);
    scene.add(group);

    // Keep camera projection and renderer size synchronized to panel dimensions.
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
      // Respect reduced-motion preference by rendering a static frame.
      renderer.render(scene, camera);
    } else {
      // Simple requestAnimationFrame loop rotating the grouped meshes.
      const tick = () => {
        raf = requestAnimationFrame(tick);
        group.rotation.x += 0.003;
        group.rotation.y += 0.004;
        renderer.render(scene, camera);
      };
      tick();
    }

    const onResetScene = () => {
      if (!groupRef.current) return;
      groupRef.current.rotation.set(0, 0, 0);
      if (reduce && sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    window.addEventListener('terminalos:third:reset-scene', onResetScene as EventListener);

    return () => {
      // Full cleanup: stop raf, disconnect observers, dispose GPU resources, and remove canvas.
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener('terminalos:third:reset-scene', onResetScene as EventListener);
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      sceneRef.current = null;
      cameraRef.current = null;
      groupRef.current = null;
      materialRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const material = materialRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!scene || !material) return;

    const palette = getThirdPalette(resolvedTheme);
    scene.background = new THREE.Color(palette.background);
    material.color.setHex(palette.wireframe);

    if (renderer && camera) {
      renderer.render(scene, camera);
    }
  }, [resolvedTheme]);

  return <div ref={mountRef} className={styles.root} />;
};

export default THIRD;
