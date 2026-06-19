// 3D backdrop for the Soulcasting puzzle. The 2D overlay keeps the actual
// gem-choice UI; behind it a great crystal turns slowly above a stone dais,
// brightening from stone toward Stormlight glow as the transformation takes,
// with motes of light spiralling inward while the player channels.

import { THREE, COLORS, addLights, makeGlow, makeParticles } from "./presenterUtils.js";

export class SoulcastPresenter {
  constructor() {
    this.three = new THREE.Scene();
    this._built = false;
    this._t = 0;
  }

  sync(scene, camera, dt) {
    if (!this._built) this._build();
    this._t += dt;

    const cur = scene.current;
    const p = cur ? cur.progress() : 1;

    // Crystal morphs stone -> glow with progress and spins faster as it takes.
    this._crystal.rotation.y += dt * (0.3 + p * 1.2);
    this._crystal.rotation.x = Math.sin(this._t * 0.4) * 0.15;
    this._crystalMat.color.lerpColors(this._stoneColor, this._glowColor, p);
    this._crystalMat.emissive.copy(this._glowColor).multiplyScalar(p * 0.7);
    this._halo.material.opacity = 0.15 + p * 0.6;
    this._halo.scale.setScalar(120 + p * 90);

    // Motes orbit inward; speed reflects channelling progress.
    this._motes.rotation.y -= dt * (0.15 + p * 0.8);

    camera.position.set(Math.sin(this._t * 0.1) * 40, 60, 360);
    camera.lookAt(0, 70, 0);
  }

  _build() {
    this._built = true;
    this.three.background = new THREE.Color(COLORS.bgDeep);
    this.three.fog = new THREE.Fog(COLORS.bgDeep, 500, 1400);
    addLights(this.three, { ambient: 0.55 });

    // Stone dais.
    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(150, 190, 30, 24),
      new THREE.MeshLambertMaterial({ color: COLORS.stone })
    );
    dais.position.y = -40;
    this.three.add(dais);

    // The object being Soulcast: a large faceted crystal.
    this._stoneColor = new THREE.Color(COLORS.stone);
    this._glowColor = new THREE.Color(COLORS.glow);
    this._crystalMat = new THREE.MeshLambertMaterial({ color: COLORS.stone, emissive: 0x000000 });
    this._crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(55, 0), this._crystalMat);
    this._crystal.position.y = 80;
    this.three.add(this._crystal);

    this._halo = makeGlow(COLORS.blue, 140, 0.2);
    this._halo.position.y = 80;
    this.three.add(this._halo);

    // Spiralling Stormlight motes.
    this._motes = makeParticles(220, COLORS.glow, { x: 420, y: 260, z: 420 }, 6, 0.5);
    this._motes.position.y = -20;
    this.three.add(this._motes);
  }
}
