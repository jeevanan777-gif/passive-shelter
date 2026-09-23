/**
 * PASSIVE SHELTER DESIGNER - 3D Visualization Module (Three.js)
 * Live interactive 3D model updating with geometry, materials, orientation, and solar vector.
 */

class ShelterViewer3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.shelterGroup = null;
    this.sunLight = null;
    this.sunSphere = null;
    this.compassGroup = null;
    this.isHeatmapMode = false;

    // Current state cache
    this.currentGeometry = {
      length: 5.0,
      width: 4.0,
      height: 3.0,
      roofType: 'flat',
      orientation: 0,
      windowArea: 2.0,
      doorArea: 1.8
    };
    this.currentMaterials = {
      wallMaterial: 'brick_common',
      roofMaterial: 'rcc_slab'
    };

    this.init();
  }

  init() {
    if (!this.container) return;
    if (typeof THREE === 'undefined') {
      console.warn("Three.js not loaded. 3D view will be unavailable.");
      this.container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#a0aec0;font-size:14px;text-align:center;padding:20px;">
          <div>
            <div style="font-size:24px;margin-bottom:8px;">📐</div>
            <p><strong>3D WebGL Engine Initializing...</strong></p>
            <p style="font-size:12px;opacity:0.8;">Ensure active internet access for 3D library (Three.js) CDN.</p>
          </div>
        </div>`;
      return;
    }

    const width = this.container.clientWidth || 500;
    const height = this.container.clientHeight || 360;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131924); // Dark technical CAD slate background

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(12, 10, 14);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Do not go below ground plane
      this.controls.minDistance = 4;
      this.controls.maxDistance = 40;
      this.controls.target.set(0, 1.5, 0);
    }

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x94b3df, 0x3d372d, 0.4);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.1);
    this.sunLight.position.set(12, 18, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 50;
    const d = 12;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Visual Sun Sphere marker
    const sunGeom = new THREE.SphereGeometry(0.6, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd24d });
    this.sunSphere = new THREE.Mesh(sunGeom, sunMat);
    this.sunSphere.position.copy(this.sunLight.position);
    this.scene.add(this.sunSphere);

    // 6. Ground & Compass
    this.createGroundAndCompass();

    // 7. Shelter Group
    this.shelterGroup = new THREE.Group();
    this.scene.add(this.shelterGroup);

    // Initial build
    this.rebuildShelter();

    // Resize handler
    window.addEventListener('resize', () => this.onWindowResize());

    // Animation Loop
    this.animate();
  }

  createGroundAndCompass() {
    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(24, 24);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x1d2432 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -0.01;
    this.scene.add(ground);

    // Grid helper
    const grid = new THREE.GridHelper(24, 24, 0x3d4b64, 0x242d3d);
    grid.position.y = 0;
    this.scene.add(grid);

    // Compass Rose
    this.compassGroup = new THREE.Group();
    this.compassGroup.position.set(0, 0.02, 0);

    // North arrow (Red)
    const arrowDir = new THREE.Vector3(0, 0, -1);
    const arrowLen = 5.5;
    const arrowColor = 0xe53e3e;
    const northArrow = new THREE.ArrowHelper(arrowDir, new THREE.Vector3(0, 0.05, 0), arrowLen, arrowColor, 0.8, 0.5);
    this.compassGroup.add(northArrow);

    // South arrow (Subtle cyan/white)
    const southArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.05, 0), arrowLen * 0.7, 0x4a5568, 0.5, 0.3);
    this.compassGroup.add(southArrow);

    // East arrow
    const eastArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.05, 0), arrowLen * 0.7, 0x4a5568, 0.5, 0.3);
    this.compassGroup.add(eastArrow);

    // West arrow
    const westArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0.05, 0), arrowLen * 0.7, 0x4a5568, 0.5, 0.3);
    this.compassGroup.add(westArrow);

    this.scene.add(this.compassGroup);
  }

  getMaterialColor(materialKey, category, defaultHex) {
    if (this.isHeatmapMode) {
      // Heatmap gradient colors: Blue (low heat) -> Orange (moderate) -> Red (high solar gain)
      if (category === 'roofs') return 0xef4444; // Roofs get highest solar flux
      if (category === 'walls') return 0xf59e0b; // Walls get moderate flux
      return 0x3b82f6; // Floor/ground
    }
    const mat = MATERIALS_DATABASE[category]?.[materialKey];
    if (mat && mat.color) {
      return parseInt(mat.color.replace('#', '0x'), 16);
    }
    return defaultHex;
  }

  rebuildShelter(geometry = this.currentGeometry, materials = this.currentMaterials) {
    if (!this.shelterGroup) return;

    this.currentGeometry = { ...this.currentGeometry, ...geometry };
    this.currentMaterials = { ...this.currentMaterials, ...materials };

    const L = Number(this.currentGeometry.length) || 5.0;
    const W = Number(this.currentGeometry.width) || 4.0;
    const H = Number(this.currentGeometry.height) || 3.0;
    const orientation = Number(this.currentGeometry.orientation) || 0;
    const roofType = this.currentGeometry.roofType || 'flat';
    const windowArea = Number(this.currentGeometry.windowArea) || 2.0;
    const doorArea = Number(this.currentGeometry.doorArea) || 1.8;

    // Clear existing meshes
    while (this.shelterGroup.children.length > 0) {
      const obj = this.shelterGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
      this.shelterGroup.remove(obj);
    }

    const wallColor = this.getMaterialColor(this.currentMaterials.wallMaterial, 'walls', 0xb2533e);
    const roofColor = this.getMaterialColor(this.currentMaterials.roofMaterial, 'roofs', 0x7e8287);
    const floorColor = this.getMaterialColor(this.currentMaterials.floorMaterial, 'floors', 0x4a5568);

    // Wall Material
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    // Floor
    const floorGeo = new THREE.BoxGeometry(L, 0.15, W);
    const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.9 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0.075, 0);
    floorMesh.receiveShadow = true;
    this.shelterGroup.add(floorMesh);

    // Wall geometry: Main envelope box with interior view
    // Build 4 distinct walls for realism and openings
    const wallThickness = 0.2;

    // Back Wall (-Z)
    const backWallGeo = new THREE.BoxGeometry(L, H, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, wallMaterial);
    backWall.position.set(0, H / 2, -W / 2 + wallThickness / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.shelterGroup.add(backWall);

    // Left Wall (-X)
    const leftWallGeo = new THREE.BoxGeometry(wallThickness, H, W - 2 * wallThickness);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMaterial);
    leftWall.position.set(-L / 2 + wallThickness / 2, H / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.shelterGroup.add(leftWall);

    // Right Wall (+X)
    const rightWallGeo = new THREE.BoxGeometry(wallThickness, H, W - 2 * wallThickness);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMaterial);
    rightWall.position.set(L / 2 - wallThickness / 2, H / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    this.shelterGroup.add(rightWall);

    // Front Wall (+Z): Has Window & Door
    // Door dimensions: W_door x H_door
    const H_door = Math.min(2.1, H * 0.8);
    const W_door = Math.min(doorArea / H_door, L * 0.35);

    // Window dimensions: W_win x H_win
    const H_win = Math.min(1.2, H * 0.5);
    const W_win = Math.min(windowArea / H_win, L * 0.45);
    const winSillHeight = 0.9;

    // Create front wall segments (around door and window)
    const frontWall = new THREE.Group();
    frontWall.position.set(0, 0, W / 2 - wallThickness / 2);

    // Main front wall body (composite representation)
    const fwGeo = new THREE.BoxGeometry(L, H, wallThickness);
    const fwMesh = new THREE.Mesh(fwGeo, wallMaterial);
    fwMesh.position.set(0, H / 2, 0);
    fwMesh.castShadow = true;
    fwMesh.receiveShadow = true;
    frontWall.add(fwMesh);

    // Door Visual Cutout / Panel
    const doorGeo = new THREE.BoxGeometry(W_door, H_door, wallThickness + 0.04);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.6 });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(-L * 0.25, H_door / 2, 0);
    frontWall.add(doorMesh);

    // Window Visual Glass & Frame
    const winGeo = new THREE.BoxGeometry(W_win, H_win, wallThickness + 0.04);
    const winMat = new THREE.MeshPhysicalMaterial({
      color: 0x64b5f6,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      transmission: 0.8,
      reflectivity: 0.9
    });
    const winMesh = new THREE.Mesh(winGeo, winMat);
    winMesh.position.set(L * 0.22, winSillHeight + H_win / 2, 0);
    frontWall.add(winMesh);

    // Window Frame
    const frameGeo = new THREE.BoxGeometry(W_win + 0.1, H_win + 0.1, wallThickness + 0.02);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2d3748 });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.copy(winMesh.position);
    frameMesh.position.z -= 0.01;
    frontWall.add(frameMesh);

    this.shelterGroup.add(frontWall);

    // Roof Mesh
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: roofColor,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    if (roofType === 'flat') {
      // Flat slab with slight overhang & parapet
      const overhang = 0.3;
      const flatRoofGeo = new THREE.BoxGeometry(L + overhang * 2, 0.2, W + overhang * 2);
      const flatRoof = new THREE.Mesh(flatRoofGeo, roofMaterial);
      flatRoof.position.set(0, H + 0.1, 0);
      flatRoof.castShadow = true;
      flatRoof.receiveShadow = true;
      this.shelterGroup.add(flatRoof);
    } else if (roofType === 'gable') {
      // Pitched Gable Roof
      const pitchHeight = Math.min(1.8, W * 0.35);
      const overhang = 0.35;
      
      const roofGeom = new THREE.BufferGeometry();
      // Triangle gable vertices
      const halfL = (L + overhang * 2) / 2;
      const halfW = (W + overhang * 2) / 2;
      const apexY = H + pitchHeight;
      const baseY = H;

      // Two inclined plane slopes
      // Left slope (-Z to +Z over X, or slope over Z)
      const slopeGeo = new THREE.BoxGeometry(L + overhang * 2, 0.12, Math.sqrt(halfW * halfW + pitchHeight * pitchHeight) + 0.2);
      
      // Slope 1 (+Z side)
      const slopeAngle = Math.atan2(pitchHeight, halfW);
      const slope1 = new THREE.Mesh(slopeGeo, roofMaterial);
      slope1.position.set(0, H + pitchHeight / 2, halfW / 2);
      slope1.rotation.x = -slopeAngle;
      slope1.castShadow = true;
      this.shelterGroup.add(slope1);

      // Slope 2 (-Z side)
      const slope2 = new THREE.Mesh(slopeGeo, roofMaterial);
      slope2.position.set(0, H + pitchHeight / 2, -halfW / 2);
      slope2.rotation.x = slopeAngle;
      slope2.castShadow = true;
      this.shelterGroup.add(slope2);

      // Gable end walls (triangles)
      const gableShape = new THREE.Shape();
      gableShape.moveTo(-halfW, baseY);
      gableShape.lineTo(0, apexY);
      gableShape.lineTo(halfW, baseY);
      gableShape.closePath();

      const gableGeo = new THREE.ShapeGeometry(gableShape);
      
      const gableLeft = new THREE.Mesh(gableGeo, wallMaterial);
      gableLeft.rotation.y = Math.PI / 2;
      gableLeft.position.set(-L / 2 + wallThickness / 2, 0, 0);
      gableLeft.castShadow = true;
      this.shelterGroup.add(gableLeft);

      const gableRight = new THREE.Mesh(gableGeo, wallMaterial);
      gableRight.rotation.y = -Math.PI / 2;
      gableRight.position.set(L / 2 - wallThickness / 2, 0, 0);
      gableRight.castShadow = true;
      this.shelterGroup.add(gableRight);

    } else if (roofType === 'shed') {
      // Monopitch / Shed roof (sloping down from back to front)
      const slopeHeight = Math.min(1.2, W * 0.25);
      const overhang = 0.35;
      const roofLen = Math.sqrt((W + overhang * 2) * (W + overhang * 2) + slopeHeight * slopeHeight);
      const shedRoofGeo = new THREE.BoxGeometry(L + overhang * 2, 0.15, roofLen);
      const shedRoof = new THREE.Mesh(shedRoofGeo, roofMaterial);
      
      const shedAngle = Math.atan2(slopeHeight, W + overhang * 2);
      shedRoof.position.set(0, H + slopeHeight / 2 + 0.1, 0);
      shedRoof.rotation.x = shedAngle;
      shedRoof.castShadow = true;
      this.shelterGroup.add(shedRoof);
    }

    // Apply orientation rotation (around Y axis in radians)
    // 0 deg = North (-Z), 90 deg = East (+X), 180 deg = South (+Z), 270 deg = West (-X)
    const rad = (orientation * Math.PI) / 180;
    this.shelterGroup.rotation.y = -rad;

    // Adjust camera target
    if (this.controls) {
      this.controls.target.set(0, H / 2, 0);
    }
  }

  setSolarTime(hour, solarAzimuthDeg = 180, betaDeg = 45) {
    if (!this.sunLight || !this.sunSphere) return;

    if (betaDeg <= 0) {
      // Night condition
      this.sunLight.intensity = 0.05;
      this.sunSphere.visible = false;
      return;
    }

    this.sunSphere.visible = true;
    this.sunLight.intensity = 1.1;

    // Calculate 3D position on celestial hemisphere (radius ~ 18)
    const R = 18;
    const betaRad = (betaDeg * Math.PI) / 180;
    const azRad = (solarAzimuthDeg * Math.PI) / 180;

    // In Three.js: -Z is North, +Z is South, +X is East, -X is West
    // Azimuth measured clockwise from North:
    // Az 0 = (0, 0, -R), Az 90 = (R, 0, 0), Az 180 = (0, 0, R), Az 270 = (-R, 0, 0)
    const x = R * Math.cos(betaRad) * Math.sin(azRad);
    const y = Math.max(1, R * Math.sin(betaRad));
    const z = -R * Math.cos(betaRad) * Math.cos(azRad);

    this.sunLight.position.set(x, y, z);
    this.sunSphere.position.set(x, y, z);
  }

  toggleHeatmapMode() {
    this.isHeatmapMode = !this.isHeatmapMode;
    this.rebuildShelter();
    return this.isHeatmapMode;
  }

  setCameraView(viewName) {
    if (!this.camera || !this.controls) return;
    const H = this.currentGeometry.height || 3.0;

    if (viewName === 'isometric') {
      this.camera.position.set(12, 10, 14);
    } else if (viewName === 'front') {
      this.camera.position.set(0, H / 2, 16);
    } else if (viewName === 'top') {
      this.camera.position.set(0, 18, 0.1);
    } else if (viewName === 'sun') {
      if (this.sunLight) {
        this.camera.position.copy(this.sunLight.position).multiplyScalar(0.85);
      }
    }
    this.controls.target.set(0, H / 2, 0);
    this.controls.update();
  }

  onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
