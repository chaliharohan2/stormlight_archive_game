// 3D presenter for the bridge run: a chasm between two plateaus, the bridge
// deck spanning it, Bridge Four pounding across as capsule figures, arrow
// volleys falling from the far side, and a Stormlight dome while bracing.
// Terrain props scroll past to sell the sprint while the bridge stays framed.

import {
  THREE,
  COLORS,
  makeFigure,
  makeGlow,
  addLights,
  makeParticles,
} from "./presenterUtils.js";

const SPAN = 320; // bridge length in world units
const ARROWS = 14;

export class BridgePresenter {
  constructor() {
    this.three = new THREE.Scene();
    this._sim = null;
    this._t = 0;
  }

  sync(scene, camera, dt) {
    if (this._sim !== scene.sim) this._build(scene);
    this._t += dt;
    this._syncCrew(scene);
    this._syncArrows(scene);
    this._syncScroll(scene);

    camera.position.set(Math.sin(this._t * 0.13) * 24, 180, 430);
    camera.lookAt(0, 26, 0);
  }

  _build(scene) {
    this._sim = scene.sim;
    this.three.clear();
    this.three.background = new THREE.Color(COLORS.bgDeep);
    this.three.fog = new THREE.Fog(COLORS.bgDeep, 800, 2200);
    addLights(this.three, { sunColor: 0x9fb6e0 });

    const slabGeo = new THREE.BoxGeometry(1100, 240, 900);
    const slabMat = new THREE.MeshStandardMaterial({ color: COLORS.stone });
    const near = new THREE.Mesh(slabGeo, slabMat);
    near.position.set(-(SPAN / 2 + 550), -120, 0);
    near.receiveShadow = true;
    const far = new THREE.Mesh(slabGeo, slabMat);
    far.position.set(SPAN / 2 + 550, -120, 0);
    far.receiveShadow = true;
    this.three.add(near, far);

    // Chasm floor far below.
    const abyss = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 1600),
      new THREE.MeshBasicMaterial({ color: COLORS.chasm })
    );
    abyss.rotation.x = -Math.PI / 2;
    abyss.position.y = -380;
    this.three.add(abyss);

    // The bridge: planks with gaps plus two rails.
    const deck = new THREE.Group();
    const plankMat = new THREE.MeshStandardMaterial({ color: COLORS.wood });
    const railMat = new THREE.MeshStandardMaterial({ color: COLORS.woodLight });
    const planks = 12;
    for (let i = 0; i < planks; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(SPAN / planks - 3, 6, 90), plankMat);
      p.position.set(-SPAN / 2 + (i + 0.5) * (SPAN / planks), 8, 0);
      p.receiveShadow = true;
      deck.add(p);
    }
    for (const z of [-48, 48]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(SPAN, 4, 6), railMat);
      rail.position.set(0, 14, z);
      deck.add(rail);
    }
    this.three.add(deck);

    // Scrolling outcrops on both plateaus to convey forward motion.
    this._props = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({ color: COLORS.stoneLight });
    for (let i = 0; i < 16; i++) {
      const w = 30 + (i * 37) % 50;
      const rock = new THREE.Mesh(new THREE.BoxGeometry(w, 24 + (i * 23) % 40, w), rockMat);
      rock.userData.baseX = -900 + i * 120;
      rock.position.set(rock.userData.baseX, 12, i % 2 ? -240 - (i * 31) % 160 : 220 + (i * 47) % 160);
      this._props.add(rock);
    }
    this.three.add(this._props);

    // Distant stormwall behind the far plateau.
    const storm = makeParticles(300, COLORS.amethyst, { x: 2600, y: 500, z: 200 }, 14, 0.35);
    storm.position.set(0, 60, -700);
    this.three.add(storm);

    // Crew figures (rebuilt per run so retry resets cleanly).
    this._crew = scene.sim.crew.map((m, i) => {
      const isLead = i === scene.sim.crew.length - 1;
      const fig = makeFigure(isLead ? COLORS.blue : 0x6f7fb0, { height: 22, radius: 5 });
      this.three.add(fig);
      return fig;
    });
    this._leadGlow = makeGlow(COLORS.blue, 58, 0);
    this._leadGlow.position.y = 14;
    this._crew[this._crew.length - 1].add(this._leadGlow);

    // Brace dome over the crew.
    this._dome = new THREE.Mesh(
      new THREE.SphereGeometry(190, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: COLORS.blue, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    this._dome.position.set(0, 10, 0);
    this.three.add(this._dome);

    // Arrow volley pool.
    this._arrows = [];
    const arrowMat = new THREE.MeshBasicMaterial({ color: COLORS.parshendi });
    for (let i = 0; i < ARROWS; i++) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 18, 5), arrowMat);
      a.rotation.z = 0.12;
      a.visible = false;
      this.three.add(a);
      this._arrows.push(a);
    }
  }

  _syncCrew(scene) {
    const crew = scene.sim.crew;
    const slotW = SPAN / crew.length;
    crew.forEach((m, i) => {
      const fig = this._crew[i];
      if (!fig) return;
      fig.visible = m.alive;
      if (!m.alive) return;
      const bob = Math.abs(Math.sin(scene._scroll * 0.12 + i * 1.3)) * 4;
      fig.position.set(-SPAN / 2 + slotW * (i + 0.5), 11 + bob, i % 2 ? 16 : -16);
      fig.rotation.y = Math.PI / 2; // running toward +x
    });
    const bracing = scene._braceGlow > 0.05;
    this._leadGlow.material.opacity = scene._braceGlow * 0.9;
    this._dome.material.opacity = bracing ? 0.14 * scene._braceGlow : 0;
  }

  _syncArrows(scene) {
    const flash = scene._volleyFlash;
    if (flash <= 0) {
      for (const a of this._arrows) a.visible = false;
      return;
    }
    const fall = (0.35 - flash) / 0.35; // 0..1
    this._arrows.forEach((a, i) => {
      a.visible = true;
      const x = -SPAN / 2 + ((i * 53 + scene.sim.volleys * 17) % SPAN);
      const z = ((i * 71) % 80) - 40;
      a.position.set(x, 240 - fall * 215, z);
    });
  }

  _syncScroll(scene) {
    for (const rock of this._props.children) {
      let x = rock.userData.baseX - (scene._scroll % 1920);
      if (x < -1000) x += 1920;
      rock.position.x = x;
    }
  }
}
