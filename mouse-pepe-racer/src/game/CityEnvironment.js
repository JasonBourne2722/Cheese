import * as THREE from 'three';

const ASH = new THREE.MeshStandardMaterial({ color: 0x20262b, roughness: 0.95, metalness: 0.08 });
const RUST = new THREE.MeshStandardMaterial({ color: 0x7b301f, roughness: 0.85, metalness: 0.22 });
const WALL = new THREE.MeshStandardMaterial({ color: 0x30323a, roughness: 0.72, metalness: 0.18 });
const RIVER = new THREE.MeshStandardMaterial({ color: 0x17363e, roughness: 0.35, metalness: 0.05, emissive: 0x0b5b64, emissiveIntensity: 0.28 });
const LIGHTS = [0x00ffd1, 0x9945ff, 0xff384c, 0xffd44d];

export class CityEnvironment {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.flickerables = [];
  }

  build() {
    this.addGroundPlane();
    this.addRiver();
    this.addBuildings();
    this.addStreetFurniture();
    this.addTunnelShells();
  }

  addGroundPlane() {
    const ground = new THREE.Mesh(new THREE.BoxGeometry(2200, 1, 900), ASH);
    ground.position.set(450, -4.2, 0);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  addRiver() {
    const mid = this.track.sample(575).position;
    const river = new THREE.Mesh(new THREE.BoxGeometry(170, 0.35, 260), RIVER);
    river.position.set(mid.x, -2.85, mid.z);
    river.rotation.y = -0.25;
    this.scene.add(river);
  }

  addBuildings() {
    for (let i = 0; i < 120; i += 1) {
      const progress = (i / 119) * this.track.totalLength;
      const sample = this.track.sample(progress);
      const side = i % 2 === 0 ? 1 : -1;
      const lateral = new THREE.Vector3(-Math.sin(sample.yaw), 0, Math.cos(sample.yaw)).multiplyScalar(side * (42 + Math.random() * 72));
      const h = 12 + Math.random() * 48;
      const building = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.BoxGeometry(5 + Math.random() * 11, h, 5 + Math.random() * 9), WALL);
      tower.position.y = h * 0.5 - 3.8;
      tower.castShadow = true;
      building.add(tower);

      for (let w = 0; w < 4; w += 1) {
        const mat = new THREE.MeshStandardMaterial({
          color: LIGHTS[(i + w) % LIGHTS.length],
          emissive: LIGHTS[(i + w) % LIGHTS.length],
          emissiveIntensity: 0.25 + Math.random() * 0.75,
        });
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, h * (0.3 + Math.random() * 0.3), 0.18), mat);
        strip.position.set(tower.geometry.parameters.width * 0.5 + 0.08, h * 0.33 - 2.4, (w - 1.5) * 1.2);
        building.add(strip);
        this.flickerables.push(mat);
      }

      building.position.copy(sample.position).add(lateral);
      building.rotation.y = -sample.yaw + (Math.random() - 0.5) * 0.55;
      this.scene.add(building);
    }
  }

  addStreetFurniture() {
    for (let i = 0; i < 70; i += 1) {
      const sample = this.track.sample(35 + i * 31);
      const side = i % 2 === 0 ? 1 : -1;
      const lateral = new THREE.Vector3(-Math.sin(sample.yaw), 0, Math.cos(sample.yaw)).multiplyScalar(side * (sample.width * 0.5 + 3.2));
      const base = sample.position.clone().add(lateral);
      if (i % 5 === 0) this.addDestroyedCar(base, sample.yaw);
      else if (i % 4 === 0) this.addGraffitiWall(base, sample.yaw);
      else if (i % 3 === 0) this.addJunkPile(base);
      else this.addStreetLight(base, sample.yaw, LIGHTS[i % LIGHTS.length]);
    }
  }

  addDestroyedCar(pos, yaw) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1, 2.2), RUST);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.8), WALL);
    cabin.position.set(0.3, 0.75, 0);
    car.add(body, cabin);
    car.position.copy(pos);
    car.position.y += 0.15;
    car.rotation.y = -yaw + (Math.random() - 0.5) * 1.2;
    car.rotation.z = (Math.random() - 0.5) * 0.35;
    this.scene.add(car);
  }

  addGraffitiWall(pos, yaw) {
    const wall = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 0.35), WALL);
    const paint = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.28, 0.42), new THREE.MeshStandardMaterial({ color: 0x00ffd1, emissive: 0x00ffd1, emissiveIntensity: 0.45 }));
    paint.position.y = 0.4;
    wall.add(slab, paint);
    wall.position.copy(pos);
    wall.position.y += 1.15;
    wall.rotation.y = -yaw + Math.PI * 0.5;
    this.scene.add(wall);
  }

  addJunkPile(pos) {
    const pile = new THREE.Group();
    for (let i = 0; i < 5; i += 1) {
      const scrap = new THREE.Mesh(new THREE.BoxGeometry(1 + Math.random() * 2, 0.45 + Math.random(), 0.8 + Math.random() * 2), i % 2 ? RUST : WALL);
      scrap.position.set((Math.random() - 0.5) * 3, Math.random() * 0.8, (Math.random() - 0.5) * 3);
      scrap.rotation.set(Math.random(), Math.random(), Math.random());
      pile.add(scrap);
    }
    pile.position.copy(pos);
    this.scene.add(pile);
  }

  addStreetLight(pos, yaw, color) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.5, 0.18), WALL);
    pole.position.y = 2.6;
    const lampMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.55), lampMat);
    lamp.position.set(0, 5.2, 0);
    const light = new THREE.PointLight(color, 1.2, 28);
    light.position.set(0, 5.2, 0);
    group.add(pole, lamp, light);
    group.position.copy(pos);
    group.rotation.y = -yaw;
    this.scene.add(group);
    this.flickerables.push(lampMat);
  }

  addTunnelShells() {
    this.track.segments.filter((segment) => segment.type === 'tunnel').forEach((segment, index) => {
      if (index % 2 !== 0) return;
      const center = new THREE.Vector3().addVectors(segment.start, segment.end).multiplyScalar(0.5);
      const shell = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 24), new THREE.MeshStandardMaterial({ color: 0x171a20, roughness: 0.8, metalness: 0.25 }));
      shell.position.copy(center);
      shell.position.y += 5.5;
      shell.rotation.y = -segment.yaw;
      this.scene.add(shell);
    });
  }

  update(time) {
    this.flickerables.forEach((mat, index) => {
      mat.emissiveIntensity = 0.25 + Math.abs(Math.sin(time * 0.004 + index * 1.7)) * 0.9;
    });
  }
}
