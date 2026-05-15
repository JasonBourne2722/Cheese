import * as THREE from 'three';
import { TrackSystem } from './TrackSystem.js';
import { CityEnvironment } from './CityEnvironment.js';
import { VehicleController } from './VehicleController.js';
import { Checkpoints } from './Checkpoints.js';
import { Effects } from './Effects.js';

export class MonsterRallyGame {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.clock = new THREE.Clock();
    this.input = {
      gas: false,
      brake: false,
      left: false,
      right: false,
      gas2: false,
      brake2: false,
      left2: false,
      right2: false,
    };
    this.playerMode = 1;
    this.raceFinished = false;
    this.ui = {
      ethSpeed: document.querySelector('#eth-speed'),
      solSpeed: document.querySelector('#sol-speed'),
      coins: document.querySelector('#coins'),
      position: document.querySelector('#position'),
      message: document.querySelector('#message'),
    };
  }

  start() {
    this.setupScene();
    this.track = new TrackSystem(this.scene).build();
    this.city = new CityEnvironment(this.scene, this.track);
    this.city.build();
    this.effects = new Effects(this.scene);
    this.checkpoints = new Checkpoints(this.track);
    this.createRacers();
    this.createRocketPickups();
    this.bindKeys();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x566873);
    this.scene.fog = new THREE.Fog(0x566873, 70, 420);
    this.camera = new THREE.PerspectiveCamera(46, this.width / this.height, 0.1, 1200);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.prepend(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xa9c8d4, 0x211613, 1.3);
    const sun = new THREE.DirectionalLight(0xffe1b9, 2.6);
    sun.position.set(-20, 38, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const neon = new THREE.PointLight(0x00ffd1, 1.8, 90);
    neon.position.set(60, 18, -24);
    this.scene.add(hemi, sun, neon);
  }

  createRacers() {
    this.player = new VehicleController({ scene: this.scene, track: this.track, name: 'ETH', lane: -3 });
    this.rival = new VehicleController({ scene: this.scene, track: this.track, name: 'SOL', lane: 3, ai: this.playerMode === 1 });
    this.racers = [this.player, this.rival];
    this.showMessage('RACE START!', 1200);
  }

  createRocketPickups() {
    this.rocketTexture = this.createEmojiTexture('🚀');
    this.rocketPickups = this.track.rocketPickups.map((pickup) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.rocketTexture,
        transparent: true,
        depthWrite: false,
      }));
      sprite.scale.set(5.2, 5.2, 1);
      sprite.userData = {
        progress: pickup.progress,
        lane: pickup.lane,
        cooldown: 0,
      };
      this.scene.add(sprite);
      return sprite;
    });
    this.updateRocketVisuals(0);
  }

  createEmojiTexture(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '112px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, canvas.width / 2, canvas.height / 2 + 4);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  setInput(action, active) {
    if (action in this.input) this.input[action] = active;
  }

  clearInputs() {
    Object.keys(this.input).forEach((key) => { this.input[key] = false; });
  }

  setPlayerMode(mode) {
    this.playerMode = mode === 2 ? 2 : 1;
    this.rival.ai = this.playerMode === 1;
    this.showMessage(this.playerMode === 1 ? 'AI RIVAL ENABLED' : '2 PLAYER MODE', 1000);
    this.restartRace();
  }

  restartRace() {
    this.clearInputs();
    this.raceFinished = false;
    this.player.reset(0, -3);
    this.rival.reset(0, 3);
    this.rival.ai = this.playerMode === 1;
    this.rocketPickups?.forEach((rocket) => {
      rocket.userData.cooldown = 0;
      rocket.visible = true;
    });
    this.showMessage('CHECKPOINT RESET', 900);
  }

  bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) this.setInput('gas', true);
      if (['ArrowDown', 's', 'S'].includes(e.key)) this.setInput('brake', true);
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.setInput('left', true);
      if (['ArrowRight', 'd', 'D'].includes(e.key)) this.setInput('right', true);
      if (['i', 'I'].includes(e.key)) this.setInput('gas2', true);
      if (['k', 'K'].includes(e.key)) this.setInput('brake2', true);
      if (['j', 'J'].includes(e.key)) this.setInput('left2', true);
      if (['l', 'L'].includes(e.key)) this.setInput('right2', true);
      if (e.key === 'r' || e.key === 'R') this.restartRace();
    });
    window.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) this.setInput('gas', false);
      if (['ArrowDown', 's', 'S'].includes(e.key)) this.setInput('brake', false);
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.setInput('left', false);
      if (['ArrowRight', 'd', 'D'].includes(e.key)) this.setInput('right', false);
      if (['i', 'I'].includes(e.key)) this.setInput('gas2', false);
      if (['k', 'K'].includes(e.key)) this.setInput('brake2', false);
      if (['j', 'J'].includes(e.key)) this.setInput('left2', false);
      if (['l', 'L'].includes(e.key)) this.setInput('right2', false);
    });
    window.addEventListener('blur', () => this.clearInputs());
  }

  update(dt) {
    if (this.raceFinished) return;
    this.player.update({
      gas: this.input.gas,
      brake: this.input.brake,
      left: this.input.left,
      right: this.input.right,
      boost: this.input.gas && this.track.sample(this.player.progress).type === 'ramp',
    }, dt, this.effects);

    this.rival.ai = this.playerMode === 1;
    this.rival.update({
      gas: this.input.gas2,
      brake: this.input.brake2,
      left: this.input.left2,
      right: this.input.right2,
      boost: this.input.gas2 && this.track.sample(this.rival.progress).type === 'ramp',
    }, dt, this.effects);

    this.updateVehicleCollisions();
    this.updateRocketPickups(dt);

    this.racers.forEach((racer) => {
      if (this.checkpoints.update(racer)) {
        this.effects.addCrashBurst(racer.mesh.position);
        if (racer === this.player) this.showMessage('CRASH! CHECKPOINT!', 900);
      }
    });

    const winner = this.racers.find((racer) => racer.progress >= this.track.totalLength - 18);
    if (winner) {
      this.raceFinished = true;
      this.showMessage(`${winner.name} WINS!`, 0);
    }
  }

  updateRocketPickups(dt) {
    this.rocketPickups.forEach((rocket) => {
      rocket.userData.cooldown = Math.max(0, rocket.userData.cooldown - dt);
      rocket.visible = rocket.userData.cooldown <= 0;

      if (!rocket.visible) return;
      this.racers.forEach((racer) => {
        const progressDelta = Math.abs(racer.progress - rocket.userData.progress);
        const laneDelta = Math.abs(racer.lane - rocket.userData.lane);
        if (progressDelta < 8 && laneDelta < 3.4) {
          racer.applyRocketBoost(2.35);
          rocket.userData.cooldown = 7;
          rocket.visible = false;
          this.effects.addBoostBurst(racer.mesh.position);
          if (racer === this.player) this.showMessage('ROCKET NITRO!', 800);
        }
      });
    });
  }

  updateVehicleCollisions() {
    const [a, b] = this.racers;
    if (!a || !b || a.airborne || b.airborne || a.collisionCooldown > 0 || b.collisionCooldown > 0) return;

    const progressDelta = a.progress - b.progress;
    const laneDelta = a.lane - b.lane;
    const overlapProgress = 5.2 - Math.abs(progressDelta);
    const overlapLane = 3.4 - Math.abs(laneDelta);
    if (overlapProgress <= 0 || overlapLane <= 0) return;

    const side = laneDelta === 0 ? (a.name < b.name ? -1 : 1) : Math.sign(laneDelta);
    const closingSpeed = Math.abs(a.speed - b.speed) + Math.abs(a.headingOffset - b.headingOffset) * 18;
    const force = Math.max(7, closingSpeed + overlapProgress * 1.8 + overlapLane * 2.2);
    const shove = Math.min(1.8, overlapLane * 0.42);

    a.lane += side * shove;
    b.lane -= side * shove;
    a.hitVehicle(side, force, this.effects);
    b.hitVehicle(-side, force, this.effects);

    const averageSpeed = (a.speed + b.speed) * 0.5;
    a.speed = THREE.MathUtils.lerp(a.speed, averageSpeed, 0.22);
    b.speed = THREE.MathUtils.lerp(b.speed, averageSpeed, 0.22);
  }

  updateRocketVisuals(time) {
    this.rocketPickups?.forEach((rocket, index) => {
      const sample = this.track.sample(rocket.userData.progress);
      const lateral = new THREE.Vector3(-Math.sin(sample.yaw), 0, Math.cos(sample.yaw)).multiplyScalar(rocket.userData.lane);
      rocket.position.copy(sample.position).add(lateral);
      rocket.position.y += 4.3 + Math.sin(time * 0.004 + index) * 0.45;
      rocket.material.rotation = Math.sin(time * 0.003 + index) * 0.18;
    });
  }

  updateCamera(dt) {
    const sample = this.track.sample(this.player.progress);
    const forward = new THREE.Vector3(Math.cos(sample.yaw), 0, Math.sin(sample.yaw));
    const behind = forward.clone().multiplyScalar(-14.5);
    const lift = this.player.airborne ? 10 : 7.1;
    const desired = this.player.mesh.position.clone().add(behind).add(new THREE.Vector3(0, lift, 0));
    this.camera.position.lerp(desired, Math.min(1, dt * 6.4));
    const look = this.player.mesh.position.clone().add(forward.multiplyScalar(10)).add(new THREE.Vector3(0, 2.0, 0));
    this.camera.lookAt(look);
  }

  updateHud() {
    this.ui.ethSpeed.textContent = `${Math.abs(this.player.speed * 2.237).toFixed(0)} mph`;
    this.ui.solSpeed.textContent = `${Math.abs(this.rival.speed * 2.237).toFixed(0)} mph`;
    const rank = this.player.progress >= this.rival.progress ? 1 : 2;
    this.ui.position.textContent = `${rank} / 2`;
    this.ui.coins.textContent = `${Math.floor((this.player.progress / this.track.totalLength) * 100)}%`;
  }

  showMessage(text, timeout = 0) {
    this.ui.message.textContent = text;
    this.ui.message.classList.add('show');
    if (this.messageTimer) clearTimeout(this.messageTimer);
    if (timeout > 0) {
      this.messageTimer = setTimeout(() => this.ui.message.classList.remove('show'), timeout);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.city.update(performance.now());
    this.effects.update(dt);
    this.updateRocketVisuals(performance.now());
    this.updateCamera(dt);
    this.updateHud();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
}
