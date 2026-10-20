import * as THREE from 'three';
import { ganeshaLevels } from '../data/divineJourneys';

// The same continuous world is retained while the camera travels between stops.
const stops = [
  [-39, 0, 17], [-13, 1, 7], [13, 0, 17], [39, 1, 7],
  [39, 0, -27], [13, 2, -37], [-13, 0, -27], [-39, 1, -37],
];

export function createSacredWorld(host, { onReady, onFailure, onSelect, onTravel }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor('#a8c9bf');
  host.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D sacred islands. Drag to look around; use the level buttons to travel.');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a8c9bf');
  scene.fog = new THREE.Fog('#a8c9bf', 72, 230);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 500);
  scene.add(new THREE.HemisphereLight('#fff3d1', '#31584b', 2.7));
  const sun = new THREE.DirectionalLight('#ffe2a3', 3.2);
  sun.position.set(-30, 65, 40);
  scene.add(sun);

  let disposed = false;
  let active = 0;
  let overview = false;
  let still = false;
  let visible = !document.hidden;
  let dirty = true;
  let loaded = false;
  let orbit = 0;
  let elevation = 0;
  let zoom = 0;
  let width = 1;
  let height = 1;
  let lastFrame = 0;
  let journey = null;
  let sceneTime = 0;
  const geometryCache = new Map();
  const materials = new Set();
  const textures = new Map();
  const imageStates = new Map();
  const flameMeshes = [];
  const waterRings = [];
  const cloudGroups = [];
  const targets = [];
  const look = new THREE.Vector3();
  const cameraEnd = new THREE.Vector3();
  const lookEnd = new THREE.Vector3();
  const positions = stops.map(point => new THREE.Vector3(...point));
  const projected = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function material(color, extra = {}) {
    const value = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
    materials.add(value);
    return value;
  }
  const stone = material('#d9b67b');
  const darkStone = material('#95764b');
  const gold = material('#d9a644', { metalness: 0.5, roughness: 0.4 });
  const trunk = material('#74533b');
  const leaf = material('#276651');
  const leafLight = material('#4c8a57');
  const snow = material('#f3efdc');
  const mountain = material('#66887d');
  const pink = material('#e5a5a1');
  const roof = material('#944a2e');
  const flame = new THREE.MeshBasicMaterial({ color: '#ffe59a' });
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: '#e2ebe1', transparent: true, opacity: 0.35, depthWrite: false });
  materials.add(flame); materials.add(cloudMaterial);

  function geometry(kind, args) {
    const key = `${kind}:${args.join(',')}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE[kind](...args));
    return geometryCache.get(key);
  }
  function mesh(parent, kind, args, surface, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry(kind, args), surface);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  function lamp(parent, x, z, size = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0.5, z); group.scale.setScalar(size); parent.add(group);
    mesh(group, 'CylinderGeometry', [0.38, 0.55, 0.16, 12], gold);
    mesh(group, 'CylinderGeometry', [0.1, 0.17, 1.1, 10], gold, 0, 0.55);
    mesh(group, 'SphereGeometry', [0.4, 10, 6], gold, 0, 1.17).scale.y = 0.3;
    const light = mesh(group, 'SphereGeometry', [0.12, 8, 6], flame, 0, 1.46);
    light.scale.y = 2.4;
    flameMeshes.push(light);
  }
  function tree(parent, x, z, scale, index) {
    const group = new THREE.Group(); group.position.set(x, 0.5, z); group.scale.setScalar(scale); parent.add(group);
    mesh(group, 'CylinderGeometry', [0.15, 0.26, 2.1, 6], trunk, 0, 1);
    if (index < 4) {
      mesh(group, 'ConeGeometry', [1.3, 2.8, 7], leaf, 0, 2.8);
      mesh(group, 'ConeGeometry', [0.9, 2.2, 7], leafLight, 0, 3.8);
    } else {
      mesh(group, 'IcosahedronGeometry', [1.4, 1], leaf, 0, 3);
      mesh(group, 'IcosahedronGeometry', [1.0, 1], leafLight, 0.7, 3.3);
    }
  }

  const islands = positions.map((point, index) => {
    const island = new THREE.Group();
    island.position.copy(point); island.userData.level = index; scene.add(island);
    const grass = material(['#65855a', '#577554', '#6b8d62', '#6f8f5c', '#68834e', '#3a6c58', '#668853', '#788f55'][index]);
    const ground = mesh(island, 'CylinderGeometry', [9.8, 8.8, 1.3, 14], grass, 0, -0.1);
    targets.push(ground);
    mesh(island, 'CylinderGeometry', [8.8, 5.5, 2.5, 14], darkStone, 0, -1.8);
    mesh(island, 'ConeGeometry', [5.5, 3.2, 10], darkStone, 0, -4.5).rotation.z = Math.PI;
    for (let step = 0; step < 4; step++) {
      mesh(island, 'BoxGeometry', [10.7 - step * 0.5, 0.22, 4.7 - step * 0.65], stone, 0, 0.55 + step * 0.22, 1.6 - step * 0.3);
    }
    // The retained illustrations are large sacred tableaux inside real 3D shrines.
    const artMaterial = new THREE.MeshBasicMaterial({ color: '#f4e8c9' });
    materials.add(artMaterial);
    mesh(island, 'BoxGeometry', [12.4, 8.3, 0.45], darkStone, 0, 5.1, -1.6);
    mesh(island, 'BoxGeometry', [11.9, 7.9, 0.12], gold, 0, 5.1, -1.33);
    const art = mesh(island, 'PlaneGeometry', [11.5, 7.66], artMaterial, 0, 5.1, -1.24);
    targets.push(art);
    for (const x of [-6.4, 6.4]) {
      mesh(island, 'CylinderGeometry', [0.34, 0.42, 8.2, 10], stone, x, 4.8, -0.6);
      for (const y of [1, 1.45, 8.1, 8.6]) mesh(island, 'CylinderGeometry', [0.54, 0.54, 0.22, 10], gold, x, y, -0.6);
      lamp(island, x, 2.7, 1.15);
    }
    mesh(island, 'BoxGeometry', [14.2, 0.45, 3.6], stone, 0, 9.1, -1.3);
    const canopy = mesh(island, 'ConeGeometry', [9.9, 2.2, 4], roof, 0, 10.4, -1.3);
    canopy.rotation.y = Math.PI / 4; canopy.scale.z = 0.34;
    mesh(island, 'SphereGeometry', [0.27, 10, 8], gold, 0, 11.7, -1.3);
    mesh(island, 'ConeGeometry', [0.12, 0.7, 8], gold, 0, 12.1, -1.3);
    for (let t = 0; t < 5; t++) {
      const angle = 0.1 + t * Math.PI / 4;
      tree(island, Math.cos(angle) * 8.2, -3.2 - Math.sin(angle) * 3.8, 0.7 + (t % 3) * 0.15, index);
    }
    if (index < 3) {
      for (let m = 0; m < 3; m++) {
        mesh(island, 'ConeGeometry', [2.4, 5.5 + m, 5], mountain, -5 + m * 4.5, 2.9, -6.4);
        mesh(island, 'ConeGeometry', [0.96, 2.2 + m * 0.4, 5], snow, -5 + m * 4.5, 5 + m * 0.28, -6.4);
      }
    }
    for (let l = 0; l < 6; l++) lamp(island, -6.5 + l * 2.6, 5.9, 0.5);
    // Lotus pool and little geometric lotus blossoms.
    const pond = mesh(island, 'CircleGeometry', [2.2, 32], material('#4caaa1', { metalness: 0.4, roughness: 0.3 }), 4.8, 0.58, 3.8);
    pond.rotation.x = -Math.PI / 2; pond.scale.y = 0.65;
    for (let l = 0; l < 3; l++) {
      const blossom = new THREE.Group(); blossom.position.set(3.6 + l * 1.1, 0.65, 3.8); island.add(blossom);
      for (let p = 0; p < 5; p++) {
        const angle = p / 5 * Math.PI * 2;
        const petal = mesh(blossom, 'SphereGeometry', [0.22, 6, 4], pink, Math.sin(angle) * 0.2, 0, Math.cos(angle) * 0.2);
        petal.scale.set(0.55, 0.65, 1.5); petal.rotation.y = angle;
      }
    }
    if (index === 5) {
      for (let s = 0; s < 5; s++) mesh(island, 'BoxGeometry', [1.4, 0.12, 0.7], stone, -5.3, 0.7 + s * 0.14, 4.3);
    }
    if (index === 7) {
      for (let l = 0; l < 12; l++) lamp(island, Math.cos(l / 12 * Math.PI * 2) * 8.5, Math.sin(l / 12 * Math.PI * 2) * 8.5, 0.55);
    }
    const ringMaterial = new THREE.MeshBasicMaterial({ color: '#e2c888', transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
    materials.add(ringMaterial);
    const ring = mesh(scene, 'RingGeometry', [10, 10.09, 64], ringMaterial, point.x, -6.7, point.z);
    ring.rotation.x = -Math.PI / 2; waterRings.push(ring);
    return { group: island, artMaterial, art, point };
  });

  const routePoints = positions.map(point => point.clone().add(new THREE.Vector3(0, 1, 6.4)));
  const curve = new THREE.CatmullRomCurve3(routePoints, false, 'catmullrom', 0.3);
  const routeGeometry = new THREE.TubeGeometry(curve, 220, 0.1, 6, false);
  geometryCache.set('route', routeGeometry);
  scene.add(new THREE.Mesh(routeGeometry, gold));
  // A small floating diya is the traveller, following the continuous route.
  const traveller = new THREE.Group(); scene.add(traveller);
  mesh(traveller, 'SphereGeometry', [0.55, 12, 8], gold).scale.set(1, 0.35, 1);
  const travellerFlame = mesh(traveller, 'SphereGeometry', [0.16, 10, 8], flame, 0, 0.43);
  travellerFlame.scale.y = 2.3;
  const travellerHalo = mesh(traveller, 'TorusGeometry', [0.8, 0.045, 6, 32], gold, 0, 0.05);
  travellerHalo.rotation.x = Math.PI / 2;
  let travellerT = 0;
  traveller.position.copy(curve.getPoint(0));

  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv; uniform float time; void main(){float w=sin(vUv.x*370.0+time*.35)*sin(vUv.y*310.0-time*.25);float line=smoothstep(.93,1.0,w);vec3 color=mix(vec3(.20,.43,.39),vec3(.44,.65,.57),vUv.y);gl_FragColor=vec4(color+line*.09,1.0);}',
  });
  materials.add(waterMaterial);
  const water = mesh(scene, 'PlaneGeometry', [600, 600], waterMaterial, 0, -6.9, 0);
  water.rotation.x = -Math.PI / 2;
  // Slow cloud banks give the camera journey a sense of distance.
  for (let c = 0; c < 12; c++) {
    const group = new THREE.Group(); group.position.set((c % 4 - 1.5) * 39, -3 + c % 3, Math.floor(c / 4) * 48 - 65);
    for (let part = 0; part < 3; part++) mesh(group, 'SphereGeometry', [3.2, 8, 6], cloudMaterial, part * 3, 0, 0).scale.set(2.8, 0.4, 1.4);
    scene.add(group); cloudGroups.push(group);
  }
  const particlesGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(180 * 3);
  for (let p = 0; p < 180; p++) {
    particlePositions[p * 3] = Math.sin(p * 12.9898) * 70;
    particlePositions[p * 3 + 1] = 2 + (p % 19) * 0.8;
    particlePositions[p * 3 + 2] = Math.cos(p * 7.233) * 65;
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  geometryCache.set('particles', particlesGeometry);
  const particlesMaterial = new THREE.PointsMaterial({ color: '#ffeab0', size: 0.13, transparent: true, opacity: 0.8 });
  materials.add(particlesMaterial);
  const particles = new THREE.Points(particlesGeometry, particlesMaterial); scene.add(particles);

  const loader = new THREE.TextureLoader();
  function loadArt(index) {
    const url = ganeshaLevels[index].image;
    if (imageStates.has(url)) return;
    imageStates.set(url, 'loading');
    loader.load(url, texture => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
      textures.set(url, texture); imageStates.set(url, 'loaded');
      islands.forEach((island, i) => {
        if (ganeshaLevels[i].image === url) { island.artMaterial.map = texture; island.artMaterial.color.set('#ffffff'); island.artMaterial.needsUpdate = true; }
      });
      dirty = true;
      if (ganeshaLevels[active].image === url) onReady(true);
    }, undefined, () => {
      if (disposed) return;
      imageStates.set(url, 'failed');
      if (ganeshaLevels[active].image === url) onReady(false);
    });
  }
  function destinations() {
    const mobile = width < 700;
    if (overview) {
      lookEnd.set(0, 0, -10);
      const distance = mobile ? 175 : 100;
      cameraEnd.set(5, distance * 0.82, distance * 0.7);
    } else {
      const point = positions[active];
      const distance = (mobile ? 35 : 25) + zoom;
      // Slightly offset the stage to keep the shrine clear of the story HUD.
      lookEnd.copy(point).add(new THREE.Vector3(mobile ? 0 : -2.8, 3.9, 0));
      cameraEnd.copy(point).add(new THREE.Vector3(Math.sin(orbit + 0.12) * distance, 12 + elevation, Math.cos(orbit + 0.12) * distance));
    }
  }
  function setDestination(index, showMap, pauseMotion) {
    const changed = active !== index || overview !== showMap;
    active = index; overview = showMap; still = pauseMotion;
    if (changed || !loaded) {
      orbit = 0; elevation = 0; zoom = 0;
      destinations();
      journey = { start: performance.now(), from: camera.position.clone(), lookFrom: look.clone(), travellerFrom: travellerT, travellerTo: active / (positions.length - 1), duration: !loaded ? 1400 : 1150 };
      if (!loaded) {
        journey.from.copy(cameraEnd).add(new THREE.Vector3(0, 10, 15));
        journey.lookFrom.copy(lookEnd);
        camera.position.copy(journey.from); look.copy(lookEnd);
      }
      onTravel(!still);
    }
    islands.forEach((island, i) => { island.group.visible = overview || Math.abs(i - active) <= 1; });
    if (overview) islands.forEach((_, i) => loadArt(i));
    else [active, active - 1, active + 1].filter(i => i >= 0 && i < islands.length).forEach(loadArt);
    onReady(imageStates.get(ganeshaLevels[active].image) === 'loaded');
    loaded = true; dirty = true;
  }
  function resize() {
    width = host.clientWidth; height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    destinations(); dirty = true;
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const markerElements = Array.from(host.querySelectorAll('[data-world-pin]'));
  function updatePins() {
    markerElements.forEach((element, index) => {
      if (!overview) { element.hidden = true; return; }
      projected.copy(positions[index]).add(new THREE.Vector3(0, 13, 0)).project(camera);
      element.hidden = projected.z > 1 || Math.abs(projected.x) > 1.1 || Math.abs(projected.y) > 1.1;
      element.style.transform = `translate(${(projected.x * 0.5 + 0.5) * width}px, ${(-projected.y * 0.5 + 0.5) * height}px) translate(-50%, -100%)`;
    });
  }
  function frame(now) {
    if (!visible || disposed || (!dirty && still && !journey)) return;
    if (now - lastFrame < 30) return;
    const dt = Math.min((now - lastFrame) / 1000, 0.05); lastFrame = now;
    if (!still) sceneTime += dt;
    if (journey) {
      const fraction = still ? 1 : Math.min((now - journey.start) / journey.duration, 1);
      const eased = fraction < 0.5 ? 4 * fraction ** 3 : 1 - (-2 * fraction + 2) ** 3 / 2;
      camera.position.lerpVectors(journey.from, cameraEnd, eased);
      look.lerpVectors(journey.lookFrom, lookEnd, eased);
      travellerT = THREE.MathUtils.lerp(journey.travellerFrom, journey.travellerTo, eased);
      if (fraction === 1) { journey = null; onTravel(false); }
    } else {
      camera.position.lerp(cameraEnd, still ? 1 : 0.16);
      look.lerp(lookEnd, still ? 1 : 0.16);
    }
    camera.lookAt(look);
    traveller.position.copy(curve.getPoint(travellerT));
    traveller.position.y += 0.5 + (still ? 0 : Math.sin(sceneTime * 2.2) * 0.16);
    travellerFlame.scale.y = 2.3 + (still ? 0 : Math.sin(sceneTime * 8) * 0.25);
    travellerHalo.rotation.z = sceneTime * 0.4;
    waterMaterial.uniforms.time.value = sceneTime;
    particles.position.y = still ? 0 : Math.sin(sceneTime * 0.16) * 0.7;
    flameMeshes.forEach((item, i) => { item.scale.y = 2.2 + (still ? 0 : Math.sin(sceneTime * 6 + i) * 0.3); });
    waterRings.forEach((item, i) => { item.scale.setScalar(1 + (still ? 0 : (Math.sin(sceneTime * 0.7 + i) + 1) * 0.1)); });
    cloudGroups.forEach((item, i) => { item.position.x = (i % 4 - 1.5) * 39 + (still ? 0 : Math.sin(sceneTime * 0.06 + i) * 3); });
    updatePins();
    renderer.render(scene, camera);
    host.dataset.cameraPosition = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;
    host.dataset.moving = journey ? 'true' : 'false';
    host.dataset.motion = still ? 'paused' : 'playing';
    dirty = !still && camera.position.distanceTo(cameraEnd) > 0.01;
  }
  renderer.setAnimationLoop(frame);
  let down = null;
  function pointerDown(event) {
    if (event.button !== 0) return;
    down = { x: event.clientX, y: event.clientY, orbit, elevation, dragged: false };
    renderer.domElement.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    if (!down || overview) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) down.dragged = true;
    if (!down.dragged) return;
    journey = null; onTravel(false);
    orbit = THREE.MathUtils.clamp(down.orbit - dx * 0.003, -0.65, 0.65);
    elevation = THREE.MathUtils.clamp(down.elevation + dy * 0.035, -3, 8);
    destinations(); dirty = true;
  }
  function pointerUp(event) {
    if (!down) return;
    if (!down.dragged) {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(targets).find(item => item.object.parent.visible);
      if (hit) onSelect(hit.object.parent.userData.level);
    }
    down = null;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
  }
  function pointerCancel() { down = null; }
  function wheel(event) {
    if (overview) return;
    event.preventDefault(); zoom = THREE.MathUtils.clamp(zoom + event.deltaY * 0.008, -3, 9);
    destinations(); dirty = true;
  }
  function visibility() { visible = !document.hidden; dirty = true; lastFrame = performance.now(); }
  function contextLost(event) { event.preventDefault(); renderer.setAnimationLoop(null); onFailure(); }
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', visibility);
  resize();

  return {
    setDestination,
    dispose() {
      disposed = true; renderer.setAnimationLoop(null); resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('webglcontextlost', contextLost);
      geometryCache.forEach(value => value.dispose());
      materials.forEach(value => value.dispose());
      textures.forEach(value => value.dispose());
      renderer.dispose(); canvas.remove();
    },
  };
}
