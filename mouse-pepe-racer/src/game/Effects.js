import * as THREE from 'three';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.sparks = [];
    this.smoke = [];
    this.sparkMat = new THREE.MeshStandardMaterial({ color: 0xffd44d, emissive: 0xff7a21, emissiveIntensity: 0.9 });
    this.boostMat = new THREE.MeshStandardMaterial({ color: 0x00ffd1, emissive: 0x00ffd1, emissiveIntensity: 1.2 });
    this.smokeMat = new THREE.MeshStandardMaterial({ color: 0x2b2c2d, transparent: true, opacity: 0.62, roughness: 1 });
  }

  addCrashBurst(position) {
    for (let i = 0; i < 12; i += 1) {
      const spark = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), this.sparkMat);
      spark.position.copy(position);
      spark.userData.life = 0.7;
      spark.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 8, (Math.random() - 0.5) * 12);
      this.scene.add(spark);
      this.sparks.push(spark);
    }
  }

  addBoostBurst(position) {
    for (let i = 0; i < 18; i += 1) {
      const spark = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.42), this.boostMat);
      spark.position.copy(position);
      spark.userData.life = 0.55;
      spark.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 4, (Math.random() - 0.5) * 8);
      this.scene.add(spark);
      this.sparks.push(spark);
    }
  }

  addDamageSmoke(position, damage = 0.5) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.42 + damage * 0.35, 12, 8), this.smokeMat.clone());
    puff.position.copy(position);
    puff.position.y += 1.6;
    puff.userData.life = 0.9 + damage * 0.45;
    puff.userData.maxLife = puff.userData.life;
    puff.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 1.4, 1.9 + damage * 1.5, (Math.random() - 0.5) * 1.4);
    this.scene.add(puff);
    this.smoke.push(puff);
  }

  update(dt) {
    this.sparks = this.sparks.filter((spark) => {
      spark.userData.life -= dt;
      spark.position.addScaledVector(spark.userData.velocity, dt);
      spark.userData.velocity.y -= 16 * dt;
      spark.scale.setScalar(Math.max(0.05, spark.userData.life));
      if (spark.userData.life <= 0) {
        this.scene.remove(spark);
        return false;
      }
      return true;
    });

    this.smoke = this.smoke.filter((puff) => {
      puff.userData.life -= dt;
      puff.position.addScaledVector(puff.userData.velocity, dt);
      puff.userData.velocity.y += 0.35 * dt;
      const age = 1 - puff.userData.life / puff.userData.maxLife;
      puff.scale.setScalar(1 + age * 2.3);
      puff.material.opacity = Math.max(0, 0.62 * (1 - age));
      if (puff.userData.life <= 0) {
        this.scene.remove(puff);
        puff.material.dispose();
        return false;
      }
      return true;
    });
  }
}
