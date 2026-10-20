import * as THREE from 'three';

// Original sculptural interpretations: every figure and prop has real volume.
// Geometry and materials belong to the world's caches and are disposed with it.
export function createDioramaBuilder({ mesh, material, geometryCache }) {
  const skin = material('#edb08c', { roughness: 0.65 });
  const blush = material('#ce7b75');
  const blue = material('#89b9ce', { roughness: 0.65 });
  const ivory = material('#fff1cd');
  const red = material('#a92d39');
  const saffron = material('#e89c32');
  const gold = material('#e4b74e', { metalness: 0.65, roughness: 0.32 });
  const hair = material('#283137');
  const eyes = material('#30271e', { roughness: 0.35 });
  const white = material('#fff7e8');
  const rose = material('#d27098');
  const parchment = material('#ead5a4');
  const wood = material('#775038');
  const gem = material('#258b90', { metalness: 0.25, roughness: 0.2 });

  function group(parent, x = 0, y = 0, z = 0, scale = 1) {
    const value = new THREE.Group();
    value.position.set(x, y, z);
    value.scale.setScalar(scale);
    parent.add(value);
    return value;
  }
  function oval(parent, surface, x, y, z, sx, sy, sz) {
    const value = mesh(parent, 'SphereGeometry', [1, 24, 16], surface, x, y, z);
    value.scale.set(sx, sy, sz);
    return value;
  }
  function tube(parent, points, startRadius, endRadius, surface) {
    const key = `sculpture:${JSON.stringify([points, startRadius, endRadius])}`;
    if (!geometryCache.has(key)) {
      const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
      const segments = 32, sides = 10;
      const frames = curve.computeFrenetFrames(segments, false);
      const vertices = [], indices = [];
      for (let i = 0; i <= segments; i++) {
        const point = curve.getPointAt(i / segments);
        const radius = THREE.MathUtils.lerp(startRadius, endRadius, i / segments);
        for (let j = 0; j <= sides; j++) {
          const angle = j / sides * Math.PI * 2;
          const offset = frames.normals[i].clone().multiplyScalar(Math.cos(angle) * radius)
            .addScaledVector(frames.binormals[i], Math.sin(angle) * radius);
          vertices.push(point.x + offset.x, point.y + offset.y, point.z + offset.z);
          if (i < segments && j < sides) {
            const a = i * (sides + 1) + j, b = a + sides + 1;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
          }
        }
      }
      const shape = new THREE.BufferGeometry();
      shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      shape.setIndex(indices);
      shape.computeVertexNormals();
      geometryCache.set(key, shape);
    }
    const value = new THREE.Mesh(geometryCache.get(key), surface);
    value.castShadow = true;
    value.receiveShadow = true;
    parent.add(value);
    return value;
  }
  function ring(parent, x, y, z, radius, thickness, surface = gold) {
    return mesh(parent, 'TorusGeometry', [radius, thickness, 8, 40], surface, x, y, z);
  }
  function crown(parent, y, radius = 0.65) {
    mesh(parent, 'CylinderGeometry', [radius * 0.82, radius, 0.25, 32], gold, 0, y, 0);
    mesh(parent, 'CylinderGeometry', [radius * 0.38, radius * 0.82, 0.48, 32], gold, 0, y + 0.32, 0);
    oval(parent, gold, 0, y + 0.69, 0, 0.2, 0.28, 0.2);
    oval(parent, gem, 0, y + 0.23, radius * 0.75, 0.14, 0.17, 0.07);
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      oval(parent, ivory, Math.sin(angle) * radius * 0.93, y, Math.cos(angle) * radius * 0.93, 0.055, 0.055, 0.055);
    }
  }
  function necklace(parent, y, width = 0.58, z = 0.43) {
    tube(parent, [[-width, y + 0.23, z], [-width * 0.6, y - 0.08, z + 0.15], [0, y - 0.25, z + 0.22], [width * 0.6, y - 0.08, z + 0.15], [width, y + 0.23, z]], 0.055, 0.055, gold);
    oval(parent, gem, 0, y - 0.25, z + 0.27, 0.12, 0.17, 0.07);
  }
  function face(parent, y, surface, elephant = false) {
    const spread = elephant ? 0.36 : 0.23;
    const z = elephant ? 0.65 : 0.49;
    for (const side of [-1, 1]) {
      oval(parent, white, side * spread, y, z, 0.13, 0.075, 0.055);
      oval(parent, eyes, side * spread, y, z + 0.045, 0.055, 0.065, 0.035);
      tube(parent, [[side * (spread - 0.13), y + 0.16, z], [side * spread, y + 0.2, z + 0.03], [side * (spread + 0.12), y + 0.16, z - 0.03]], 0.027, 0.018, hair);
    }
    oval(parent, red, 0, y + 0.4, z + 0.025, 0.055, 0.14, 0.035);
    if (!elephant) {
      oval(parent, surface, 0, y - 0.13, z + 0.05, 0.075, 0.13, 0.1);
      tube(parent, [[-0.12, y - 0.32, z - 0.01], [0, y - 0.35, z + 0.02], [0.12, y - 0.32, z - 0.01]], 0.018, 0.018, blush);
    }
  }
  function arm(parent, points, surface, raised = false) {
    tube(parent, points, 0.22, 0.15, surface);
    const [x, y, z] = points.at(-1);
    oval(parent, surface, x, y, z, 0.2, raised ? 0.3 : 0.19, 0.13);
    const bracelet = ring(parent, x, y - (raised ? 0.2 : 0), z, 0.16, 0.04);
    bracelet.rotation.x = Math.PI / 2;
    if (raised) {
      for (let f = 0; f < 4; f++) oval(parent, surface, x - 0.12 + f * 0.075, y + 0.21, z, 0.035, 0.13, 0.055);
    }
  }
  function lotus(parent, x, y, z, radius = 1) {
    const flower = group(parent, x, y, z, radius);
    for (let layer = 0; layer < 2; layer++) {
      for (let p = 0; p < 10; p++) {
        const angle = p / 10 * Math.PI * 2 + layer * 0.3;
        const petal = oval(flower, layer ? blush : rose, Math.sin(angle) * 0.65, layer * 0.16, Math.cos(angle) * 0.65, 0.28, 0.2, 0.8);
        petal.rotation.y = angle; petal.rotation.x = -0.18;
      }
    }
    oval(flower, gold, 0, 0.17, 0, 0.6, 0.16, 0.6);
    return flower;
  }
  function ganesha(parent, x, z, scale = 1, writing = false) {
    const figure = group(parent, x, 0.86, z, scale);
    figure.name = 'Ganesha sculpture';
    lotus(figure, 0, 0, 0, 1.3);
    oval(figure, red, 0, 0.52, 0, 1.32, 0.48, 0.92);
    for (const side of [-1, 1]) {
      const leg = oval(figure, saffron, side * 0.69, 0.48, 0.53, 0.73, 0.31, 0.46);
      leg.rotation.z = side * 0.18;
      oval(figure, skin, side * 0.63, 0.3, 0.92, 0.4, 0.22, 0.28);
    }
    oval(figure, skin, 0, 1.5, 0.1, 0.99, 1.1, 0.77);
    oval(figure, skin, 0, 2.35, 0, 0.73, 0.7, 0.56);
    const belt = ring(figure, 0, 0.95, 0.12, 0.89, 0.07);
    belt.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      oval(figure, skin, side * 0.91, 3.14, -0.02, 0.63, 0.84, 0.22).rotation.z = side * -0.22;
      oval(figure, blush, side * 0.98, 3.15, 0.18, 0.41, 0.61, 0.065).rotation.z = side * -0.22;
      ring(figure, side * 1.04, 2.58, 0.23, 0.18, 0.04);
    }
    oval(figure, skin, 0, 3.2, 0.06, 0.77, 0.86, 0.65);
    face(figure, 3.37, skin, true);
    tube(figure, [[0, 3.2, 0.64], [0, 2.8, 0.97], [0.09, 2.22, 1.04], [0.44, 1.98, 1.08], [0.67, 2.15, 1.09]], 0.3, 0.09, skin);
    for (const side of [-1, 1]) {
      tube(figure, [[side * 0.41, 2.95, 0.61], [side * 0.53, 2.63, 0.86], [side * 0.63, writing && side === 1 ? 2.63 : 2.81, 0.98]], 0.12, 0.015, ivory);
      arm(figure, [[side * 0.66, 2.25, -0.05], [side * 1.3, 2.5, -0.1], [side * 1.47, 3.1, 0.06]], skin, true);
    }
    arm(figure, [[-0.71, 2.18, 0.3], [-1.14, 1.66, 0.57], [-1.38, 1.5, 0.91]], skin);
    arm(figure, writing
      ? [[0.75, 2.1, 0.31], [1.2, 1.5, 0.7], [1.15, 0.97, 1.5]]
      : [[0.75, 2.1, 0.31], [1.27, 1.94, 0.58], [1.45, 2.47, 0.78]], skin, !writing);
    oval(figure, gold, -1.38, 1.5, 0.96, 0.36, 0.09, 0.32);
    mesh(figure, 'ConeGeometry', [0.2, 0.33, 16], saffron, -1.38, 1.7, 0.96);
    lotus(figure, -1.47, 3.38, 0.08, 0.27);
    ring(figure, 1.47, 3.48, 0.05, 0.27, 0.045);
    crown(figure, 3.92, 0.75);
    necklace(figure, 2.25, 0.68, 0.57);
    if (writing) tube(figure, [[1.16, 1.12, 1.5], [1.22, 0.7, 1.75], [1.3, 0.55, 1.87]], 0.065, 0.015, ivory);
    return figure;
  }
  function person(parent, type, x, z, scale = 1, rotation = 0) {
    const figure = group(parent, x, 0.7, z, scale);
    figure.name = `${type} sculpture`; figure.rotation.y = rotation;
    const shiva = type === 'Shiva', parvati = type === 'Parvati', sage = type === 'Vyasa';
    const surface = shiva ? blue : skin;
    const cloth = parvati ? red : shiva ? saffron : ivory;
    const skirt = mesh(figure, 'CylinderGeometry', [0.48, 0.88, 1.8, 32], cloth, 0, 1, 0);
    skirt.scale.z = 0.72;
    for (const side of [-1, 1]) oval(figure, surface, side * 0.35, 0.12, 0.25, 0.22, 0.15, 0.4);
    oval(figure, parvati ? red : surface, 0, 2.2, 0, 0.64, 0.86, 0.4);
    oval(figure, surface, 0, 3.34, 0, 0.5, 0.64, 0.49);
    oval(figure, hair, 0, 3.6, -0.13, 0.54, 0.53, 0.4);
    face(figure, 3.46, surface);
    necklace(figure, 2.55, 0.45, 0.34);
    if (parvati) {
      crown(figure, 3.85, 0.5);
      const veil = oval(figure, red, 0, 3.12, -0.37, 0.7, 1.25, 0.22);
      veil.rotation.x = -0.1;
      tube(figure, [[-0.55, 3.7, 0], [-0.69, 3.05, 0.08], [-0.58, 2.3, 0.37], [0.4, 1.7, 0.5]], 0.06, 0.06, gold);
      arm(figure, [[-0.55, 2.6, 0], [-0.87, 2.1, 0.15], [-0.79, 1.8, 0.6]], surface);
      arm(figure, [[0.55, 2.6, 0], [0.97, 2.37, 0.4], [1.2, 2.48, 0.72]], surface);
    } else {
      arm(figure, [[-0.55, 2.6, 0], [-0.9, 2.1, 0.15], [-1.06, 2.18, 0.5]], surface);
      arm(figure, [[0.55, 2.6, 0], [0.85, 2.2, 0.2], [0.92, 2.73, 0.5]], surface, true);
      oval(figure, hair, 0, 4.08, -0.1, 0.29, 0.42, 0.29);
    }
    if (shiva) {
      const crescent = mesh(figure, 'TorusGeometry', [0.24, 0.055, 8, 24, Math.PI * 1.3], ivory, 0.25, 4.17, 0.18);
      crescent.rotation.z = -0.9;
      for (let i = 0; i < 3; i++) mesh(figure, 'BoxGeometry', [0.31, 0.025, 0.025], white, 0, 3.71 + i * 0.055, 0.44);
      tube(figure, [[-1.4, 0.1, 0], [-1.4, 2.7, 0], [-1.4, 4.5, 0]], 0.055, 0.055, gold);
      for (const side of [-1, 0, 1]) tube(figure, [[-1.4, 4.1, 0], [-1.4 + side * 0.34, 4.45, 0], [-1.4 + side * 0.34, 4.9 - Math.abs(side) * 0.18, 0]], 0.055, 0.012, gold);
    }
    if (sage) {
      oval(figure, ivory, 0, 3.04, 0.4, 0.37, 0.65, 0.22);
      oval(figure, ivory, 0, 3.75, -0.12, 0.56, 0.32, 0.46);
    }
    return figure;
  }
  function child(parent, x, z, guardian = false) {
    const figure = person(parent, 'Young Ganesha', x, z, 0.79);
    if (guardian) {
      tube(figure, [[1.12, 0, 0.5], [1.12, 2, 0.5], [1.12, 3.6, 0.5]], 0.075, 0.06, wood);
    }
    return figure;
  }
  function mouse(parent, x, z) {
    const animal = group(parent, x, 0.83, z);
    animal.name = 'Mouse';
    oval(animal, hair, 0, 0.2, 0, 0.38, 0.26, 0.6);
    oval(animal, hair, 0, 0.36, 0.48, 0.24, 0.23, 0.3);
    for (const side of [-1, 1]) oval(animal, blush, side * 0.21, 0.56, 0.48, 0.15, 0.18, 0.08);
    tube(animal, [[0, 0.2, -0.4], [0.42, 0.15, -0.85], [0.8, 0.2, -1.1]], 0.045, 0.015, blush);
  }
  function nandi(parent, x, z) {
    const animal = group(parent, x, 0.9, z, 0.95);
    animal.name = 'Nandi';
    oval(animal, ivory, 0, 0.55, 0, 0.65, 0.66, 1);
    oval(animal, ivory, 0, 1.04, 0.78, 0.42, 0.6, 0.53);
    oval(animal, ivory, 0, 0.83, 1.2, 0.39, 0.24, 0.23);
    for (const side of [-1, 1]) {
      tube(animal, [[side * 0.29, 1.43, 0.78], [side * 0.45, 1.8, 0.75], [side * 0.27, 2, 0.72]], 0.09, 0.015, gold);
      oval(animal, eyes, side * 0.29, 1.22, 1.16, 0.04, 0.05, 0.03);
    }
    necklace(animal, 0.73, 0.42, 0.96);
  }
  function manuscript(parent, x, z) {
    const desk = group(parent, x, 0.8, z);
    mesh(desk, 'BoxGeometry', [2.8, 0.2, 1.4], wood, 0, 0.2, 0);
    for (const side of [-1, 1]) {
      const page = mesh(desk, 'BoxGeometry', [1.2, 0.06, 1.2], parchment, side * 0.61, 0.35, 0);
      page.rotation.z = -side * 0.08;
      for (let row = 0; row < 5; row++) mesh(desk, 'BoxGeometry', [0.85, 0.013, 0.018], wood, side * 0.61, 0.45, -0.4 + row * 0.18);
    }
    for (let i = 0; i < 4; i++) mesh(parent, 'BoxGeometry', [1.3, 0.12, 0.8], parchment, x + 2, 0.8 + i * 0.14, z);
  }

  return function buildDiorama(island, index) {
    const tableau = group(island, -0.9, 0, 0);
    tableau.name = `Chapter ${index + 1} sculptural diorama`;
    mesh(tableau, 'CylinderGeometry', [5.9, 6.3, 0.2, 48], parchment, 0, 0.68, 0);
    const animations = [];
    if (index === 0) {
      person(tableau, 'Parvati', -1.8, -0.6, 1.45, 0.25);
      child(tableau, 1.25, 0.8);
      lotus(tableau, 1.25, 0.88, 0.8, 1.1);
      oval(tableau, gold, 3.8, 0.95, 2.2, 0.75, 0.3, 0.65);
      oval(tableau, saffron, 3.8, 1.14, 2.2, 0.63, 0.1, 0.53);
    } else if (index === 1) {
      child(tableau, 0.8, 1.1, true);
      person(tableau, 'Shiva', -2.5, -0.7, 1.4, 0.35);
      nandi(tableau, 3.5, -1.4);
      for (let i = 0; i < 5; i++) mesh(tableau, 'BoxGeometry', [1.2, 0.13, 0.65], wood, 1, 0.86, -1.4 - i * 0.8);
    } else if (index === 2 || index === 3 || index === 4) {
      person(tableau, 'Shiva', -3.2, -1.6, 1.25, 0.2);
      person(tableau, 'Parvati', 2.4, -1.6, 1.25, -0.2);
      const childGod = ganesha(tableau, -0.4, 1.5, 0.92);
      if (index === 4) {
        const path = ring(tableau, -0.4, 0.84, -0.3, 4.5, 0.055);
        path.rotation.x = Math.PI / 2;
        const pilgrim = group(tableau);
        lotus(pilgrim, 0, 0, 0, 0.25);
        animations.push(time => { pilgrim.position.set(-0.4 + Math.cos(time * 0.24) * 4.5, 1, -0.3 + Math.sin(time * 0.24) * 4.5); });
      }
      if (index === 3) {
        const wreath = ring(childGod, 0, 3, -0.55, 2.35, 0.065);
        wreath.name = 'Blessing aureole';
      }
    } else if (index === 5) {
      ganesha(tableau, -1.7, 0, 1.18, true);
      person(tableau, 'Vyasa', 2.5, -0.6, 1.12, -0.3);
      manuscript(tableau, -0.5, 2.8);
    } else {
      const figure = ganesha(tableau, -0.4, 0, 1.45);
      mouse(tableau, 2.2, 2.1);
      if (index === 7) {
        for (let i = 0; i < 4; i++) {
          const devotee = person(tableau, 'Devotee', -4.2 + i * 2.6, 3.9, 0.44);
          devotee.rotation.y = Math.PI;
        }
      } else {
        const flower = lotus(tableau, 3.7, 1, -0.5, 0.9);
        animations.push(time => { flower.rotation.y = time * 0.09; });
      }
      const aureole = ring(figure, 0, 2.85, -0.8, 2.6, 0.075);
      for (let i = 0; i < 24; i++) {
        const angle = i / 24 * Math.PI * 2;
        oval(aureole, gold, Math.sin(angle) * 2.6, Math.cos(angle) * 2.6, 0, 0.06, 0.06, 0.06);
      }
    }
    return { update(time) { animations.forEach(animate => animate(time)); } };
  };
}
