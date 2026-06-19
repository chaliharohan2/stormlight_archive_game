// The main playable scene: a top-down area driven entirely by a `level` data
// object supplied by story chapters. Handles movement, collision, melee combat,
// a Stormlight-fuelled dash, sphere/item pickups, NPC dialogue, chasm hazards,
// and exits that advance the story. Rendering is procedural (no image assets).

import { Scene } from "../engine/scene.js";
import { PALETTE } from "../engine/renderer.js";
import { parseTileMap, isDeadlyAt } from "../core/tilemap.js";
import { moveWithCollision, aabbIntersect, distance } from "../core/physics.js";
import { resolveAttack, isAlive, healthFraction } from "../core/combat.js";
import { POWER_COSTS } from "../core/stormlight.js";
import { DialogueScene } from "./dialogueScene.js";
import { GameOverScene } from "./gameOverScene.js";

const PLAYER_SIZE = 22;
const PLAYER_SPEED = 150; // px/s
const INTERACT_RANGE = 46;
const ATTACK_COOLDOWN = 0.35;
const ATTACK_REACH = 30;
const ATTACK_WINDOW = 0.18;
const DASH_TIME = 0.18;
const DASH_SPEED = 520;
const HIT_FLASH = 0.12;

export class WorldScene extends Scene {
  /** @param {Object} level @param {Object} [opts] */
  constructor(level, opts = {}) {
    super();
    this.level = level;
    this.opts = opts;
  }

  enter() {
    const lv = this.level;
    this.map = parseTileMap(lv.rows, { legend: lv.legend, tileSize: lv.tileSize ?? 32 });
    this.ts = this.map.tileSize;
    this.entities = (lv.entities ?? []).map((e) => this._normalize(e));
    this.flags = this.game.progress.flags;

    const spawn = lv.spawn ?? { tx: 1, ty: 1 };
    this.px = (spawn.x ?? (spawn.tx + 0.5) * this.ts) - PLAYER_SIZE / 2;
    this.py = (spawn.y ?? (spawn.ty + 0.5) * this.ts) - PLAYER_SIZE / 2;

    this.player = this.game.player;
    if (!this.player) this.player = this.game.setupCharacter({ name: "Hero" });

    this.attackTimer = 0;
    this.attackAnim = 0;
    this.dashTimer = 0;
    this.hitFlash = 0;
    this.contactCooldown = 0;
    this.message = lv.objective ?? "";
    this.messageTimer = lv.objective ? 4 : 0;
    this._completed = false;

    if (typeof lv.onEnter === "function") lv.onEnter(this.game, this);
  }

  _normalize(e) {
    const ts = this.ts;
    const cx = e.x ?? (e.tx + 0.5) * ts;
    const cy = e.y ?? (e.ty + 0.5) * ts;
    const w = e.w ?? 22;
    const h = e.h ?? 22;
    const ent = {
      ...e,
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      _dead: false,
      _flash: 0,
    };
    if (e.type === "enemy" && e.combatant) {
      ent.combatant = { ...e.combatant, hp: e.combatant.hp ?? e.combatant.maxHp ?? 40 };
    }
    return ent;
  }

  get liveEnemies() {
    return this.entities.filter((e) => e.type === "enemy" && !e._dead);
  }

  // --- update --------------------------------------------------------------

  update(dt, input) {
    const p = this.player;
    p.stormlight.tick(dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);
    if (this.messageTimer > 0) this.messageTimer -= dt;
    for (const e of this.entities) if (e._flash > 0) e._flash -= dt;

    if (input.pressed("pause")) {
      this.message = "Paused — move to resume.";
      this.messageTimer = 1.2;
    }

    this._handleMovement(dt, input);
    this._handleDash(dt, input);
    this._handleAttack(dt, input);
    this._updateEnemies(dt);
    this._handlePickups();
    this._handleInteraction(input);
    this._checkHazards();
    if (typeof this.level.onUpdate === "function") this.level.onUpdate(this.game, this, dt);

    if (!isAlive(p.combatant)) this._die();
  }

  _solidsForPlayer() {
    const solids = this.map.solids.slice();
    for (const e of this.entities) {
      if (e.solid && !e._dead) solids.push({ x: e.x, y: e.y, w: e.w, h: e.h });
    }
    return solids;
  }

