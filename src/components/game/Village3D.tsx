import { useEffect, useRef } from "react";
import * as THREE from "three";
import { BUILDING_LAYOUT, BUILDING_ORDER } from "@/lib/game/catalog";
import type { BuildingId, GameState } from "@/lib/game/types";

const SPREAD = 1.85;

type Props = {
  state: GameState;
  selected: BuildingId;
  onSelect: (id: BuildingId) => void;
  reducedMotion: boolean;
  onContextLost: () => void;
};

type Kit = {
  mats: Record<string, THREE.MeshLambertMaterial>;
  geos: THREE.BufferGeometry[];
};

function makeKit(): Kit {
  const color = (hex: number) => new THREE.MeshLambertMaterial({ color: hex });
  return {
    geos: [],
    mats: {
      plaster: color(0xead7b8),
      plasterLite: color(0xf4ead0),
      plasterDark: color(0xd4c09a),
      roof: color(0xc45b3a),
      roofDark: color(0xa33d28),
      stone: color(0xcfc3ab),
      stoneDark: color(0x9a9080),
      wood: color(0x8a6a42),
      woodDark: color(0x5c4630),
      pine: color(0x2c5a3c),
      pineLite: color(0x3f7550),
      pineDark: color(0x1d3f30),
      gold: color(0xe3b75a),
      banner: color(0x456e48),
      water: color(0x7eb3b0),
      ink: color(0x1d3329),
      grass: color(0x7fa86c),
      grassDark: color(0x5f8a55),
      sand: color(0xd7c79a),
      road: color(0xcbb58a),
      sky: color(0xf4e2a8),
      rust: color(0xb85a32),
      metal: color(0x6d7a72),
      cream: color(0xf7f1dc),
    },
  };
}

function addMesh(
  kit: Kit,
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  kit.geos.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function box(
  kit: Kit,
  parent: THREE.Object3D,
  mat: THREE.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  ry = 0,
) {
  return addMesh(kit, parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z, 0, ry, 0);
}

function cyl(
  kit: Kit,
  parent: THREE.Object3D,
  mat: THREE.Material,
  rTop: number,
  rBot: number,
  h: number,
  x: number,
  y: number,
  z: number,
  segs = 8,
) {
  return addMesh(kit, parent, new THREE.CylinderGeometry(rTop, rBot, h, segs), mat, x, y, z);
}

function cone(
  kit: Kit,
  parent: THREE.Object3D,
  mat: THREE.Material,
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  segs = 8,
) {
  return addMesh(kit, parent, new THREE.ConeGeometry(r, h, segs), mat, x, y, z);
}

function roofPrism(kit: Kit, parent: THREE.Object3D, w: number, h: number, d: number, y: number, mat: THREE.Material) {
  const geo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, h, 4);
  const mesh = addMesh(kit, parent, geo, mat, 0, y, 0, 0, Math.PI / 4, 0);
  mesh.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  return mesh;
}

function windows(kit: Kit, parent: THREE.Object3D, xs: number[], y: number, z: number, w = 0.12, h = 0.16) {
  for (const x of xs) {
    box(kit, parent, kit.mats.ink, w, h, 0.04, x, y, z);
  }
}

function makeCypress(kit: Kit, parent: THREE.Object3D, x: number, z: number, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  cyl(kit, g, kit.mats.woodDark, 0.04 * s, 0.05 * s, 0.22 * s, 0, 0.11 * s, 0, 5);
  cone(kit, g, kit.mats.pineDark, 0.22 * s, 1.15 * s, 0, 0.78 * s, 0, 6);
  cone(kit, g, kit.mats.pine, 0.14 * s, 0.7 * s, 0, 0.95 * s, 0, 6);
  parent.add(g);
  return g;
}

function makeLamp(kit: Kit, parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  cyl(kit, g, kit.mats.woodDark, 0.03, 0.035, 0.7, 0, 0.35, 0, 5);
  addMesh(kit, g, new THREE.SphereGeometry(0.08, 8, 6), kit.mats.gold, 0, 0.74, 0);
  parent.add(g);
}

function makeFountain(kit: Kit, parent: THREE.Object3D) {
  const g = new THREE.Group();
  g.position.set(0, 0, 0.15);
  cyl(kit, g, kit.mats.sand, 0.72, 0.78, 0.12, 0, 0.06, 0, 12);
  cyl(kit, g, kit.mats.water, 0.52, 0.52, 0.06, 0, 0.12, 0, 12);
  cyl(kit, g, kit.mats.plasterLite, 0.08, 0.1, 0.42, 0, 0.32, 0, 8);
  addMesh(kit, g, new THREE.SphereGeometry(0.1, 8, 6), kit.mats.cream, 0, 0.56, 0);
  parent.add(g);
  return g;
}

