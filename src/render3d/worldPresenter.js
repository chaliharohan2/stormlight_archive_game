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
    this._syncEntities(scene);
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
    addLights(this.three);

    const map = scene.map;
    const ts = map.tileSize;

    // Classify tiles, then draw each class as one InstancedMesh.
    const buckets = { floor: [], wall: [], bridge: [] };
    let hasChasm = false;
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const def = map.legend[map.grid[y][x]] ?? {};
        const custom = def.color ? cssToHex(def.color, null) : null;
        if (def.type === "wall" || def.solid) {
          buckets.wall.push({ x, y, color: custom ?? ((x + y) % 2 ? COLORS.stone : COLORS.stoneLight) });
        } else if (def.type === "chasm") {
          hasChasm = true; // leave a hole; the abyss plane below shows through
        } else if (def.type === "bridge") {
          buckets.bridge.push({ x, y, color: custom ?? COLORS.wood });
        } else {
          buckets.floor.push({ x, y, color: custom ?? ((x + y) % 2 ? COLORS.floor : COLORS.floorAlt) });
        }
      }
    }

    const place = (items, geo, cy) => {
      if (!items.length) return;
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), items.length);
      const m = new THREE.Matrix4();
      const c = new THREE.Color();
      items.forEach((t, i) => {
        m.makeTranslation((t.x + 0.5) * ts, cy, (t.y + 0.5) * ts);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.setHex(t.color));
      });
      this.three.add(mesh);
    };

    place(buckets.floor, new THREE.BoxGeometry(ts, 8, ts), -4);
    place(buckets.wall, new THREE.BoxGeometry(ts, WALL_H, ts), WALL_H / 2 - 8);
    place(buckets.bridge, new THREE.BoxGeometry(ts, 6, ts), -3);

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

  _meshFor(e) {
    let m = this._meshes.get(e);
    if (m) return m;

    if (e.type === "enemy") {
      m = makeFigure(cssToHex(e.color, COLORS.parshendi), { height: 14 + e.h, radius: Math.max(8, e.w / 2.6) });
      m.add(makeBlobShadow(e.w * 0.6));
    } else if (e.type === "npc") {
      m = makeFigure(cssToHex(e.color, 0x6f7fb0));
      m.add(makeBlobShadow());
    } else if (e.type === "sphere") {
      m = new THREE.Group();
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(5, 10, 10),
        new THREE.MeshLambertMaterial({ color: COLORS.gold, emissive: COLORS.gold, emissiveIntensity: 0.8 })
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
        new THREE.MeshLambertMaterial({ color: cssToHex(e.color, COLORS.green) })
      );
      m.position.y = 6;
      const wrap = new THREE.Group();
      wrap.add(m);
      m = wrap;
    } else if (e.type === "sign") {
      m = new THREE.Group();
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(4, 22, 4),
        new THREE.MeshLambertMaterial({ color: COLORS.wood })
      );
      post.position.y = 11;
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(20, 12, 3),
        new THREE.MeshLambertMaterial({ color: cssToHex(e.color, 0xcaa46b) })
      );
      board.position.y = 24;
      m.add(post, board);
    } else if (e.type === "decoration") {
      m = new THREE.Mesh(
        new THREE.BoxGeometry(e.w, Math.max(10, Math.min(e.w, e.h)), e.h),
        new THREE.MeshLambertMaterial({ color: cssToHex(e.color, COLORS.stone) })
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

  _syncEntities(scene) {
    for (const e of scene.entities) {
      const m = this._meshFor(e);
      m.visible = !e._dead;
      if (!m.visible) continue;
      m.position.set(e.x + e.w / 2, 0, e.y + e.h / 2);
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
      fig.add(makeBlobShadow());
      const glow = makeGlow(COLORS.blue, 40, 0.0);
      glow.position.y = 16;
      fig.add(glow);
      // Spear: a thin shaft angled forward, so strikes read in 3D.
      const spear = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 34, 6),
        new THREE.MeshLambertMaterial({ color: 0xcfd6e6 })
      );
      spear.position.set(8, 18, 4);
      spear.rotation.x = Math.PI / 2.4;
      fig.add(spear);
      const slash = new THREE.Mesh(
        new THREE.SphereGeometry(16, 10, 10),
        new THREE.MeshBasicMaterial({ color: COLORS.white, transparent: true, opacity: 0.4 })
      );
      slash.visible = false;
      this.three.add(slash);
      this._player = { fig, glow, slash };
      this.three.add(fig);
    }
    const p = this._player;
    const cx = scene.px + PLAYER_SIZE / 2;
    const cy = scene.py + PLAYER_SIZE / 2;
    p.fig.position.set(cx, 0, cy);

    const f = scene.player.facing;
    if (f.x !== 0 || f.y !== 0) p.fig.rotation.y = Math.atan2(f.x, f.y);

    // Stormlight glow + dash burst + hit flash.
    const sl = scene.player.stormlight;
    const dashGlow = scene.dashTimer > 0 ? 0.9 : 0;
    p.glow.material.opacity = Math.max(dashGlow, sl.infused ? 0.25 + 0.45 * sl.fraction : 0);
    p.glow.scale.setScalar(48 + 30 * sl.fraction + (scene.dashTimer > 0 ? 26 : 0));
    p.fig.userData.material.emissive.setHex(
      scene.hitFlash > 0 ? COLORS.red : sl.infused ? 0x2c5c8f : p.fig.userData.baseEmissive
    );

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
    const want = new THREE.Vector3(tx, 250, tz + 210);
    // First frame snaps, afterwards a soft follow.
    if (!this._camInit) {
      camera.position.copy(want);
      this._camInit = true;
    } else {
      camera.position.lerp(want, Math.min(1, dt * 5));
    }
    camera.lookAt(tx, 0, tz - 30);
  }
}
