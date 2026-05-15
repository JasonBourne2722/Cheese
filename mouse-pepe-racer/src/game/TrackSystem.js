import * as THREE from 'three';

const ROAD_MAT = new THREE.MeshStandardMaterial({ color: 0x513526, roughness: 0.86, metalness: 0.04 });
const EDGE_MAT = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.68, metalness: 0.32 });
const RAMP_MAT = new THREE.MeshStandardMaterial({ color: 0x62402d, roughness: 0.8, metalness: 0.08 });
const ARROW_MAT = new THREE.MeshStandardMaterial({ color: 0xffd44d, emissive: 0xff6b2a, emissiveIntensity: 0.4 });
const CHECKPOINT_MAT = new THREE.MeshStandardMaterial({ color: 0x00ffd1, emissive: 0x00ffd1, emissiveIntensity: 0.55 });
const TURN_STRIPE_MAT = new THREE.MeshStandardMaterial({ color: 0xffeb5c, emissive: 0xff8a21, emissiveIntensity: 0.35 });

export class TrackSystem {
  constructor(scene) {
    this.scene = scene;
    this.width = 17;
    this.segments = [];
    this.checkpoints = [];
    this.rocketPickups = [];
    this.totalLength = 0;
    this.riverProgress = { start: 420, end: 740 };
    this.gap = { start: 565, end: 625, minSpeed: 23 };
  }

  build() {
    const plan = [
      ['straight', 90, 0, 0],
      ['right', 70, -1.18, 0],
      ['straight', 70, 0, 0],
      ['ramp', 110, 0.16, 6],
      ['gap', 60, 0, 0],
      ['bridge', 90, -0.32, -4],
      ['left', 82, 1.32, 0],
      ['tunnel', 88, 0.28, 2],
      ['sharpRight', 72, -1.95, 0],
      ['elevated', 120, 0.78, 8],
      ['straight', 78, 0, -2],
      ['sharpLeft', 74, 1.9, 0],
      ['riverCrossing', 90, -0.74, -4],
      ['right', 86, -1.28, 0],
      ['ramp', 112, 0.18, 5],
      ['straight', 120, 0, -3],
    ];

    let cursor = new THREE.Vector3(0, 2, 0);
    let yaw = 0;
    let progress = 0;
    const samples = [];

    plan.forEach(([type, length, yawDelta, heightDelta]) => {
      const startProgress = progress;
      const start = cursor.clone();
      const startYaw = yaw;
      const steps = Math.max(6, Math.ceil(length / 10));
      for (let i = 1; i <= steps; i += 1) {
        const t0 = (i - 1) / steps;
        const t1 = i / steps;
        const yaw0 = startYaw + yawDelta * t0;
        const yaw1 = startYaw + yawDelta * t1;
        const stepLen = length / steps;
        const previous = cursor.clone();
        yaw = yaw1;
        cursor.x += Math.cos(yaw) * stepLen;
        cursor.z += Math.sin(yaw) * stepLen;
        cursor.y = start.y + heightDelta * t1 + this.profileBump(type, t1);
        const segProgress = progress;
        progress += stepLen;
        const kind = type === 'gap' ? 'gap' : type;
        const segment = {
          type: kind,
          start: previous,
          end: cursor.clone(),
          progressStart: segProgress,
          progressEnd: progress,
          yaw: (yaw0 + yaw1) * 0.5,
          yawStart: yaw0,
          yawEnd: yaw1,
          dirYaw: Math.atan2(cursor.z - previous.z, cursor.x - previous.x),
          pitch: Math.atan2(cursor.y - previous.y, stepLen),
          width: this.width,
          id: this.segments.length,
          turnRate: yawDelta / length,
        };
        this.segments.push(segment);
        samples.push(segment);
        if (kind !== 'gap') this.addRoadSegment(segment);
      }
      this.addSectionDecor(type, startProgress, progress, start, cursor.clone(), yawDelta);
      if (['bridge', 'tunnel', 'elevated', 'riverCrossing'].includes(type)) {
        this.addCheckpoint(progress - length * 0.25);
      }
    });

    this.totalLength = progress;
    this.addCheckpoint(20);
    this.addCheckpoint(this.totalLength - 100);
    this.addRocketPickups();
    return this;
  }

  profileBump(type, t) {
    if (type === 'ramp') return Math.sin(t * Math.PI) * 2.4;
    if (type === 'bridge' || type === 'riverCrossing') return Math.sin(t * Math.PI) * 1.2;
    return 0;
  }

  addRoadSegment(segment) {
    const delta = new THREE.Vector3().subVectors(segment.end, segment.start);
    const length = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
    const center = new THREE.Vector3().addVectors(segment.start, segment.end).multiplyScalar(0.5);
    const mat = ['ramp', 'bridge', 'elevated', 'riverCrossing'].includes(segment.type) ? RAMP_MAT : ROAD_MAT;
    const road = new THREE.Mesh(new THREE.BoxGeometry(length + 1.15, 1.1, segment.width), mat);
    road.position.copy(center);
    road.rotation.y = -segment.dirYaw;
    road.rotation.z = segment.pitch;
    road.receiveShadow = true;
    this.scene.add(road);

    if (['bridge', 'gap', 'elevated', 'sharpLeft', 'sharpRight', 'riverCrossing'].includes(segment.type) || Math.abs(segment.turnRate) > 0.008) {
      this.addGuardRail(segment, -1);
      this.addGuardRail(segment, 1);
    }

    if (Math.abs(segment.turnRate) > 0.008) {
      this.addTurnStripe(segment, -1);
      this.addTurnStripe(segment, 1);
    }
  }

