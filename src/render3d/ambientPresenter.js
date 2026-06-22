// Atmospheric 3D backdrop for menus, narration pages, and the game-over
// screen: a broken stone plain under a night sky, drifting Stormlight spheres,
// and a far stormwall. Game over tints the scene red; everything else keeps
// the cold Stormlight blue. Text renders on the 2D overlay above.

import { THREE, COLORS, addLights, makeGlow, makeParticles } from "./presenterUtils.js";

export class AmbientPresenter {
  constructor() {
    this.three = new THREE.Scene();
    this._built = false;
    this._t = 0;
    this._mode = "";
  }

  sync(scene, camera, dt) {
    if (!this._built) this._build();
    this._t += dt;

    const mode = scene.constructor.name;
    if (mode !== this._mode) {
      this._mode = mode;
      const danger = mode === "GameOverScene";
      this._sky.material.color.setHex(danger ? COLORS.red : COLORS.blue);
      this._sky.material.opacity = danger ? 0.4 : 0.55;
    }

    // Spheres drift and bob; the storm slowly churns.
    this._orbs.forEach((o, i) => {
      o.position.y = o.userData.baseY + Math.sin(this._t * 0.6 + i * 1.7) * 9;
      o.rotation.y += dt * 0.4;
    });
    this._storm.rotation.y += dt * 0.01;

    // A slow orbital drift around the plain.
    const a = this._t * 0.05;
    camera.position.set(Math.sin(a) * 120, 130, 380 + Math.cos(a) * 40);
    camera.lookAt(0, 40, -40);
  }

  _build() {
    this._built = true;
    this.three.background = new THREE.Color(COLORS.bgDeep);
    this.three.fog = new THREE.Fog(COLORS.bgDeep, 600, 1800);
    addLights(this.three, { ambient: 0.6, sun: 1.5, shadows: 0 });

    // Broken stone plain: scattered slabs at slight tilts.
    const slabMat = new THREE.MeshStandardMaterial({ color: COLORS.stone });
    for (let i = 0; i < 26; i++) {
      const w = 60 + (i * 37) % 90;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 14 + (i * 13) % 18, w), slabMat);
      const r = 120 + (i * 67) % 480;
      const ang = i * 2.39996; // golden angle scatter
      slab.position.set(Math.cos(ang) * r, -8, Math.sin(ang) * r - 60);
      slab.rotation.y = i;
      slab.rotation.z = ((i % 5) - 2) * 0.02;
      this.three.add(slab);
    }

    // Floating glowing spheres (money + magic of Roshar).
    this._orbs = [];
    for (let i = 0; i < 7; i++) {
      const group = new THREE.Group();
      const color = i % 3 === 0 ? COLORS.gold : i % 3 === 1 ? COLORS.blue : COLORS.amethyst;
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(6, 10, 10),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7 })
      );
      group.add(orb, makeGlow(color, 50, 0.7));
      const ang = i * 0.9;
      group.position.set(Math.cos(ang) * (90 + i * 38), 0, Math.sin(ang) * (90 + i * 30) - 40);
      group.userData.baseY = 50 + (i * 29) % 70;
      this.three.add(group);
      this._orbs.push(group);
    }

    // The sky glow + distant stormwall.
    this._sky = makeGlow(COLORS.blue, 700, 0.55);
    this._sky.position.set(0, 220, -700);
    this.three.add(this._sky);
    this._storm = makeParticles(420, COLORS.amethyst, { x: 2200, y: 600, z: 300 }, 12, 0.3);
    this._storm.position.set(0, 80, -900);
    this.three.add(this._storm);
  }
}
