// Dalinar's Highstorm vision sequence as a full-screen scene. Drives a
// VisionSequence (the tested core) and renders the beats in a dreamlike,
// glowing style. A choice may surface a brief response line before the next
// beat appears; when the gauntlet ends we pop ourselves and report result().

import { Scene } from "../engine/scene.js";
import { PALETTE } from "../engine/renderer.js";
import { VisionSequence } from "../core/vision.js";

// Authored content. Eight beats spanning the Recreance, a Midnight Essence
// attack, the Heralds, and the recorded refrain. Honor values reward acting
// with integrity (protecting people, keeping oaths) over expedience. Kept here
// (not in core) so the logic module stays content-free and reusable.
export const DALINAR_VISION_BEATS = [
  {
    id: "refrain",
    setting: "Somewhere beyond the storm",
    speaker: "A voice, ancient and recorded",
    text:
      "You must find the most important words a man can say. The vision tightens around you like a fist. Unite them.",
    choices: [
      { text: "I will listen.", honor: 2, response: "The words settle into you like rain into stone." },
      { text: "This is madness brought by the storms.", honor: -1, response: "Yet the voice does not waver." },
    ],
  },
  {
    id: "recreance",
    setting: "Feverstone Keep — the day of the Recreance",
    speaker: "A Radiant, lowering her Blade",
    text:
      "Hundreds of Knights Radiant abandon their Shardblades and Shardplate upon the stone and walk away, their oaths broken. A glowing Blade falls at your feet. The spren are dying.",
    choices: [
      { text: "Take up the fallen Blade to defend the realm.", honor: -3, next: "essence", response: "The Blade is dead in your hand. Honor is not a thing you can pick up." },
      { text: "Kneel and ask why they would break their oaths.", honor: 4, next: "essence", response: "No answer comes — only the weight of a betrayal you do not yet understand." },
      { text: "Walk away with them; perhaps they are right.", honor: -1, next: "essence", response: "Doubt is a poor companion in a storm." },
    ],
  },
  {
    id: "essence",
    setting: "A village on the Shattered Plains, generations past",
    speaker: "A terrified farmer",
    text:
      "A Midnight Essence — a thing of oil and claws — boils out of the dark toward the homes. You hold a simple poker. Villagers cower behind you. Soldiers in the keep would not come.",
    choices: [
      { text: "Stand between the creature and the people. Fight.", honor: 5, response: "Life before death. Strength before weakness." },
      { text: "Order the villagers to flee while you hold the line.", honor: 4, response: "Some will live because you stayed." },
      { text: "Save yourself; you cannot win this.", honor: -4, next: "heralds", response: "Their screams follow you into the next vision." },
      { text: "Bargain with the creature for your own passage.", honor: -5, response: "It has no honor to bargain with. Neither, now, do you." },
    ],
  },
  {
    id: "wounded",
    setting: "After the fight — ash and rain",
    speaker: "A dying soldier you did not know",
    text:
      "The Essence is slain but a young soldier lies broken, begging you not to let him die alone. Behind you, a fleeing highprince's banner — proof of cowardice you could use against a rival.",
    choices: [
      { text: "Stay. Hold his hand until the end.", honor: 5, response: "You are there when the light leaves his eyes. It matters." },
      { text: "Chase the banner; such leverage wins wars.", honor: -4, response: "You gain a weapon and lose something quieter." },
      { text: "Order a soldier to comfort him while you secure the banner.", honor: 0, response: "A compromise. The man dies among strangers." },
    ],
  },
  {
    id: "heralds",
    setting: "The Tranquiline Halls — a Herald speaks",
    speaker: "Nale, or one who wears his face",
    text:
      "A figure in ancient regalia regards you. 'The Knights Radiant must stand again. But men are weak, and oaths are heavy. Will you bind yourself to a code, knowing it may cost you everything?'",
    choices: [
      { text: "I will live by a code, whatever the cost.", honor: 5, response: "Journey before destination." },
      { text: "Only a code I can keep when it is convenient.", honor: -2, response: "Then it is not a code at all." },
      { text: "Codes are for men who fear their own choices.", honor: -3, response: "The Herald's eyes go cold." },
    ],
  },
  {
    id: "betrayal",
    setting: "A war camp — the highprinces gathered",
    speaker: "A highprince who has wronged you",
    text:
      "The men who let your brother die feast and squabble, each guarding his own glory. You could expose them, shame them, break the fragile alliance for the satisfaction of it.",
    choices: [
      { text: "Offer your hand. Unity is worth your pride.", honor: 5, response: "Unite them. The voice was right." },
      { text: "Demand they swear to a shared code of war.", honor: 4, response: "A first thread of something stronger." },
      { text: "Expose them all and let the camps burn.", honor: -5, response: "You are proven right, and left alone." },
    ],
  },
  {
    id: "oath",
    setting: "The eye of the highstorm",
    speaker: "The voice, fainter now",
    text:
      "The storm peels back and for a heartbeat you see all of Roshar at once — fractured, frightened, waiting. The voice asks one last thing of you: what will you become?",
    choices: [
      { text: "A man who unites, not divides.", honor: 6, response: "The most important words a man can say: I will." },
      { text: "A soldier who simply survives the storm.", honor: -1, response: "Survival was never the question." },
    ],
  },
  {
    id: "wake",
    setting: "The Kholin warcamp — the storm passing",
    text:
      "You wake gasping on the stone, the highstorm's last winds tearing at the tent. The visions fade, but the resolve does not. Adolin watches you, worried. What do you carry out of the storm?",
    choices: [
      { text: "Resolve. We unite the highprinces, or we fall apart.", honor: 4, response: "Honor is dead. But I'll see what I can do." },
      { text: "Confusion. Perhaps the visions mean nothing.", honor: -2, response: "You bury the words, and they wait." },
    ],
  },
];