function makeBuilding(kit: Kit, id: BuildingId, level: number) {
  const g = new THREE.Group();
  g.userData.buildingId = id;
  const grow = 1 + (level - 1) * 0.07;

  if (id === "municipio") {
    box(kit, g, kit.mats.plaster, 1.55, 0.85, 1.15, 0, 0.43, 0);
    roofPrism(kit, g, 1.7, 0.55, 1.28, 1.12, kit.mats.roof);
    box(kit, g, kit.mats.plasterLite, 0.38, 1.15, 0.38, 0.62, 0.95, -0.28);
    cone(kit, g, kit.mats.roofDark, 0.28, 0.42, 0.62, 1.72, -0.28, 4);
    box(kit, g, kit.mats.banner, 0.04, 0.18, 0.22, 0.62, 1.95, -0.28);
    box(kit, g, kit.mats.woodDark, 0.22, 0.38, 0.06, 0, 0.22, 0.58);
    windows(kit, g, [-0.48, -0.18, 0.18, 0.48], 0.55, 0.58);
  } else if (id === "trivella") {
    box(kit, g, kit.mats.wood, 1.35, 0.12, 1.05, 0, 0.12, 0);
    box(kit, g, kit.mats.plasterDark, 0.7, 0.45, 0.55, -0.22, 0.35, 0.05);
    roofPrism(kit, g, 0.82, 0.28, 0.62, 0.72, kit.mats.roof);
    cyl(kit, g, kit.mats.metal, 0.05, 0.06, 1.35, 0.32, 0.85, -0.1, 6);
    box(kit, g, kit.mats.metal, 0.9, 0.06, 0.06, 0.32, 1.42, -0.1);
    box(kit, g, kit.mats.rust, 0.06, 0.7, 0.06, 0.7, 1.05, -0.1, 0.4);
    cyl(kit, g, kit.mats.ink, 0.14, 0.16, 0.28, 0.55, 0.22, 0.28, 8);
    cyl(kit, g, kit.mats.ink, 0.14, 0.16, 0.28, 0.28, 0.22, 0.42, 8);
  } else if (id === "tesoreria") {
    box(kit, g, kit.mats.plasterLite, 1.15, 0.72, 0.95, 0, 0.36, 0);
    roofPrism(kit, g, 1.32, 0.48, 1.08, 0.96, kit.mats.roof);
    box(kit, g, kit.mats.gold, 0.28, 0.32, 0.06, 0, 0.22, 0.48);
    windows(kit, g, [-0.32, 0.32], 0.48, 0.48, 0.14, 0.18);
    cyl(kit, g, kit.mats.stoneDark, 0.07, 0.08, 0.38, 0.42, 1.05, -0.12, 6);
  } else if (id === "caserma") {
    box(kit, g, kit.mats.plaster, 1.55, 0.62, 0.95, 0, 0.31, 0);
    roofPrism(kit, g, 1.7, 0.38, 1.08, 0.82, kit.mats.roof);
    windows(kit, g, [-0.5, -0.18, 0.18, 0.5], 0.4, 0.5, 0.12, 0.14);
    box(kit, g, kit.mats.woodDark, 0.18, 0.28, 0.05, -0.18, 0.18, 0.5);
    box(kit, g, kit.mats.banner, 0.04, 0.22, 0.16, -0.62, 0.82, 0.2);
    box(kit, g, kit.mats.gold, 0.04, 0.22, 0.16, 0.62, 0.82, 0.2);
  } else if (id === "torre") {
    cyl(kit, g, kit.mats.stone, 0.38, 0.42, 1.35, 0, 0.68, 0, 8);
    cyl(kit, g, kit.mats.stoneDark, 0.46, 0.46, 0.18, 0, 1.38, 0, 8);
    cone(kit, g, kit.mats.roof, 0.42, 0.55, 0, 1.74, 0, 8);
    box(kit, g, kit.mats.banner, 0.05, 0.28, 0.2, 0.42, 0.85, 0);
    box(kit, g, kit.mats.ink, 0.12, 0.16, 0.06, 0, 0.7, 0.4);
    box(kit, g, kit.mats.metal, 0.08, 0.08, 0.55, 0.48, 0.55, 0.18, 0.4);
  } else {
    box(kit, g, kit.mats.plasterDark, 1.25, 0.55, 0.95, 0, 0.28, 0);
    roofPrism(kit, g, 1.38, 0.32, 1.08, 0.72, kit.mats.roofDark);
    cyl(kit, g, kit.mats.ink, 0.22, 0.22, 0.42, 0.48, 0.28, 0.42, 10);
    cyl(kit, g, kit.mats.ink, 0.18, 0.18, 0.34, 0.22, 0.24, 0.52, 10);
    box(kit, g, kit.mats.wood, 0.22, 0.28, 0.05, -0.28, 0.18, 0.5);
  }

  g.scale.setScalar(grow);
  const loc = BUILDING_LAYOUT[id];
  g.position.set(loc.x * SPREAD, 0, loc.z * SPREAD);
  return g;
}

