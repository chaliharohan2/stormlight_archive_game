// 3D presenter for WorldScene: extrudes the tilemap into floors, walls and
// chasms, mirrors every entity as a small figure or prop, and follows the
// player with a high three-quarter camera. Reads the scene's logic state
// every frame; never writes to it.

import {
  THREE,
  COLORS,
  cssToHex,
  makeFigure,
  makeBlobShadow,
  makeGlow,
  addLights,
  makeParticles,
} from "./presenterUtils.js";
import { CharacterRig } from "./characterRig.js";
import { worldMaterial } from "./texturePack.js";

const WALL_H = 56;
const PLAYER_SIZE = 22; // mirrors worldScene.js

export class WorldPresenter {
  constructor() {
    this.three = new THREE.Scene();
    this._map = null;
    this._meshes = new Map(); // entity object -> mesh/group
    this._player = null;
    this._t = 0;
  }

  sync(scene, camera, dt) {
    if (this._map !== scene.map) this._build(scene);
    this._t += dt;
    this._syncEntities(scene, dt);
    this._syncPlayer(scene, dt);
    this._syncCamera(scene, camera, dt);
  }

  // --- static geometry -------------------------------------------------------

  _build(scene) {
    this._map = scene.map;
    this._meshes.clear();
    this._player = null;
    this.three.clear();

    this.three.background = new THREE.Color(COLORS.bg);
    this.three.fog = new THREE.Fog(COLORS.bg, 700, 1900);
    this._sun = addLights(this.three);

    const map = scene.map;
    const ts = map.tileSize;

    // Classify tiles, then draw each class as one InstancedMesh. Default tiles
    // are white so the PBR texture shows true, with a deterministic brightness
    // jitter to break up the per-tile repeat; custom level colors tint the
    // texture instead.
    const jit = (x, y) => 0.78 + (((x * 7 + y * 13) % 7) / 7) * 0.22;
    const buckets = { floor: [], wall: [], bridge: [] };
    let hasChasm = false;
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const def = map.legend[map.grid[y][x]] ?? {};
        const custom = def.color ? cssToHex(def.color, null) : null;
        const cell = { x, y, color: custom ?? 0xffffff, jitter: custom ? 1 : jit(x, y) };
        if (def.type === "wall" || def.solid) {
          buckets.wall.push(cell);
        } else if (def.type === "chasm") {
          hasChasm = true; // leave a hole; the abyss plane below shows through
        } else if (def.type === "bridge") {
          buckets.bridge.push(cell);
        } else {
          buckets.floor.push(cell);
        }
      }
    }

    const place = (items, geo, cy, material, { cast = false, receive = true } = {}) => {
      if (!items.length) return;
      const mesh = new THREE.InstancedMesh(geo, material, items.length);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      const m = new THREE.Matrix4();
      const c = new THREE.Color();
      items.forEach((t, i) => {
        m.makeTranslation((t.x + 0.5) * ts, cy, (t.y + 0.5) * ts);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.setHex(t.color).multiplyScalar(t.jitter));
      });
      this.three.add(mesh);
    };

    place(buckets.floor, new THREE.BoxGeometry(ts, 8, ts), -4, worldMaterial("floor"));
    place(buckets.wall, new THREE.BoxGeometry(ts, WALL_H, ts), WALL_H / 2 - 8, worldMaterial("wall"), { cast: true });
    place(buckets.bridge, new THREE.BoxGeometry(ts, 6, ts), -3, worldMaterial("wood"), { cast: true });

    if (hasChasm) {
      // The abyss far below, plus drifting dust to give the drop depth.
      const abyss = new THREE.Mesh(
        new THREE.PlaneGeometry(map.width * 2, map.height * 2),
        new THREE.MeshBasicMaterial({ color: COLORS.chasm })
      );
      abyss.rotation.x = -Math.PI / 2;
      abyss.position.set(map.width / 2, -160, map.height / 2);
      this.three.add(abyss);
      const dust = makeParticles(120, COLORS.dim, { x: map.width, y: 120, z: map.height }, 3, 0.25);
      dust.position.set(map.width / 2, -140, map.height / 2);
      this.three.add(dust);
    }
  }

  // --- entities ----------------------------------------------------------------

  /** Give a capsule figure a glTF body that fades in once it loads. */
  _attachRig(m, opts) {
    const capsule = [m.children[0], m.children[1]]; // body + head from makeFigure
    const rig = new CharacterRig(opts);
    m.add(rig.root);
    m.userData.rig = rig;
    m.userData.capsule = capsule;
    m.userData.lastPos = new THREE.Vector3();
  }

  _meshFor(e) {
    let m = this._meshes.get(e);
    if (m) return m;

    if (e.type === "enemy") {
      m = makeFigure(cssToHex(e.color, COLORS.parshendi), { height: 14 + e.h, radius: Math.max(8, e.w / 2.6) });
      m.add(makeBlobShadow(e.w * 0.6));
      this._attachRig(m, { height: 16 + e.h, color: cssToHex(e.color, COLORS.parshendi) });
    } else if (e.type === "npc") {
      m = makeFigure(cssToHex(e.color, 0x6f7fb0));
      m.add(makeBlobShadow());
      this._attachRig(m, { height: 38, color: cssToHex(e.color, 0x6f7fb0) });
    } else if (e.type === "sphere") {
      m = new THREE.Group();
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(5, 10, 10),
        new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.gold, emissiveIntensity: 0.8 })
      );
      orb.position.y = 10;
      const glow = makeGlow(COLORS.gold, 42, 0.8);
      glow.position.y = 10;
      m.add(orb, glow);
      m.userData.bob = orb;
    } else if (e.type === "exit") {
      m = new THREE.Group();
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 16, 90, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: COLORS.green, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
      );
      pillar.position.y = 45;
      const glow = makeGlow(COLORS.green, 56, 0.65);
      glow.position.y = 8;
      m.add(pillar, glow);
      m.userData.pillar = pillar;
    } else if (e.type === "pickup") {
      m = new THREE.Mesh(
        new THREE.BoxGeometry(e.w * 0.8, 12, e.h * 0.8),
        new THREE.MeshStandardMaterial({ color: cssToHex(e.color, COLORS.green) })
      );
      m.position.y = 6;
      const wrap = new THREE.Group();
      wrap.add(m);
      m = wrap;
    } else if (e.type === "sign") {
      m = new THREE.Group();
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(4, 22, 4),
        new THREE.MeshStandardMaterial({ color: COLORS.wood })
      );
      post.position.y = 11;
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(20, 12, 3),
        new THREE.MeshStandardMaterial({ color: cssToHex(e.color, 0xcaa46b) })
      );
      board.position.y = 24;
      m.add(post, board);
    } else if (e.type === "decoration") {
      m = new THREE.Mesh(
        new THREE.BoxGeometry(e.w, Math.max(10, Math.min(e.w, e.h)), e.h),
        new THREE.MeshStandardMaterial({ color: cssToHex(e.color, COLORS.stone) })
      );
      m.position.y = Math.max(10, Math.min(e.w, e.h)) / 2;
      const wrap = new THREE.Group();
      wrap.add(m);
      m = wrap;
    } else {
      m = new THREE.Group();
    }

    this._meshes.set(e, m);
    this.three.add(m);
    return m;
  }

  _syncEntities(scene, dt) {
    for (const e of scene.entities) {
      const m = this._meshFor(e);
      m.visible = !e._dead;
      if (!m.visible) continue;
      m.position.set(e.x + e.w / 2, 0, e.y + e.h / 2);

      // Face travel direction, animate, and swap capsule -> model once loaded.
      const rig = m.userData.rig;
      if (rig) {
        const moving = m.position.distanceTo(m.userData.lastPos) > 0.4;
        if (moving) {
          const d = m.position.clone().sub(m.userData.lastPos);
          m.rotation.y = Math.atan2(d.x, d.z);
        }
        m.userData.lastPos.copy(m.position);
        rig.update(dt, moving);
        if (rig.ready) {
          for (const c of m.userData.capsule) c.visible = false;
          if (e.type === "enemy") rig.setEmissive(e._flash > 0 ? 0xffffff : 0x000000);
        }
      }

      if (e.type === "sphere" && m.userData.bob) {
        m.userData.bob.position.y = 10 + Math.sin(this._t * 3 + e.x) * 2.5;
      }
      if (e.type === "exit" && m.userData.pillar) {
        m.userData.pillar.rotation.y += 0.01;
      }
      if (e.type === "enemy" && m.userData.material) {
        m.userData.material.emissive.setHex(e._flash > 0 ? 0xffffff : m.userData.baseEmissive);
      }
    }
  }

  // --- player ------------------------------------------------------------------

  _syncPlayer(scene, dt) {
    if (!this._player) {
      const fig = makeFigure(0x5b8dd9);
      const capsule = [fig.children[0], fig.children[1]]; // body + head
      fig.add(makeBlobShadow());
      const glow = makeGlow(COLORS.blue, 40, 0.0);
      glow.position.y = 16;
      fig.add(glow);
      // Spear: a thin shaft angled forward, so strikes read in 3D.
      const spear = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 34, 6),
        new THREE.MeshStandardMaterial({ color: 0xcfd6e6 })
      );
      spear.position.set(8, 18, 4);
      spear.rotation.x = Math.PI / 2.4;
      spear.castShadow = true;
      fig.add(spear);
      const slash = new THREE.Mesh(
        new THREE.SphereGeometry(16, 10, 10),
        new THREE.MeshBasicMaterial({ color: COLORS.white, transparent: true, opacity: 0.4 })
      );
      slash.visible = false;
      this.three.add(slash);
      const rig = new CharacterRig({ height: 44 });
      fig.add(rig.root);
      this._player = { fig, glow, slash, rig, capsule, lastPos: new THREE.Vector3() };
      this.three.add(fig);
    }
    const p = this._player;
    const cx = scene.px + PLAYER_SIZE / 2;
    const cy = scene.py + PLAYER_SIZE / 2;
    p.fig.position.set(cx, 0, cy);

    const f = scene.player.facing;
    if (f.x !== 0 || f.y !== 0) p.fig.rotation.y = Math.atan2(f.x, f.y);

    // Drive the hero animation; hide the capsule fallback once the model loads.
    const moving = p.fig.position.distanceTo(p.lastPos) > 0.4;
    p.lastPos.copy(p.fig.position);
    p.rig.update(dt, moving);
    if (p.rig.ready) for (const c of p.capsule) c.visible = false;

    // Stormlight glow + dash burst + hit flash.
    const sl = scene.player.stormlight;
    const dashGlow = scene.dashTimer > 0 ? 0.9 : 0;
    p.glow.material.opacity = Math.max(dashGlow, sl.infused ? 0.25 + 0.45 * sl.fraction : 0);
    p.glow.scale.setScalar(48 + 30 * sl.fraction + (scene.dashTimer > 0 ? 26 : 0));
    p.fig.userData.material.emissive.setHex(
      scene.hitFlash > 0 ? COLORS.red : sl.infused ? 0x2c5c8f : p.fig.userData.baseEmissive
    );
    if (p.rig.ready) {
      p.rig.setEmissive(scene.hitFlash > 0 ? COLORS.red : sl.infused ? 0x18406a : 0x000000);
    }

    // Attack swing: a translucent burst at the strike box.
    if (scene.attackAnim > 0) {
      const box = scene._attackBox();
      p.slash.visible = true;
      p.slash.position.set(box.x + box.w / 2, 16, box.y + box.h / 2);
      p.slash.material.opacity = 0.45 * (scene.attackAnim / 0.18);
    } else {
      p.slash.visible = false;
    }
  }

  // --- camera --------------------------------------------------------------------

  _syncCamera(scene, camera, dt) {
    const tx = scene.px + PLAYER_SIZE / 2;
    const tz = scene.py + PLAYER_SIZE / 2;

    // Keep the directional light (and thus its shadow frustum) centred on the
    // player so shadows stay sharp on a large map.
    if (this._sun) {
      this._sun.position.set(tx + 320, 640, tz + 240);
      this._sun.target.position.set(tx, 0, tz);
      this._sun.target.updateMatrixWorld();
    }

    // A lower, closer three-quarter chase than a flat top-down — more cinematic.
    const want = new THREE.Vector3(tx, 215, tz + 230);
    // First frame snaps, afterwards a soft follow.
    if (!this._camInit) {
      camera.position.copy(want);
      this._camInit = true;
    } else {
      camera.position.lerp(want, Math.min(1, dt * 5));
    }
    camera.lookAt(tx, 18, tz - 40);
  }
}