export class VisionScene extends Scene {
  /**
   * @param {import('../core/vision.js').VisionBeat[]} [beats]
   * @param {Object} [opts]
   * @param {(result:Object)=>void} [opts.onComplete] called with result() at end
   * @param {number} [opts.unityThreshold] forwarded to VisionSequence
   */
  constructor(beats = DALINAR_VISION_BEATS, opts = {}) {
    super();
    this._beats = beats;
    this._opts = opts;
    this.onComplete = opts.onComplete ?? null;
  }

  enter() {
    this.seq = new VisionSequence(this._beats, { unityThreshold: this._opts.unityThreshold });
    this.selected = 0;
    // When a choice has a `response`, we pause on it for one confirm before the
    // next beat shows, so the player feels the consequence of the decision.
    this._showingResponse = null;
    this._pendingDone = false;
  }

  _commit(i) {
    this.selected = i;
    const res = this.seq.choose(i);
    this._pendingDone = res.done;
    if (res.response) {
      this._showingResponse = res.response; // hold for a confirm
    } else {
      this._afterResponse();
    }
  }

  // Called once any response has been dismissed (or when there was none).
  _afterResponse() {
    this._showingResponse = null;
    this.selected = 0;
    if (this._pendingDone || this.seq.isComplete()) {
      this.game.scenes.pop();
      this.onComplete?.(this.seq.result());
    }
  }

  update(dt, input) {
    if (this._showingResponse != null) {
      if (input.pressed("confirm") || input.pressed("attack") || input.pressed("interact")) {
        this._afterResponse();
      }
      return;
    }

    const choices = this.seq.choices();
    if (!choices.length) {
      // Defensive: nothing to choose means the run is over.
      if (this.seq.isComplete()) this._afterResponse();
      return;
    }

    if (input.pressed("up")) this.selected = (this.selected + choices.length - 1) % choices.length;
    if (input.pressed("down")) this.selected = (this.selected + 1) % choices.length;
    for (let i = 0; i < choices.length && i < 4; i++) {
      if (input.pressed(`num${i + 1}`)) {
        this._commit(i);
        return;
      }
    }
    if (input.pressed("confirm")) this._commit(this.selected);
  }

  render(r) {
    const W = r.width;
    const H = r.height;

    // Dreamlike backdrop: deep dark with a slow soft glow at the center, evoking
    // the eye of the highstorm pulling Dalinar inward.
    r.clear(PALETTE.bgDeep);
    r.glow(W / 2, H / 2 - 30, Math.max(W, H) * 0.55, "rgba(79,176,255,0.10)", false);
    r.glow(W / 2, H * 0.78, 260, "rgba(155,107,255,0.08)", false);

    if (this._showingResponse != null) {
      r.textWrapped(this._showingResponse, W / 2 - 340, H / 2 - 12, 680, {
        size: 22,
        lineHeight: 32,
        color: PALETTE.glow,
        align: "center",
      });
      r.text("press Space", W / 2, H - 40, { color: PALETTE.dim, size: 13, align: "center" });
      this._renderHonorMeter(r);
      return;
    }

    const beat = this.seq.current();
    if (!beat) return;

    // Setting caption — small, dim, near the top.
    r.text(beat.setting, W / 2, 70, { color: PALETTE.dim, size: 14, align: "center" });
    if (beat.speaker) {
      r.text(beat.speaker, W / 2, 96, { color: PALETTE.amethyst, size: 14, align: "center", weight: "bold" });
    }

    // The situation text, wrapped and centered in the upper-middle.
    r.textWrapped(beat.text, W / 2 - 360, 150, 720, {
      size: 19,
      lineHeight: 28,
      color: PALETTE.white,
      align: "center",
    });

    // Choices as a numbered, highlightable list in the lower third.
    const choices = beat.choices;
    const startY = H - 80 - choices.length * 34;
    const boxW = Math.min(720, W - 80);
    const boxX = (W - boxW) / 2;
    choices.forEach((c, i) => {
      const sel = i === this.selected;
      const y = startY + i * 34;
      if (sel) {
        r.rectScreen(boxX, y - 22, boxW, 30, "rgba(79,176,255,0.16)");
        r.strokeRectScreen(boxX, y - 22, boxW, 30, PALETTE.blue, 1);
      }
      r.text(`${i + 1}. ${c.text}`, boxX + 16, y, {
        color: sel ? PALETTE.glow : PALETTE.dim,
        size: 16,
      });
    });

    this._renderHonorMeter(r);
  }

  // Glowing horizontal bar showing accrued honor against the attainable max.
  _renderHonorMeter(r) {
    const W = r.width;
    const max = Math.max(1, this.seq.maxHonor());
    // Clamp negative honor to an empty bar so the fill stays in [0,1].
    const frac = Math.max(0, Math.min(1, this.seq.honor / max));
    const barW = Math.min(420, W - 80);
    const barX = (W - barW) / 2;
    const barY = 122;
    const barH = 8;

    r.rectScreen(barX, barY, barW, barH, "rgba(20,28,48,0.9)");
    if (frac > 0) {
      r.rectScreen(barX, barY, barW * frac, barH, PALETTE.blue);
      r.glow(barX + barW * frac, barY + barH / 2, 26, "rgba(79,176,255,0.5)", false);
    }
    r.strokeRectScreen(barX, barY, barW, barH, PALETTE.stoneLight, 1);
    r.text("HONOR", barX, barY - 6, { color: PALETTE.dim, size: 11 });
  }
}
