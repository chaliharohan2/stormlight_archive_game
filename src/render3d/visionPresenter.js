// 3D backdrop for Dalinar's highstorm visions: a slow cyclone of stormlight
// motes wheeling around a radiant core. The core warms from cold blue toward
// gold as accrued honor rises, so choices visibly change the storm's mood.
// All text/choices stay on the 2D overlay.

import { THREE, COLORS, makeGlow, makeParticles } from "./presenterUtils.js";

export class VisionPresenter {
  constructor() {
    this.three = new THREE.Scene();
    this._built = false;
    this._t = 0;
  }

  sync(scene, camera, dt) {
    if (!this._built) this._build();
    this._t += dt;

    // Honor in [0,1] warms the storm core blue -> gold.
    const max = Math.max(1, scene.seq.maxHonor());
    const frac = Math.max(0, Math.min(1, scene.seq.honor / max));
    this._coreColor.lerpColors(this._cold, this._warm, frac);
    this._core.material.color.copy(this._coreColor);
    this._core.material.opacity = 0.55 + 0.25 * Math.sin(this._t * 1.4);

    this._rings.forEach((ring, i) => {
      ring.rotation.y += dt * (0.05 + i * 0.04) * (i % 2 ? -1 : 1);
      ring.position.y = 40 + Math.sin(this._t * 0.5 + i) * 18;
    });

    camera.position.set(Math.sin(this._t * 0.07) * 90, 40 + Math.sin(this._t * 0.21) * 14, 420);
    camera.lookAt(0, 40, 0);
  }

  _build() {
    this._built = true;
    this.three.background = new THREE.Color(0x05060d);
    this.three.fog = new THREE.FogExp2(0x05060d, 0.0012);

    this._cold = new THREE.Color(COLORS.blue);
    this._warm = new THREE.Color(COLORS.gold);
    this._coreColor = this._cold.clone();

    this._core = makeGlow(COLORS.blue, 260, 0.7);
    this._core.position.y = 40;
    this.three.add(this._core);

    const inner = makeGlow(COLORS.white, 90, 0.5);
    inner.position.y = 40;
    this.three.add(inner);

    // Concentric mote rings forming the cyclone wall.
    this._rings = [];
    for (let i = 0; i < 4; i++) {
      const r = 180 + i * 110;
      const ring = makeParticles(260, i % 2 ? COLORS.amethyst : COLORS.glow, { x: r * 2, y: 30, z: r * 2 }, 7, 0.45);
      // Reshape the box scatter into a band: push points out to the ring radius.
      const pos = ring.geometry.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const a = Math.random() * Math.PI * 2;
        const rr = r + (Math.random() - 0.5) * 50;
        pos.setXYZ(j, Math.cos(a) * rr, (Math.random() - 0.5) * (90 + i * 40), Math.sin(a) * rr);
      }
      ring.position.y = 40;
      this.three.add(ring);
      this._rings.push(ring);
    }
  }
}
