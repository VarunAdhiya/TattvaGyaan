import * as THREE from 'three';


// Transparent, photographic-style artwork belongs to the island world, rather
// than a framed picture. These are illustrated tableaux, not anatomical meshes.
// Their organic silhouettes stay legible as the camera orbits the 3D terrain.
export function createTableauBuilder({ levels, mesh, material, geometryCache, materials, textures, onChange, isDisposed, anisotropy }) {
  const loader = new THREE.TextureLoader();
  const stone = material('#b6a58a', { roughness: 1 });
  const darkStone = material('#756b5c', { roughness: 1 });
  const gold = material('#a98142', { metalness: 0.55, roughness: 0.46 });
  const worldPosition = new THREE.Vector3();

  // A shallow curved surface gives the tableau a little depth without introducing
  // a rectangular backing. Keep the image's original alpha and aspect ratio.
  const relief = new THREE.PlaneGeometry(1, 1, 48, 32);
  const vertices = relief.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i);
    vertices.setZ(i, Math.cos(x * Math.PI) * Math.cos(y * Math.PI) * 0.045);
  }
  relief.computeVertexNormals();
  geometryCache.set('devotional-tableau', relief);

  return function buildTableau(island, index) {
    const level = levels[index];
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.7, 0);
    pivot.name = `${level.id} devotional tableau`;
    island.add(pivot);
    const state = { ready: false, failed: false };
    const surface = new THREE.MeshBasicMaterial({
      transparent: true, alphaTest: 0.035, side: THREE.DoubleSide,
      depthWrite: true, toneMapped: false,
    });
    materials.add(surface);
    const artwork = new THREE.Mesh(relief, surface);
    artwork.visible = false;
    pivot.add(artwork);

    // A low stone terrace and separate foreground lamps make the illustration
    // part of a place. No roof, wall, display frame, or cylindrical toy pedestal.
    const terrace = mesh(island, 'CylinderGeometry', [6.4, 6.65, 0.18, 64], stone, 0, 0.59, 0);
    terrace.scale.z = 0.77;
    const edging = mesh(island, 'TorusGeometry', [6.2, 0.045, 8, 80], gold, 0, 0.7, 0);
    edging.rotation.x = -Math.PI / 2;
    edging.scale.y = 0.77;
    for (let i = 0; i < 3; i++) {
      const step = mesh(island, 'BoxGeometry', [4.2 + i * 0.4, 0.13, 0.55], darkStone, 0, 0.52 - i * 0.08, 5.1 + i * 0.52);
      step.receiveShadow = true;
    }

    const texture = loader.load(level.sceneImage, loaded => {
      if (isDisposed()) { loaded.dispose(); return; }
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = anisotropy;
      surface.map = loaded;
      surface.needsUpdate = true;
      const aspect = loaded.image.width / loaded.image.height;
      // Generated PNGs have different transparent margins. Ground the actual
      // silhouette on the terrace instead of letting that padding lift it up.
      const matte = document.createElement('canvas');
      matte.width = loaded.image.width; matte.height = loaded.image.height;
      const context = matte.getContext('2d', { willReadFrequently: true });
      let bottomPadding = 0;
      let left = 0, right = matte.width - 1, top = 0, bottom = matte.height - 1;
      if (context) {
        context.drawImage(loaded.image, 0, 0);
        const pixels = context.getImageData(0, 0, matte.width, matte.height).data;
        left = matte.width; right = 0; top = matte.height; bottom = 0;
        for (let y = 0; y < matte.height; y += 2) {
          for (let x = 0; x < matte.width; x += 2) {
            if (pixels[(y * matte.width + x) * 4 + 3] >= 128) {
              left = Math.min(left, x); right = Math.max(right, x);
              top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
          }
        }
        if (right <= left) { left = 0; right = matte.width - 1; top = 0; bottom = matte.height - 1; }
        bottomPadding = (matte.height - 1 - bottom) / matte.height;
      }
      const visibleWidth = (right - left + 1) / matte.width;
      const visibleHeight = (bottom - top + 1) / matte.height;
      const artWidth = Math.min(12.6 / visibleWidth, 9.8 * aspect / visibleHeight);
      const artHeight = artWidth / aspect;
      artwork.scale.set(artWidth, artHeight, artWidth);
      artwork.position.x = -(0.5 * (left + right) / matte.width - 0.5) * artWidth;
      artwork.position.y = artHeight * (0.5 - bottomPadding) - 0.08;
      artwork.visible = true;
      state.ready = true;
      onChange(index);
    }, undefined, () => {
      if (isDisposed()) return;
      state.failed = true;
      onChange(index);
    });
    textures.add(texture);

    return {
      state,
      update(camera) {
        pivot.getWorldPosition(worldPosition);
        pivot.rotation.y = Math.atan2(camera.position.x - worldPosition.x, camera.position.z - worldPosition.z);
      },
    };
  };
}