function makeVespa(kit: Kit) {
  const g = new THREE.Group();
  cyl(kit, g, kit.mats.ink, 0.07, 0.07, 0.04, -0.12, 0.07, 0, 8).rotation.z = Math.PI / 2;
  cyl(kit, g, kit.mats.ink, 0.07, 0.07, 0.04, 0.14, 0.07, 0, 8).rotation.z = Math.PI / 2;
  box(kit, g, kit.mats.gold, 0.32, 0.08, 0.12, 0.02, 0.16, 0);
  box(kit, g, kit.mats.pine, 0.1, 0.16, 0.1, 0.02, 0.26, 0);
  box(kit, g, kit.mats.ink, 0.08, 0.08, 0.08, 0.02, 0.38, 0);
  return g;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
}

function worldOf(id: BuildingId) {
  const loc = BUILDING_LAYOUT[id];
  return new THREE.Vector3(loc.x * SPREAD, 0, loc.z * SPREAD);
}

export function Village3D({ state, selected, onSelect, reducedMotion, onContextLost }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelect);
  const lostRef = useRef(onContextLost);
  stateRef.current = state;
  selectedRef.current = selected;
  onSelectRef.current = onSelect;
  lostRef.current = onContextLost;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const kit = makeKit();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd7eef6);
    scene.fog = new THREE.Fog(0xd7eef6, 16, 32);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    const pivot = new THREE.Vector3(0, 0.35, 0.15);
    let yaw = Math.PI * 0.28;
    let pitch = 0.66;
    let dist = 10.2;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: window.innerWidth >= 720,
        alpha: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      });
    } catch {
      lostRef.current();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "h-full w-full touch-none";
    renderer.domElement.style.touchAction = "none";
    wrap.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xeaf6fb, 0x6d8a52, 1.15);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.55);
    sun.position.set(6.5, 10, 4.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(window.innerWidth < 720 ? 512 : 1024, window.innerWidth < 720 ? 512 : 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 24;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xf7f6ee, 0.22));

    const ground = addMesh(kit, scene, new THREE.CircleGeometry(6.1, 48), kit.mats.grassDark, 0, 0, 0, -Math.PI / 2);
    ground.receiveShadow = true;
    const lawn = addMesh(kit, scene, new THREE.CircleGeometry(5.4, 48), kit.mats.grass, 0, 0.01, 0, -Math.PI / 2);
    lawn.receiveShadow = true;
    const plaza = addMesh(kit, scene, new THREE.CircleGeometry(1.35, 28), kit.mats.sand, 0, 0.02, 0.1, -Math.PI / 2);
    plaza.receiveShadow = true;

    const hillA = addMesh(kit, scene, new THREE.SphereGeometry(1.8, 12, 8), kit.mats.grass, -3.6, -0.85, -2.4);
    hillA.scale.set(1.6, 0.45, 1.1);
    const hillB = addMesh(kit, scene, new THREE.SphereGeometry(1.6, 12, 8), kit.mats.pineLite, 3.8, -0.7, -2.1);
    hillB.scale.set(1.5, 0.4, 1);

    const roadPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i += 1) {
      const t = i / 20;
      roadPts.push(new THREE.Vector3(-4.6 + t * 9.2, 0.04, 2.55 + Math.sin(t * Math.PI) * 0.85));
    }
    const roadCurve = new THREE.CatmullRomCurve3(roadPts);
    const road = addMesh(kit, scene, new THREE.TubeGeometry(roadCurve, 40, 0.42, 6, false), kit.mats.road, 0, 0, 0);
    road.scale.y = 0.16;
    road.castShadow = false;

    const sunDisc = addMesh(kit, scene, new THREE.SphereGeometry(0.38, 12, 8), kit.mats.sky, 4.6, 4.8, -3.4);
    sunDisc.castShadow = false;

    makeFountain(kit, scene);
    makeCypress(kit, scene, -4.4, -0.4, 1.15);
    makeCypress(kit, scene, 4.5, -0.8, 1.35);
    makeCypress(kit, scene, 3.9, 2.6, 0.95);
    makeCypress(kit, scene, -3.8, 2.4, 0.9);
    makeCypress(kit, scene, -2.2, -3.1, 0.8);
    makeCypress(kit, scene, 2.4, -3.2, 1.05);
    makeLamp(kit, scene, -1.7, 2.35);
    makeLamp(kit, scene, 1.85, 2.45);

    const buildingGroups = new Map<BuildingId, THREE.Group>();
    for (const id of BUILDING_ORDER) {
      const level = stateRef.current.buildings.find((b) => b.id === id)?.level ?? 1;
      const g = makeBuilding(kit, id, level);
      scene.add(g);
      buildingGroups.set(id, g);
    }

    const ringGeo = new THREE.TorusGeometry(0.72, 0.045, 8, 28);
    kit.geos.push(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf7f1dc });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    scene.add(ring);

    const upgradeMat = new THREE.MeshBasicMaterial({ color: 0xe3b75a });
    const upgradeRing = new THREE.Mesh(ringGeo, upgradeMat);
    upgradeRing.rotation.x = Math.PI / 2;
    upgradeRing.visible = false;
    scene.add(upgradeRing);

    const vespa = makeVespa(kit);
    scene.add(vespa);

    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const clouds: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i += 1) {
      const c = addMesh(kit, scene, new THREE.SphereGeometry(0.42 + i * 0.08, 8, 6), cloudMat, -2 + i * 2.2, 4.1, -3.2);
      c.scale.set(1.6, 0.45, 1);
      c.castShadow = false;
      clouds.push(c);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let lastInteract = performance.now();

    const setCam = () => {
      camera.position.set(
        pivot.x + Math.sin(yaw) * Math.cos(pitch) * dist,
        pivot.y + Math.sin(pitch) * dist,
        pivot.z + Math.cos(yaw) * Math.cos(pitch) * dist,
      );
      camera.lookAt(pivot);
    };
    setCam();

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 4 || h < 4) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const pick = (clientX: number, clientY: number) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          const id = obj.userData.buildingId as BuildingId | undefined;
          if (id) {
            onSelectRef.current(id);
            return;
          }
          obj = obj.parent;
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      moved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      lastInteract = performance.now();
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      lastX = e.clientX;
      lastY = e.clientY;
      lastInteract = performance.now();
      yaw -= dx * 0.006;
      pitch = THREE.MathUtils.clamp(pitch + dy * 0.003, 0.38, 1.15);
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      if (!moved) pick(e.clientX, e.clientY);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      lastInteract = performance.now();
      dist = THREE.MathUtils.clamp(dist + e.deltaY * 0.01, 7.5, 16);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const onLost = (e: Event) => {
      e.preventDefault();
      lostRef.current();
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost, false);

    let last = performance.now();
    let t = 0;
    let running = true;

    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reducedMotion) t += dt;

      const current = stateRef.current;
      const selectedId = selectedRef.current;
      const selPos = worldOf(selectedId);
      ring.position.x = selPos.x;
      ring.position.z = selPos.z;
      ring.scale.setScalar(1 + Math.sin(t * 3) * 0.04);

      for (const id of BUILDING_ORDER) {
        const g = buildingGroups.get(id);
        if (!g) continue;
        const level = current.buildings.find((b) => b.id === id)?.level ?? 1;
        g.scale.setScalar((1 + (level - 1) * 0.08) * 1.12);
      }

      const busy = current.buildings.find((b) => b.upgradeEndsAt);
      if (busy) {
        const p = worldOf(busy.id);
        upgradeRing.visible = true;
        upgradeRing.position.set(p.x, 0.08, p.z);
        upgradeRing.rotation.z = t * 2.2;
      } else {
        upgradeRing.visible = false;
      }

      const u = (t * 0.08) % 1;
      const pos = roadCurve.getPointAt(u);
      const look = roadCurve.getPointAt((u + 0.02) % 1);
      vespa.position.copy(pos);
      vespa.position.y = 0.08;
      vespa.lookAt(look.x, 0.08, look.z);

      clouds.forEach((c, i) => {
        c.position.x = -3.5 + ((t * 0.15 + i * 2.4) % 9);
      });

      if (!reducedMotion && now - lastInteract > 2200) {
        yaw += dt * 0.018;
      }
      setCam();
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(loop);

    const onVis = () => {
      if (document.hidden) {
        renderer.setAnimationLoop(null);
      } else {
        last = performance.now();
        renderer.setAnimationLoop(loop);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      renderer.setAnimationLoop(null);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      disposeObject(scene);
      ringMat.dispose();
      upgradeMat.dispose();
      cloudMat.dispose();
      kit.geos.forEach((g) => g.dispose());
      Object.values(kit.mats).forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, [reducedMotion]);

  return <div ref={wrapRef} className="absolute inset-0 overflow-hidden" aria-label="Villaggio in 3D" />;
}