  addTurnStripe(segment, side) {
    const delta = new THREE.Vector3().subVectors(segment.end, segment.start);
    const length = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
    const center = new THREE.Vector3().addVectors(segment.start, segment.end).multiplyScalar(0.5);
    const offset = new THREE.Vector3(-Math.sin(segment.dirYaw), 0, Math.cos(segment.dirYaw)).multiplyScalar(side * (segment.width * 0.5 - 1.1));
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(length * 0.94, 0.08, 0.38), TURN_STRIPE_MAT);
    stripe.position.copy(center).add(offset);
    stripe.position.y += 0.61;
    stripe.rotation.y = -segment.dirYaw;
    stripe.rotation.z = segment.pitch;
    this.scene.add(stripe);
  }

  addGuardRail(segment, side) {
    const delta = new THREE.Vector3().subVectors(segment.end, segment.start);
    const length = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
    const center = new THREE.Vector3().addVectors(segment.start, segment.end).multiplyScalar(0.5);
    const offset = new THREE.Vector3(-Math.sin(segment.dirYaw), 0, Math.cos(segment.dirYaw)).multiplyScalar(side * (segment.width * 0.5 + 0.45));
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length + 0.75, 1.8, 0.35), EDGE_MAT);
    rail.position.copy(center).add(offset);
    rail.position.y += 1.1;
    rail.rotation.y = -segment.dirYaw;
    rail.rotation.z = segment.pitch;
    rail.castShadow = true;
    this.scene.add(rail);
  }

  addSectionDecor(type, startProgress, endProgress, start, end, yawDelta) {
    if (Math.abs(yawDelta) > 0.45) {
      const count = type.includes('sharp') ? 7 : 5;
      for (let i = 0; i < count; i += 1) {
        const sample = this.sample(THREE.MathUtils.lerp(startProgress, endProgress, 0.1 + i * 0.11));
        this.addWarningArrow(sample, Math.sign(yawDelta), type.includes('sharp') ? 1.35 : 1.1);
      }
    }
    if (type === 'gap') {
      const before = this.sample(startProgress - 22);
      this.addWarningArrow(before, 0, 1.7);
    }
  }

  addWarningArrow(sample, side = 0, scale = 1) {
    const group = new THREE.Group();
    const sign = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 2.2 * scale, 3), ARROW_MAT);
    sign.rotation.z = Math.PI / 2;
    sign.rotation.y = side > 0 ? -Math.PI * 0.5 : side < 0 ? Math.PI * 0.5 : 0;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 0.18), EDGE_MAT);
    sign.position.y = 2.1;
    group.add(post, sign);
    const sideOffset = side === 0 ? 0 : side * (this.width * 0.5 + 3);
    const lateral = new THREE.Vector3(-Math.sin(sample.yaw), 0, Math.cos(sample.yaw)).multiplyScalar(sideOffset);
    group.position.copy(sample.position).add(lateral);
    group.rotation.y = -sample.yaw;
    this.scene.add(group);
  }

  addCheckpoint(progress) {
    const sample = this.sample(progress);
    const gate = new THREE.Group();
    [-1, 1].forEach((side) => {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8, 0.45), CHECKPOINT_MAT);
      const lateral = new THREE.Vector3(-Math.sin(sample.yaw), 0, Math.cos(sample.yaw)).multiplyScalar(side * (this.width * 0.5 + 1));
      pole.position.copy(sample.position).add(lateral);
      pole.position.y += 3.5;
      gate.add(pole);
    });
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, this.width + 2.5), CHECKPOINT_MAT);
    top.position.copy(sample.position);
    top.position.y += 7.4;
    top.rotation.y = -sample.yaw;
    gate.add(top);
    this.scene.add(gate);
    this.checkpoints.push({ progress, sample });
  }

  addRocketPickups() {
    const placements = [
      { progress: 235, lane: -4.2 },
      { progress: 500, lane: 3.6 },
      { progress: 790, lane: -3.9 },
      { progress: 1085, lane: 4.1 },
      { progress: 1375, lane: -3.5 },
      { progress: this.totalLength - 185, lane: 3.8 },
    ];

    placements.forEach((pickup) => {
      if (pickup.progress > 30 && pickup.progress < this.totalLength - 20) {
        this.rocketPickups.push(pickup);
      }
    });
  }

  sample(progress) {
    const p = THREE.MathUtils.clamp(progress, 0, this.totalLength || progress);
    const seg = this.segments.find((item) => p >= item.progressStart && p <= item.progressEnd) ?? this.segments[this.segments.length - 1];
    if (!seg) return { position: new THREE.Vector3(), yaw: 0, pitch: 0, type: 'straight', width: this.width };
    const t = THREE.MathUtils.clamp((p - seg.progressStart) / (seg.progressEnd - seg.progressStart), 0, 1);
    return {
      position: seg.start.clone().lerp(seg.end, t),
      yaw: THREE.MathUtils.lerp(seg.yawStart ?? seg.yaw, seg.yawEnd ?? seg.yaw, t),
      pitch: seg.pitch,
      type: seg.type,
      width: seg.width,
      segment: seg,
    };
  }

  isGap(progress) {
    const sample = this.sample(progress);
    return sample.type === 'gap';
  }

  nextCheckpoint(progress) {
    let checkpoint = this.checkpoints[0];
    this.checkpoints.forEach((item) => {
      if (item.progress <= progress) checkpoint = item;
    });
    return checkpoint ?? { progress: 0, sample: this.sample(0) };
  }
}
