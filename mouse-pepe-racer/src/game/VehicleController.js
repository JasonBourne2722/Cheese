import * as THREE from 'three';

const COLORS = {
  ETH: 0x7b45ff,
  SOL: 0x00ffd1,
};

export class VehicleController {
  constructor({ scene, track, name, lane = 0, ai = false }) {
    this.scene = scene;
    this.track = track;
    this.name = name;
    this.ai = ai;
    this.progress = 15;
    this.lane = lane;
    this.speed = 0;
    this.verticalSpeed = 0;
    this.airborne = false;
    this.pitch = 0;
    this.headingOffset = 0;
    this.damage = 0;
    this.maxDamage = 2.6;
    this.smokeTimer = 0;
    this.collisionCooldown = 0;
    this.steerVisual = 0;
    this.wheelSpin = 0;
    this.boostTimer = 0;
    this.lastCheckpoint = 0;
    this.lastRampId = null;
    this.justLaunched = false;
    this.mesh = this.createMesh(COLORS[name] ?? 0xffffff);
    this.damageParts = this.mesh.userData.damageParts;
    this.scene.add(this.mesh);
    this.reset(0, lane);
  }

  createMesh(accent) {
    const group = new THREE.Group();
    group.userData.wheels = [];
    group.userData.frontWheels = [];
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.45, metalness: 0.36 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.55, roughness: 0.28 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.05, 2.15), bodyMat);
    chassis.position.y = 1.05;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.0, 1.9), bodyMat);
    cab.position.set(0.65, 1.82, 0);
    const sideGlow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 1.86), accentMat);
    sideGlow.position.set(2.22, 1.12, 0);
    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.58, 1.42), new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.38, metalness: 0.6 }));
    grill.position.set(2.28, 1.18, 0);
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfff2c2, emissive: 0xffd45c, emissiveIntensity: 1.2, roughness: 0.18 });
    const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.24, 0.34), headlightMat);
    leftLight.position.set(2.36, 1.28, 0.58);
    const rightLight = leftLight.clone();
    rightLight.position.z = -0.58;
    const rearSpoiler = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 2.35), accentMat);
    rearSpoiler.position.set(-2.0, 1.82, 0);
    group.add(chassis, cab, sideGlow, grill, leftLight, rightLight, rearSpoiler);

    const dentMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.85, metalness: 0.15 });
    const dents = [
      [2.31, 1.3, 0, 0.82, 0.42, 0.06],
      [0.25, 1.62, 1.09, 0.68, 0.3, 0.05],
      [-1.28, 1.08, -1.1, 0.62, 0.34, 0.05],
    ].map(([x, y, z, sx, sy, sz]) => {
      const dent = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), dentMat);
      dent.position.set(x, y, z);
      dent.visible = false;
      group.add(dent);
      return dent;
    });
    group.userData.damageParts = dents;

    [[-1.6, 0.35, 1.24], [1.6, 0.35, 1.24], [-1.6, 0.35, -1.24], [1.6, 0.35, -1.24]].forEach(([x, y, z]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      const roll = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.5, 28), new THREE.MeshStandardMaterial({ color: 0x0a0908, roughness: 0.9 }));
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.56, 18), accentMat);
      tire.rotation.x = Math.PI / 2;
      rim.rotation.x = Math.PI / 2;
      roll.add(tire, rim);
      pivot.add(roll);
      group.add(pivot);
      group.userData.wheels.push(roll);
      if (x > 0) group.userData.frontWheels.push(pivot);
    });

    this.addDriver(group, accent);
    this.addIdentity(group, accent);
    return group;
  }

  addDriver(group, accent) {
    const mouse = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshStandardMaterial({ color: 0x50c042, roughness: 0.62 }));
    head.position.y = 3.05;
    const earMat = new THREE.MeshStandardMaterial({ color: 0xdba083, roughness: 0.72 });
    const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), earMat);
    leftEar.position.set(-0.32, 3.42, 0.04);
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.32;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.58, 5, 10), new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.7 }));
    body.position.y = 2.48;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.12), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.8 }));
    visor.position.set(0, 3.05, 0.44);
    mouse.add(body, head, leftEar, rightEar, visor);
    mouse.rotation.y = Math.PI / 2;
    group.add(mouse);
  }

  addIdentity(group, accent) {
    if (this.name === 'ETH') {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: accent, emissiveIntensity: 0.75 });
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.62, 4), mat);
      top.rotation.y = Math.PI / 4;
      top.position.set(0.55, 2.55, 0);
      const bottom = top.clone();
      bottom.rotation.z = Math.PI;
      bottom.position.y = 2.38;
      group.add(top, bottom);
    } else {
      [0x9945ff, 0x14f195, 0x00ffd1].forEach((color, index) => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 0.16), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7 }));
        stripe.position.set(0.58, 2.54 - index * 0.13, (index - 1) * 0.28);
        group.add(stripe);
      });
    }
  }

  reset(progress = this.lastCheckpoint, lane = 0) {
    this.progress = progress;
    this.lane = lane;
    this.speed = 0;
    this.verticalSpeed = 0;
    this.airborne = false;
    this.pitch = 0;
    this.headingOffset = 0;
    this.damage = 0;
    this.smokeTimer = 0;
    this.collisionCooldown = 0;
    this.boostTimer = 0;
    this.lastRampId = null;
    this.updateDamageVisuals();
    this.placeOnTrack();
  }

  update(input, dt, effects = null) {
    if (this.ai) input = this.getAiInput();
    const throttle = (input.gas ? 1 : 0) - (input.brake ? 1 : 0);
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const sample = this.track.sample(this.progress);
    const turnRate = Math.abs(sample.segment?.turnRate ?? 0);
    const sharp = turnRate > 0.008 || ['sharpLeft', 'sharpRight'].includes(sample.type);
    this.boostTimer = Math.max(0, this.boostTimer - dt);
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    const rocketBoost = this.boostTimer > 0;
    const accel = input.boost || rocketBoost ? 42 : 25;
    this.speed += throttle * accel * dt;
    if (rocketBoost) this.speed += 21 * dt;
    this.speed *= throttle === 0 ? 0.985 : 0.996;
    if (input.brake && Math.abs(steer) > 0) this.speed *= 0.985;
    this.speed = THREE.MathUtils.clamp(this.speed, -8, rocketBoost ? 36 : this.ai ? 30 : 31);

    const steerRate = (1.15 + Math.min(Math.abs(this.speed), 28) * 0.035) * (sharp ? 1.18 : 1);
    this.headingOffset += steer * steerRate * dt;
    this.headingOffset *= steer === 0 ? Math.pow(0.72, dt) : 1;
    this.headingOffset = THREE.MathUtils.clamp(this.headingOffset, -0.92, 0.92);

    const forwardSpeed = Math.max(-4, this.speed);
    this.progress += forwardSpeed * Math.cos(this.headingOffset) * dt;
    this.lane += forwardSpeed * Math.sin(this.headingOffset) * dt;

    const nextSample = this.track.sample(this.progress);
    const rampId = nextSample.type === 'ramp' ? nextSample.segment?.id : null;
    if (!this.airborne && rampId !== null && rampId !== this.lastRampId && nextSample.pitch > 0.03 && this.speed > 17) {
      this.verticalSpeed = THREE.MathUtils.clamp(this.speed * 0.24, 5.4, 10.8);
      this.airborne = true;
      this.lastRampId = rampId;
    }
    if (rampId === null && !this.airborne) {
      this.lastRampId = null;
    }
    if (!this.airborne && this.track.isGap(this.progress)) {
      this.crashed = true;
      return;
    }

    if (this.airborne) {
      this.verticalSpeed -= 28 * dt;
      this.pitch += (input.brake ? 3.2 : input.gas ? -1.25 : 0) * dt;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -0.48, 0.62);
      this.mesh.position.y += this.verticalSpeed * dt;
      if (!this.track.isGap(this.progress) && this.mesh.position.y <= nextSample.position.y + 1.75) {
        this.airborne = false;
        this.verticalSpeed = 0;
        this.pitch *= 0.35;
      }
      if (this.mesh.position.y < -7) this.crashed = true;
    }

    const wallLimit = sample.width * 0.5 - 1.15;
    if (!this.airborne && Math.abs(this.lane) > wallLimit) {
      this.hitWall(Math.sign(this.lane), wallLimit, effects);
    }

    if (Math.abs(this.lane) > sample.width * 0.5 + 4 || this.progress < 0 || this.progress > this.track.totalLength) {
      this.crashed = true;
    }

    if (this.damage / this.maxDamage > 0.42 && effects) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        effects.addDamageSmoke(this.mesh.position, this.damage / this.maxDamage);
        this.smokeTimer = THREE.MathUtils.lerp(0.36, 0.12, Math.min(this.damage / this.maxDamage, 1));
      }
    }

    this.placeOnTrack();
    this.animateWheels(steer, dt);
  }

  hitWall(side, wallLimit, effects) {
    const impact = Math.abs(this.speed) * (0.55 + Math.abs(this.headingOffset));
    this.lane = side * wallLimit;
    this.headingOffset *= -0.42;
    this.speed *= impact > 17 ? 0.34 : 0.55;
    this.pitch += 0.08 * side;
    this.damage = Math.min(this.maxDamage, this.damage + THREE.MathUtils.mapLinear(impact, 8, 30, 0.1, 0.32));
    this.updateDamageVisuals();
    if (effects) effects.addCrashBurst(this.mesh.position);
    if (this.damage >= this.maxDamage) this.crashed = true;
    this.collisionCooldown = 0.18;
  }

  hitVehicle(side, force, effects) {
    this.lane += side * THREE.MathUtils.clamp(force * 0.035, 0.35, 1.4);
    this.headingOffset += side * THREE.MathUtils.clamp(force * 0.018, 0.08, 0.32);
    this.headingOffset = THREE.MathUtils.clamp(this.headingOffset, -0.92, 0.92);
    this.speed *= THREE.MathUtils.clamp(1 - force * 0.015, 0.58, 0.9);
    this.damage = Math.min(this.maxDamage, this.damage + THREE.MathUtils.mapLinear(force, 6, 32, 0.05, 0.24));
    this.updateDamageVisuals();
    this.collisionCooldown = 0.28;
    if (effects) {
      effects.addCrashBurst(this.mesh.position);
      if (force > 15) effects.addDamageSmoke(this.mesh.position, this.damage / this.maxDamage);
    }
    if (this.damage >= this.maxDamage) this.crashed = true;
  }

  updateDamageVisuals() {
    const damageRatio = this.damage / this.maxDamage;
    this.damageParts?.forEach((part, index) => {
      part.visible = damageRatio > 0.14 + index * 0.18;
      part.scale.setScalar(0.75 + damageRatio * 0.7);
    });
  }

  applyRocketBoost(duration = 2.2) {
    this.boostTimer = Math.max(this.boostTimer, duration);
    this.speed = Math.max(this.speed, 18);
  }

  placeOnTrack() {
    const sample = this.track.sample(this.progress);
    const lateral = new THREE.Vector3(-Math.sin(sample.yaw), 0, Math.cos(sample.yaw)).multiplyScalar(this.lane);
    const target = sample.position.clone().add(lateral);
    if (!this.airborne) target.y += 1.75;
    this.mesh.position.copy(this.airborne ? new THREE.Vector3(target.x, this.mesh.position.y || target.y, target.z) : target);
    this.mesh.rotation.set(this.pitch + sample.pitch * 0.8, -(sample.yaw + this.headingOffset), THREE.MathUtils.clamp(-this.headingOffset * 0.18, -0.18, 0.18));
  }

  animateWheels(steer, dt) {
    this.wheelSpin -= this.speed * dt * 2.8;
    this.steerVisual += (steer * 0.48 - this.steerVisual) * Math.min(1, dt * 12);
    this.mesh.userData.wheels.forEach((roll) => { roll.rotation.z = this.wheelSpin; });
    this.mesh.userData.frontWheels.forEach((pivot) => { pivot.rotation.y = this.steerVisual; });
  }

  getAiInput() {
    const sample = this.track.sample(this.progress + 36);
    const desiredLane = sample.type.includes?.('sharp') ? -Math.sign(sample.yaw) * 4.4 : Math.sin(this.progress * 0.017) * 3.1;
    const corner = Math.abs(sample.segment?.turnRate ?? 0);
    return {
      gas: this.speed < (corner > 0.011 ? 24 : 30),
      brake: corner > 0.014 && this.speed > 26,
      left: this.lane > desiredLane + 0.45,
      right: this.lane < desiredLane - 0.45,
      boost: sample.type === 'ramp' || this.boostTimer > 0,
    };
  }
}
