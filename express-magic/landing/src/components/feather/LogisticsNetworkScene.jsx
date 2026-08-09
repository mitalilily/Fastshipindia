import { useEffect, useRef } from "react";
import * as THREE from "three";

const nodePositions = [
  [-4.8, 1.5, -1.2],
  [-3.6, -0.9, 0.4],
  [-2.4, 2.3, -2.2],
  [-1.8, 0.2, 1.1],
  [-0.4, -1.8, -0.7],
  [0.4, 1.7, -1.5],
  [1.7, -0.2, 0.8],
  [2.9, 2.2, -1.2],
  [3.8, -1.4, -0.2],
  [5.1, 0.8, -2.1],
];

const connections = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 5],
  [3, 5],
  [3, 6],
  [4, 6],
  [5, 6],
  [5, 7],
  [6, 7],
  [6, 8],
  [7, 9],
  [8, 9],
];

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else {
      child.material?.dispose();
    }
  });
}

function LogisticsNetworkScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06152d, 0.055);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0.2, 11.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const network = new THREE.Group();
    network.rotation.x = -0.12;
    network.rotation.y = -0.08;
    scene.add(network);

    scene.add(new THREE.AmbientLight(0x7eb7ff, 0.9));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(3, 5, 7);
    scene.add(keyLight);
    const accentLight = new THREE.PointLight(0xed1c24, 16, 12, 2);
    accentLight.position.set(3.8, -1, 2.5);
    scene.add(accentLight);

    const nodeGeometry = new THREE.SphereGeometry(0.105, 14, 14);
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0xa8ccff,
      emissive: 0x175faa,
      emissiveIntensity: 1.4,
      metalness: 0.25,
      roughness: 0.3,
    });
    const hubMaterial = new THREE.MeshStandardMaterial({
      color: 0xff5a61,
      emissive: 0xed1c24,
      emissiveIntensity: 2.2,
      metalness: 0.18,
      roughness: 0.26,
    });

    const nodes = nodePositions.map((position, index) => {
      const node = new THREE.Mesh(nodeGeometry, index === 3 || index === 8 ? hubMaterial : nodeMaterial);
      node.position.set(...position);
      node.scale.setScalar(index === 3 || index === 8 ? 1.55 : 1);
      network.add(node);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.2, 24),
        new THREE.MeshBasicMaterial({
          color: index === 3 || index === 8 ? 0xed1c24 : 0x5f9fe8,
          transparent: true,
          opacity: index === 3 || index === 8 ? 0.42 : 0.2,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      halo.position.copy(node.position);
      halo.lookAt(camera.position);
      network.add(halo);
      return { node, halo };
    });

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x477aa9,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
    });
    const linePoints = [];
    connections.forEach(([start, end]) => {
      linePoints.push(new THREE.Vector3(...nodePositions[start]), new THREE.Vector3(...nodePositions[end]));
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    network.add(new THREE.LineSegments(lineGeometry, lineMaterial));

    const routeCurves = [
      new THREE.CatmullRomCurve3([0, 2, 5, 7, 9].map((index) => new THREE.Vector3(...nodePositions[index]))),
      new THREE.CatmullRomCurve3([1, 3, 6, 8].map((index) => new THREE.Vector3(...nodePositions[index]))),
      new THREE.CatmullRomCurve3([4, 6, 7, 9].map((index) => new THREE.Vector3(...nodePositions[index]))),
    ];

    const routeMaterial = new THREE.MeshBasicMaterial({
      color: 0x6eafff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    routeCurves.forEach((curve, index) => {
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 42, index === 1 ? 0.018 : 0.012, 6, false), routeMaterial);
      network.add(tube);
    });

    const parcelGeometry = new THREE.BoxGeometry(0.17, 0.13, 0.13);
    const parcelMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x327cca,
      emissiveIntensity: 0.75,
      metalness: 0.15,
      roughness: 0.28,
    });
    const parcels = routeCurves.map((curve, index) => {
      const parcel = new THREE.Mesh(parcelGeometry, parcelMaterial);
      parcel.userData = { curve, offset: index * 0.31, speed: 0.025 + index * 0.004 };
      network.add(parcel);
      return parcel;
    });

    const stars = [];
    for (let index = 0; index < 92; index += 1) {
      const x = ((index * 37) % 101) / 101;
      const y = ((index * 61) % 97) / 97;
      const z = ((index * 29) % 89) / 89;
      stars.push((x - 0.5) * 15, (y - 0.5) * 9, -2.8 - z * 6);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0x7aa9d8, size: 0.025, transparent: true, opacity: 0.5 });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    let frameId = null;
    let isVisible = true;

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };

    const handlePointerMove = (event) => {
      const bounds = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2;
      pointer.y = ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2;
    };

    const renderFrame = () => {
      if (!isVisible || prefersReducedMotion) {
        frameId = null;
        return;
      }

      const elapsed = clock.getElapsedTime();
      network.rotation.y += (pointer.x * 0.055 - network.rotation.y) * 0.025;
      network.rotation.x += (-0.12 - pointer.y * 0.025 - network.rotation.x) * 0.025;
      camera.position.x += (pointer.x * 0.3 - camera.position.x) * 0.018;
      camera.position.y += (0.2 - pointer.y * 0.18 - camera.position.y) * 0.018;
      camera.lookAt(0, 0, 0);

      nodes.forEach(({ node, halo }, index) => {
        const pulse = 1 + Math.sin(elapsed * 1.2 + index * 0.7) * 0.06;
        halo.scale.setScalar(pulse);
        halo.lookAt(camera.position);
        node.rotation.y = elapsed * 0.18;
      });

      parcels.forEach((parcel) => {
        const { curve, offset, speed } = parcel.userData;
        const progress = (elapsed * speed + offset) % 1;
        parcel.position.copy(curve.getPointAt(progress));
        parcel.lookAt(curve.getPointAt(Math.min(progress + 0.012, 1)));
      });

      starField.rotation.y = elapsed * 0.004;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderFrame);
    };

    const start = () => {
      if (!prefersReducedMotion && frameId === null) {
        clock.start();
        frameId = window.requestAnimationFrame(renderFrame);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) start();
        else if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
          frameId = null;
        }
      },
      { threshold: 0.02 },
    );
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(mount);
    resizeObserver.observe(mount);
    mount.addEventListener("pointermove", handlePointerMove, { passive: true });
    resize();
    start();

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      observer.disconnect();
      resizeObserver.disconnect();
      mount.removeEventListener("pointermove", handlePointerMove);
      disposeObject(network);
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}

export default LogisticsNetworkScene;