  _handleMovement(dt, input) {
    if (this.dashTimer > 0) return; // dash controls movement
    const ax = input.axis();
    if (ax.x !== 0 || ax.y !== 0) {
      this.player.facing = { x: ax.x === 0 ? 0 : Math.sign(ax.x), y: ax.y === 0 ? 0 : Math.sign(ax.y) };
    }
    const dx = ax.x * PLAYER_SPEED * dt;
    const dy = ax.y * PLAYER_SPEED * dt;
    const res = moveWithCollision(
      { x: this.px, y: this.py, w: PLAYER_SIZE, h: PLAYER_SIZE },
      dx,
      dy,
      this._solidsForPlayer()
    );
    this.px = res.x;
    this.py = res.y;
  }

  _handleDash(dt, input) {
    const p = this.player;
    const canDash = p.powers.has("dash") || p.powers.has("lashing");
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const f = p.facing.x === 0 && p.facing.y === 0 ? { x: 0, y: 1 } : p.facing;
      const len = Math.hypot(f.x, f.y) || 1;
      const dx = (f.x / len) * DASH_SPEED * dt;
      const dy = (f.y / len) * DASH_SPEED * dt;
      const res = moveWithCollision(
        { x: this.px, y: this.py, w: PLAYER_SIZE, h: PLAYER_SIZE },
        dx,
        dy,
        this._solidsForPlayer()
      );
      this.px = res.x;
      this.py = res.y;
      return;
    }
    if (canDash && input.pressed("power") && p.stormlight.canAfford(POWER_COSTS.surgeStep)) {
      p.stormlight.usePower("surgeStep");
      this.dashTimer = DASH_TIME;
      this.hitFlash = 0; // dash is a clean burst
    }
  }

  _handleAttack(dt, input) {
    if (input.pressed("attack") && this.attackTimer <= 0) {
      this.attackTimer = ATTACK_COOLDOWN;
      this.attackAnim = ATTACK_WINDOW;
      const box = this._attackBox();
      const infused = this.player.stormlight.infused;
      for (const e of this.liveEnemies) {
        if (aabbIntersect(box, e)) {
          const res = resolveAttack(this.player.combatant, e.combatant, { infused, power: infused ? 1.6 : 1 });
          e._flash = HIT_FLASH;
          // Small knockback.
          e.x += this.player.facing.x * 8;
          e.y += this.player.facing.y * 8;
          if (res.killed) this._killEnemy(e);
        }
      }
    }
  }

  _attackBox() {
    const f = this.player.facing.x === 0 && this.player.facing.y === 0 ? { x: 0, y: 1 } : this.player.facing;
    const cx = this.px + PLAYER_SIZE / 2;
    const cy = this.py + PLAYER_SIZE / 2;
    const reach = ATTACK_REACH;
    return {
      x: cx + f.x * 14 - reach / 2,
      y: cy + f.y * 14 - reach / 2,
      w: reach,
      h: reach,
    };
  }

  _killEnemy(e) {
    e._dead = true;
    if (e.dropSphere) {
      this.entities.push(
        this._normalize({ type: "sphere", x: e.x + e.w / 2, y: e.y + e.h / 2, charge: e.dropSphere })
      );
    }
    if (typeof e.onDeath === "function") e.onDeath(this.game, this);
  }

  _updateEnemies(dt) {
    const pcx = this.px + PLAYER_SIZE / 2;
    const pcy = this.py + PLAYER_SIZE / 2;
    for (const e of this.liveEnemies) {
      const ecx = e.x + e.w / 2;
      const ecy = e.y + e.h / 2;
      const dist = distance(ecx, ecy, pcx, pcy);
      const aggro = e.aggro ?? 220;
      if (dist < aggro && dist > 1) {
        const spd = (e.speed ?? 70) * dt;
        const nx = ((pcx - ecx) / dist) * spd;
        const ny = ((pcy - ecy) / dist) * spd;
        const res = moveWithCollision({ x: e.x, y: e.y, w: e.w, h: e.h }, nx, ny, this.map.solids);
        e.x = res.x;
        e.y = res.y;
      }
      // Contact damage.
      if (
        this.dashTimer <= 0 &&
        this.contactCooldown <= 0 &&
        aabbIntersect({ x: this.px, y: this.py, w: PLAYER_SIZE, h: PLAYER_SIZE }, e)
      ) {
        resolveAttack(e.combatant, this.player.combatant, {});
        this.contactCooldown = 0.7;
        this.hitFlash = HIT_FLASH;
      }
    }
  }

  _handlePickups() {
    const pbox = { x: this.px, y: this.py, w: PLAYER_SIZE, h: PLAYER_SIZE };
    for (const e of this.entities) {
      if (e._dead) continue;
      if (e.type === "sphere" && aabbIntersect(pbox, e)) {
        const charge = e.charge ?? 20;
        this.player.stormlight.absorb(charge);
        this.player.inventory.addSpheres(charge);
        e._dead = true;
        this.hitFlash = 0;
      } else if (e.type === "pickup" && aabbIntersect(pbox, e)) {
        this.player.inventory.add(e.item, e.count ?? 1);
        e._dead = true;
        this.message = e.label ?? `Picked up ${e.item}`;
        this.messageTimer = 2.5;
      }
    }
  }

  _nearestInteractable() {
    const pcx = this.px + PLAYER_SIZE / 2;
    const pcy = this.py + PLAYER_SIZE / 2;
    let best = null;
    let bestD = INTERACT_RANGE;
    for (const e of this.entities) {
      if (e._dead) continue;
      if (e.type !== "npc" && e.type !== "exit" && e.type !== "sign") continue;
      if (e.type === "exit" && e.auto) continue; // auto exits handled below
      const d = distance(pcx, pcy, e.x + e.w / 2, e.y + e.h / 2);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  _handleInteraction(input) {
    // Auto-trigger exits on overlap.
    const pbox = { x: this.px, y: this.py, w: PLAYER_SIZE, h: PLAYER_SIZE };
    for (const e of this.entities) {
      if (e.type === "exit" && e.auto && !e._dead && aabbIntersect(pbox, e)) {
        return this._triggerExit(e);
      }
    }
    this._hint = this._nearestInteractable();
    if (this._hint && input.pressed("interact")) {
      this._trigger(this._hint);
    }
  }

  _trigger(e) {
    if (e.type === "npc") {
      const tree = typeof e.tree === "function" ? e.tree(this.game, this) : e.tree;
      this.game.scenes.push(
        new DialogueScene(tree, {
          startNode: e.startNode ?? "start",
          flags: this.flags,
          onComplete: (flags) => {
            if (typeof e.onTalk === "function") e.onTalk(this.game, this, flags);
          },
        })
      );
    } else if (e.type === "sign") {
      this.game.scenes.push(
        new DialogueScene({ start: { id: "start", speaker: e.speaker ?? "", text: e.text, end: true } }, {
          flags: this.flags,
        })
      );
    } else if (e.type === "exit") {
      this._triggerExit(e);
    }
  }

  _triggerExit(e) {
    if (this.level.clearToExit && this.liveEnemies.length > 0) {
      this.message = "The way is blocked — clear the enemies first.";
      this.messageTimer = 2;
      return;
    }
    if (this._completed) return;
    this._completed = true;
    if (typeof e.onTrigger === "function") e.onTrigger(this.game, this);
  }

  _checkHazards() {
    if (this.dashTimer > 0) return; // can dash across small gaps
    const cx = this.px + PLAYER_SIZE / 2;
    const cy = this.py + PLAYER_SIZE / 2;
    if (isDeadlyAt(this.map, cx, cy)) this._die("You fell into the chasm.");
  }

  _die(reason) {
    if (this._completed) return;
    this._completed = true;
    this.game.scenes.push(
      new GameOverScene(reason ?? `${this.player.name} has fallen.`, {
        onRetry: () => {
          this.game.scenes.pop(); // remove game over
          // Reset and replay this level.
          this.player.combatant.hp = this.player.combatant.maxHp;
          this.player.stormlight.amount = 0;
          this.enter();
        },
      })
    );
  }

  // --- render --------------------------------------------------------------

  render(r) {
    // With the 3D view active the playfield is drawn by WorldPresenter; the
    // 2D canvas keeps only the HUD. Without it, the full 2D view still works.
    if (!this.game.has3D) {
      r.centerCamOn(this.px + PLAYER_SIZE / 2, this.py + PLAYER_SIZE / 2, this.map.width, this.map.height);
      this._renderMap(r);
      this._renderEntities(r);
      this._renderPlayer(r);
    }
    this._renderHud(r);
  }

  _renderMap(r) {
    const ts = this.ts;
    const startX = Math.max(0, Math.floor(r.cam.x / ts));
    const startY = Math.max(0, Math.floor(r.cam.y / ts));
    const endX = Math.min(this.map.cols, Math.ceil((r.cam.x + r.width) / ts));
    const endY = Math.min(this.map.rows, Math.ceil((r.cam.y + r.height) / ts));
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const ch = this.map.grid[y][x];
        const def = this.map.legend[ch] ?? {};
        let color = def.color;
        if (!color) {
          if (def.type === "wall") color = (x + y) % 2 ? PALETTE.stone : PALETTE.stoneLight;
          else if (def.type === "chasm") color = PALETTE.chasm;
          else if (def.type === "bridge") color = "#6b4f33";
          else color = (x + y) % 2 ? PALETTE.floor : PALETTE.floorAlt;
        }
        r.rect(x * ts, y * ts, ts, ts, color);
      }
    }
  }

  _renderEntities(r) {
    for (const e of this.entities) {
      if (e._dead) continue;
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      if (e.type === "sphere") {
        r.glow(cx, cy, 22, "rgba(242,193,78,0.5)");
        r.circle(cx, cy, 7, PALETTE.gold);
      } else if (e.type === "pickup") {
        r.rect(e.x, e.y, e.w, e.h, e.color ?? PALETTE.green);
      } else if (e.type === "npc") {
        r.rect(e.x, e.y, e.w, e.h, e.color ?? "#6f7fb0");
        if (e.name) r.text(e.name, cx, e.y - 6, { color: PALETTE.dim, size: 11, align: "center" });
      } else if (e.type === "enemy") {
        const col = e._flash > 0 ? PALETTE.white : e.color ?? PALETTE.parshendi;
        r.rect(e.x, e.y, e.w, e.h, col);
        // enemy health pip
        const f = healthFraction(e.combatant);
        r.rect(e.x, e.y - 6, e.w * f, 3, PALETTE.red);
      } else if (e.type === "exit") {
        r.glow(cx, cy, 26, "rgba(95,207,128,0.35)");
        r.rect(e.x, e.y, e.w, e.h, e.color ?? "rgba(95,207,128,0.6)");
        if (e.label) r.text(e.label, cx, e.y - 6, { color: PALETTE.green, size: 11, align: "center" });
      } else if (e.type === "sign") {
        r.rect(e.x, e.y, e.w, e.h, e.color ?? "#caa46b");
      } else if (e.type === "decoration") {
        r.rect(e.x, e.y, e.w, e.h, e.color ?? PALETTE.stone);
      }
    }
  }

  _renderPlayer(r) {
    const cx = this.px + PLAYER_SIZE / 2;
    const cy = this.py + PLAYER_SIZE / 2;
    const sl = this.player.stormlight;
    if (sl.infused) {
      r.glow(cx, cy, 30 + 16 * sl.fraction, `rgba(79,176,255,${0.25 + 0.4 * sl.fraction})`);
    }
    if (this.dashTimer > 0) r.glow(cx, cy, 36, "rgba(191,230,255,0.5)");
    const body = this.hitFlash > 0 ? PALETTE.red : sl.infused ? PALETTE.glow : "#5b8dd9";
    r.rect(this.px, this.py, PLAYER_SIZE, PLAYER_SIZE, body);

    // Facing pip / weapon.
    const f = this.player.facing;
    r.rect(cx + f.x * 14 - 3, cy + f.y * 14 - 3, 6, 6, PALETTE.white);
    if (this.attackAnim > 0) {
      const box = this._attackBox();
      r.rect(box.x, box.y, box.w, box.h, "rgba(232,236,245,0.35)");
    }
  }

  _renderHud(r) {
    const p = this.player;
    // Health bar.
    r.rectScreen(16, 16, 204, 18, "rgba(0,0,0,0.5)");
    r.rectScreen(18, 18, 200 * healthFraction(p.combatant), 14, PALETTE.red);
    r.text(`${p.name}`, 18, 50, { color: PALETTE.white, size: 13 });
    r.text(`HP ${Math.ceil(p.combatant.hp)}/${p.combatant.maxHp}`, 130, 50, {
      color: PALETTE.dim,
      size: 12,
    });

    // Stormlight bar.
    r.rectScreen(16, 60, 204, 14, "rgba(0,0,0,0.5)");
    r.rectScreen(18, 62, 200 * p.stormlight.fraction, 10, PALETTE.blue);
    r.text("Stormlight", 18, 88, { color: PALETTE.dim, size: 12 });

    // Objective / messages (kept below the bars so long lines never overlap).
    if (this.messageTimer > 0 && this.message) {
      r.rectScreen(r.width / 2 - 300, 96, 600, 30, "rgba(10,14,28,0.85)");
      r.text(this.message, r.width / 2, 116, { color: PALETTE.glow, size: 15, align: "center" });
    }

    // Interaction hint.
    if (this._hint) {
      const label = this._hint.prompt ?? (this._hint.type === "npc" ? "talk" : "enter");
      r.text(`[E] ${label}`, r.width / 2, r.height - 26, {
        color: PALETTE.white,
        size: 15,
        align: "center",
      });
    }
  }
}
