// Campaign registry. Each chapter is { id, title, blurb, intro?, start(game) }.
// M2 ships a single sandbox chapter so the runtime is playable end-to-end;
// milestone M4 replaces CHAPTERS with the full six-chapter adaptation.

import { WorldScene } from "../scenes/worldScene.js";

const sandbox = {
  id: "sandbox",
  title: "Sandbox — Engine Test",
  blurb: "A quiet stone room to test movement, Stormlight, and the spear.",
  intro: [
    {
      title: "The Way of Kings",
      subtitle: "Engine sandbox",
      text: "Move with WASD or arrows. [E] to talk, [Space/J] to strike, [Shift/K] to dash on Stormlight. Reach the green gate.",
    },
  ],
  start(game) {
    game.setupCharacter({
      name: "Kaladin",
      maxHp: 100,
      attack: 14,
      stormlightBonus: 20,
      stormlightCapacity: 100,
      powers: ["dash"],
    });
    const level = {
      id: "sandbox-room",
      rows: [
        "####################",
        "#..................#",
        "#..................#",
        "#......~~~~........#",
        "#......~~~~........#",
        "#..................#",
        "#..................#",
        "#..................#",
        "####################",
      ],
      tileSize: 36,
      spawn: { tx: 2, ty: 2 },
      objective: "Reach the green gate. Grab spheres for Stormlight.",
      entities: [
        { type: "sphere", tx: 4, ty: 5, charge: 40 },
        { type: "sphere", tx: 12, ty: 6, charge: 40 },
        {
          type: "npc",
          tx: 3,
          ty: 6,
          name: "Syl",
          color: "#bfe6ff",
          tree: {
            start: { id: "start", speaker: "Syl", text: "You're alive! Try to reach the gate.", end: true },
          },
        },
        {
          type: "enemy",
          tx: 14,
          ty: 3,
          color: "#c0563a",
          speed: 60,
          combatant: { name: "Shardbearer's pawn", maxHp: 40, attack: 8, defense: 1 },
          dropSphere: 30,
        },
        {
          type: "exit",
          tx: 17,
          ty: 7,
          label: "Gate",
          color: "rgba(95,207,128,0.7)",
          onTrigger: (game) => game.completeChapter("sandbox"),
        },
      ],
    };
    game.scenes.replace(new WorldScene(level));
  },
};

export const CHAPTERS = [sandbox];
