import * as THREE from 'three';
import { ganeshaLevels } from '../data/divineJourneys';
import { createTableauBuilder } from './sacredTableaux';

// The same continuous world is retained while the camera travels between stops.
const stops = [
  [-39, 0, 17], [-13, 1, 7], [13, 0, 17], [39, 1, 7],
  [39, 0, -27], [13, 2, -37], [-13, 0, -27], [-39, 1, -37],
];

export function createSacredWorld(host, { onReady, onFailure, onSelect, onTravel }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor('#b4dcf0');
  host.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D sacred islands. Drag to look around; use the level buttons to travel.');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b4dcf0');
  scene.fog = new THREE.Fog('#b4dcf0', 100, 260);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 500);
  scene.add(new THREE.HemisphereLight('#fff3e3', '#31516a', 1.9));
  const sun = new THREE.DirectionalLight('#ffe2b8', 2.5);
  sun.position.set(-30, 65, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 90 });
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -0.0002;
  scene.add(sun, sun.target);

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
  const textures = new Set();
  const flameMeshes = [];
  const waterRings = [];
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
  // Deterministic mineral grain adds surface detail to the real 3D terrain.
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 128; grainCanvas.height = 128;
  const grainContext = grainCanvas.getContext('2d');
  const grainPixels = grainContext.createImageData(128, 128);
  for (let i = 0; i < grainPixels.data.length; i += 4) {
    const noise = Math.sin(i * 0.127 + 0.7) * 43758.5453;
    const value = 95 + (noise - Math.floor(noise)) * 85;
    grainPixels.data[i] = value; grainPixels.data[i + 1] = value; grainPixels.data[i + 2] = value; grainPixels.data[i + 3] = 255;
  }
  grainContext.putImageData(grainPixels, 0, 0);
  const grain = new THREE.CanvasTexture(grainCanvas);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(7, 7); textures.add(grain);
  const stone = material('#a4977f', { bumpMap: grain, bumpScale: 0.14 });
  const darkStone = material('#716c5d', { bumpMap: grain, bumpScale: 0.22 });
  const gold = material('#d9a644', { metalness: 0.5, roughness: 0.4 });
  const trunk = material('#74533b');
  const leaf = material('#276651');
  const leafLight = material('#4c8a57');
  const snow = material('#f3efdc');
  const mountain = material('#718380', { bumpMap: grain, bumpScale: 0.22 });
  const pink = material('#e5a5a1');
  const flame = new THREE.MeshBasicMaterial({ color: '#ffe59a' });
  materials.add(flame);

  function geometry(kind, args) {
    const key = `${kind}:${args.join(',')}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE[kind](...args));
    return geometryCache.get(key);
  }
  function mesh(parent, kind, args, surface, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry(kind, args), surface);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
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
      for (let tier = 0; tier < 5; tier++) {
        const crown = mesh(group, 'ConeGeometry', [1.35 - tier * 0.2, 1.4, 18], tier % 2 ? leafLight : leaf, 0, 1.9 + tier * 0.5);
        crown.rotation.y = tier * 0.6;
      }
    } else {
      for (let branch = 0; branch < 5; branch++) {
        const angle = branch * 2.4;
        const crown = mesh(group, 'SphereGeometry', [0.85, 16, 12], branch % 2 ? leafLight : leaf, Math.sin(angle) * 0.7, 2.8 + branch * 0.16, Math.cos(angle) * 0.6);
        crown.scale.set(1.2, 0.85, 1);
      }
    }
  }

  function artworkChanged(index) {
    dirty = true;
    if (index === active) {
      onReady(islands[index].diorama.state.ready);
      if (islands[index].diorama.state.failed) onFailure();
    }
  }
  const buildTableau = createTableauBuilder({
    mesh, material, geometryCache, materials, textures,
    onChange: artworkChanged, isDisposed: () => disposed,
    anisotropy: Math.min(4, renderer.capabilities.getMaxAnisotropy()),
  });
  const islands = positions.map((point, index) => {
    const island = new THREE.Group();
    island.position.copy(point); island.userData.level = index; scene.add(island);
    const grass = material(['#697760', '#5e7059', '#718066', '#768366', '#6b7958', '#506f5d', '#6b7e60', '#807e64'][index], { bumpMap: grain, bumpScale: 0.11 });
    const ground = mesh(island, 'CylinderGeometry', [9.8, 8.8, 1.3, 64], grass, 0, -0.1);
    targets.push(ground);
    mesh(island, 'CylinderGeometry', [8.8, 5.5, 2.5, 48], darkStone, 0, -1.8);
    mesh(island, 'ConeGeometry', [5.5, 3.2, 48], darkStone, 0, -4.5).rotation.z = Math.PI;
    const diorama = buildTableau(island, index);
    for (let r = 0; r < 9; r++) {
      const angle = r / 9 * Math.PI * 2;
      const rock = mesh(island, 'DodecahedronGeometry', [1, 1], r % 2 ? stone : darkStone, Math.cos(angle) * 8.7, -0.7, Math.sin(angle) * 8.7);
      rock.scale.set(1.4, 1.1, 1.25);
      rock.rotation.y = angle;
    }
    for (let t = 0; t < 5; t++) {
      const angle = 0.1 + t * Math.PI / 4;
      tree(island, Math.cos(angle) * 8.2, -3.2 - Math.sin(angle) * 3.8, 0.7 + (t % 3) * 0.15, index);
    }
    if (index < 3) {
      for (let m = 0; m < 3; m++) {
        const peak = mesh(island, 'ConeGeometry', [2.7, 6.2 + m, 15], mountain, -5 + m * 4.5, 2.9, -6.4);
        peak.scale.z = 0.65; peak.rotation.y = m * 0.7;
        const cap = mesh(island, 'ConeGeometry', [0.9, 2.05 + m * 0.3, 15], snow, -5 + m * 4.5, 5.05 + m * 0.35, -6.4);
        cap.scale.z = 0.65; cap.rotation.y = m * 0.7;
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
    return { group: island, diorama, point };
  });

  const routePoints = positions.map(point => point.clone().add(new THREE.Vector3(0, 1, 6.4)));
  const curve = new THREE.CatmullRomCurve3(routePoints, false, 'catmullrom', 0.3);
  const routeGeometry = new THREE.TubeGeometry(curve, 220, 0.045, 6, false);
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
    uniforms: {
      time: { value: 0 },
      shores: { value: positions.map(point => new THREE.Vector2(point.x, point.z)) },
      hazeRange: { value: new THREE.Vector2(90, 235) },
    },
    vertexShader: `
      uniform float time;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vCrest;
      void main() {
        vec3 p = position;
        float a = p.x * .34 + p.y * .15 + time * 1.3;
        float b = p.x * -.18 + p.y * .48 - time * 1.65;
        float c = p.x * .76 + p.y * .56 + time * 2.05;
        p.z = .52 * sin(a) + .26 * sin(b) + .10 * sin(c);
        float dx = .52 * .34 * cos(a) - .26 * .18 * cos(b) + .10 * .76 * cos(c);
        float dy = .52 * .15 * cos(a) + .26 * .48 * cos(b) + .10 * .56 * cos(c);
        vNormal = normalize(mat3(modelMatrix) * vec3(-dx, -dy, 1.0));
        vCrest = p.z;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform float time;
      uniform vec2 shores[8];
      uniform vec2 hazeRange;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vCrest;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 view = normalize(cameraPosition - vWorld);
        vec3 light = normalize(vec3(-.45, .8, .3));
        float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
        float diffuse = max(dot(normal, light), 0.0);
        float specular = pow(max(dot(normal, normalize(light + view)), 0.0), 85.0);
        vec3 color = mix(vec3(.015, .16, .43), vec3(.02, .43, .72), diffuse * .7 + .22);
        color = mix(color, vec3(.28, .68, .86), fresnel * .65);
        float foam = smoothstep(.53, .82, vCrest) * .25;
        for (int i = 0; i < 8; i++) {
          float distanceToShore = length(vWorld.xz - shores[i]);
          float band = smoothstep(5.5, 7.0, distanceToShore) * (1.0 - smoothstep(9.0, 14.0, distanceToShore));
          float ripple = smoothstep(.72, 1.0, sin(distanceToShore * 3.2 - time * 1.8));
          foam += band * ripple * .35;
        }
        color = mix(color, vec3(.7, .91, 1.0), min(foam, .65));
        color += vec3(.65, .83, 1.0) * specular * .7;
        float haze = smoothstep(hazeRange.x, hazeRange.y, length(cameraPosition - vWorld));
        color = mix(color, vec3(.46, .70, .84), haze);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  materials.add(waterMaterial);
  const water = mesh(scene, 'PlaneGeometry', [500, 500, 256, 256], waterMaterial, 0, -6.9, 0);
  water.rotation.x = -Math.PI / 2;
  water.castShadow = false;
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

  function destinations() {
    const mobile = width < 700;
    if (overview) {
      lookEnd.set(0, 0, -10);
      const distance = mobile ? 280 : 100;
      cameraEnd.set(5, distance * 0.82, distance * 0.7);
    } else {
      const point = positions[active];
      const distance = (mobile ? 44 : 37) + zoom;
      // Leave room for the neighbouring islands beyond the active tableau.
      lookEnd.copy(point).add(new THREE.Vector3(mobile ? 0 : 5.1, mobile ? 1.2 : 2, 0));
      cameraEnd.copy(point).add(new THREE.Vector3(Math.sin(orbit + 0.2) * distance, (mobile ? 24 : 19) + elevation, Math.cos(orbit + 0.2) * distance));
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
    // Every stage stays in the same world during chapter focus, orbit and travel.
    // Frustum culling handles off-screen terrain; never hide neighbouring stages.
    islands.forEach(island => { island.group.visible = true; });
    sun.position.copy(positions[active]).add(new THREE.Vector3(-18, 35, 22));
    sun.target.position.copy(positions[active]);
    renderer.shadowMap.needsUpdate = true;
    scene.fog.near = overview ? 260 : 100;
    scene.fog.far = overview ? 580 : 260;
    waterMaterial.uniforms.hazeRange.value.set(overview ? 260 : 90, overview ? 600 : 235);
    onReady(islands[active].diorama.state.ready);
    if (islands[active].diorama.state.failed) onFailure();
    host.dataset.sceneKind = 'devotional-tableau';
    host.dataset.visibleIslands = String(islands.filter(island => island.group.visible).length);
    host.dataset.chapter = ganeshaLevels[active].id;
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
      projected.copy(positions[index]).add(new THREE.Vector3(0, 8.5, 0)).project(camera);
      element.hidden = projected.z > 1 || Math.abs(projected.x) > 1.1 || Math.abs(projected.y) > 1.1;
      const halfWidth = element.offsetWidth / 2 + 6;
      const x = THREE.MathUtils.clamp((projected.x * 0.5 + 0.5) * width, halfWidth, width - halfWidth);
      element.style.transform = `translate(${x}px, ${(-projected.y * 0.5 + 0.5) * height}px) translate(-50%, -100%)`;
    });
    const story = host.parentElement.querySelector('[data-world-story]');
    const leader = host.parentElement.querySelector('[data-world-leader]');
    if (!story || overview || width <= 700) return;
    projected.copy(positions[active]).add(new THREE.Vector3(7, 2.3, 1.5)).project(camera);
    const anchorX = (projected.x * 0.5 + 0.5) * width;
    const anchorY = (-projected.y * 0.5 + 0.5) * height;
    const storyWidth = story.offsetWidth, storyHeight = story.offsetHeight;
    const x = THREE.MathUtils.clamp(anchorX + 32, width * 0.55, Math.max(width * 0.55, width - storyWidth - 28));
    const y = THREE.MathUtils.clamp(anchorY - storyHeight * 0.55, 148, Math.max(148, height - storyHeight - 235));
    story.style.setProperty('--story-x', `${x}px`);
    story.style.setProperty('--story-y', `${y}px`);
    if (leader) leader.setAttribute('d', `M ${anchorX} ${anchorY} Q ${x - 22} ${anchorY} ${x} ${y + storyHeight * 0.55}`);
  }
  function frame(now) {
    if (!visible || disposed || (!dirty && still && !journey)) return;
    if (now - lastFrame < 30) return;
    const dt = Math.min((now - lastFrame) / 1000, 0.05); lastFrame = now;
    if (!still) sceneTime += dt;
    if (journey) {
      // A queued animation frame can predate a newly selected destination.
      // Keep both camera interpolation and curve sampling inside their domains.
      const fraction = still ? 1 : THREE.MathUtils.clamp((now - journey.start) / journey.duration, 0, 1);
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
    traveller.position.copy(curve.getPoint(THREE.MathUtils.clamp(travellerT, 0, 1)));
    traveller.position.y += 0.5 + (still ? 0 : Math.sin(sceneTime * 2.2) * 0.16);
    travellerFlame.scale.y = 2.3 + (still ? 0 : Math.sin(sceneTime * 8) * 0.25);
    travellerHalo.rotation.z = sceneTime * 0.4;
    waterMaterial.uniforms.time.value = sceneTime;
    islands.forEach(island => island.diorama.update(camera));
    particles.position.y = still ? 0 : Math.sin(sceneTime * 0.16) * 0.7;
    flameMeshes.forEach((item, i) => { item.scale.y = 2.2 + (still ? 0 : Math.sin(sceneTime * 6 + i) * 0.3); });
    waterRings.forEach((item, i) => { item.scale.setScalar(1 + (still ? 0 : (Math.sin(sceneTime * 0.7 + i) + 1) * 0.1)); });
    updatePins();
    renderer.render(scene, camera);
    host.dataset.cameraPosition = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;
    host.dataset.moving = journey ? 'true' : 'false';
    host.dataset.motion = still ? 'paused' : 'playing';
    host.dataset.waterTime = sceneTime.toFixed(3);
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
    orbit = THREE.MathUtils.clamp(down.orbit - dx * 0.004, -Math.PI, Math.PI);
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
    event.preventDefault(); zoom = THREE.MathUtils.clamp(zoom + event.deltaY * 0.008, -7, 32);
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
      sun.shadow.map?.dispose();
      renderer.dispose(); canvas.remove();
    },
  };
}
