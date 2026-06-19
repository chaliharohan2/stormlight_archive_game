// The campaign: an eight-chapter adaptation of The Way of Kings (Stormlight
// Archive, Book One). Each chapter is a plain object
//   { id, title, blurb, intro?, outro?, start(game) }
// and `start` drives the scene stack — narration, world areas, dialogue, and
// the three signature minigames (bridge run, Soulcasting, Dalinar's visions).
//
// All gameplay lives in the engine/scenes; this file is pure content + flow.
// Chapters chain scenes with `game.scenes.replace(...)` and finish by calling
// `game.completeChapter(id)` exactly once, which the runtime turns into the
// next chapter's intro (see main.js).

import { WorldScene } from "../scenes/worldScene.js";
import { NarrationScene } from "../scenes/narrationScene.js";
import { BridgeRunScene } from "../scenes/bridgeRunScene.js";
import { SoulcastScene } from "../scenes/soulcastScene.js";
import { VisionScene, DALINAR_VISION_BEATS } from "../scenes/visionScene.js";

// --- small flow helpers ----------------------------------------------------

/** Replace the stack with narration pages, then run `onComplete`. */
function narrate(game, pages, onComplete) {
  game.scenes.replace(new NarrationScene(pages, { onComplete }));
}

/** Replace the stack with a world area. */
function world(game, level) {
  game.scenes.replace(new WorldScene(level));
}

// ===========================================================================
// Prelude — "The Oathpact"
// Four and a half millennia before the main story: the Herald Kalak walks the
// battlefield of Aharietiam, the "last" Desolation, and finds Jezrien waiting
// by seven Honorblades. The Heralds abandon the Oathpact.
// ===========================================================================

const prelude = {
  id: "prelude",
  title: "Prelude — The Oathpact",
  blurb: "The Heralds abandon the Oathpact on the field of Aharietiam, and lie to the world.",
  intro: [
    {
      epigraph: "“To kill with the sword is the way of the Heralds. To die by it, their wages.”",
      title: "The Oathpact",
      subtitle: "Aharietiam — the last Desolation, 4,500 years before",
      text:
        "Kalak, Herald of the Almighty, picks his way across a field of the dead. The Desolation is won — again. Ten times ten he has died for these people and returned to the torture that waits between, and he cannot bear to go back. Ahead, by a ridge of broken stone, a lone figure waits. [WASD] move · [E] interact.",
    },
  ],
  start(game) {
    game.setupCharacter({
      name: "Kalak",
      maxHp: 100,
      attack: 12,
      defense: 3,
      stormlightCapacity: 100,
      powers: [],
    });

    world(game, {
      id: "aharietiam-field",
      tileSize: 36,
      rows: [
        "##########################",
        "#........................#",
        "#...##......##...........#",
        "#........................#",
        "#........................#",
        "#......##.........##.....#",
        "#........................#",
        "#...##...................#",
        "#........................#",
        "##########################",
      ],
      spawn: { tx: 2, ty: 7 },
      objective: "Cross the field of the dead. Jezrien waits by the Honorblades.",
      clearToExit: false,
      entities: [
        // The dead: men, and the ridge of a fallen thunderclast.
        { type: "decoration", tx: 5, ty: 3, w: 26, h: 12, color: "#5a3434" },
        { type: "decoration", tx: 8, ty: 6, w: 26, h: 12, color: "#5a3434" },
        { type: "decoration", tx: 12, ty: 2, w: 26, h: 12, color: "#5a3434" },
        { type: "decoration", tx: 15, ty: 7, w: 26, h: 12, color: "#5a3434" },
        { type: "decoration", tx: 10, ty: 4, w: 70, h: 22, color: "#3c3640" }, // thunderclast ridge
        { type: "decoration", tx: 18, ty: 3, w: 70, h: 22, color: "#3c3640" },
        { type: "decoration", tx: 7, ty: 8, w: 16, h: 16, color: "#55585f" }, // smoking ground
        { type: "decoration", tx: 14, ty: 1, w: 16, h: 16, color: "#55585f" },
        { type: "sign", tx: 6, ty: 5, speaker: "The field", text: "The dead lie in ranks where they stood. Men and Voidbringers tangled together, and the stone itself scorched. Whatever this victory cost, it has been paid in full." },
        // Seven Honorblades thrust into the stone beside Jezrien.
        { type: "decoration", tx: 21, ty: 1, w: 6, h: 20, color: "#cdd6e8" },
        { type: "decoration", tx: 22, ty: 2, w: 6, h: 20, color: "#cdd6e8" },
        { type: "decoration", tx: 23, ty: 1, w: 6, h: 20, color: "#cdd6e8" },
        { type: "decoration", tx: 24, ty: 2, w: 6, h: 20, color: "#cdd6e8" },
        { type: "decoration", tx: 21, ty: 3, w: 6, h: 20, color: "#cdd6e8" },
        { type: "decoration", tx: 23, ty: 3, w: 6, h: 20, color: "#cdd6e8" },
        { type: "decoration", tx: 24, ty: 4, w: 6, h: 20, color: "#cdd6e8" },
        {
          type: "npc",
          tx: 22,
          ty: 5,
          name: "Jezrien",
          color: "#d8ddec",
          prompt: "speak with Jezrien",
          tree: {
            start: {
              id: "start",
              speaker: "Jezrien",
              text: "Kalak. I had wondered if you would come. The others have already gone — Shalash, Nale, all of them. Their Blades are here. Look at them, planted like grave markers.",
              next: "b",
            },
            b: {
              id: "b",
              speaker: "Kalak",
              text: "Seven Blades. Jezrien — there should be eight. Where is Talenel's?",
              next: "c",
            },
            c: {
              id: "c",
              speaker: "Jezrien",
              text: "Taln fell in the battle. His Blade is wherever his body is. He alone has gone back to that place of fire and pain — and he alone will bear the Oathpact for all of us. We have agreed. We are not going back.",
              choices: [
                { text: "Not going back? Jezrien, the torture — we swore. This will damn us.", next: "horror" },
                { text: "...I cannot return either. I haven't the strength to face it again.", next: "weary" },
                { text: "And what becomes of us, then? What are Heralds who walk away?", next: "becomes" },
              ],
            },
            horror: {
              id: "horror",
              speaker: "Jezrien",
              text: "Damn us? Look at this field, Kalak, and tell me we are not damned already. Four millennia of dying for them, and the pain between each death longer than the lives we saved. A man can only carry so much.",
              next: "converge",
            },
            weary: {
              id: "weary",
              speaker: "Jezrien",
              text: "Nor have I. That is the truth none of us would say aloud until today. We are broken, old friend. Whatever we once were, the Oathpact has worn it away.",
              next: "converge",
            },
            becomes: {
              id: "becomes",
              speaker: "Jezrien",
              text: "We become men. Just men. We walk into the world and we do not look back, and perhaps in time we forget what we abandoned. Taln will hold. One man, holding the Oathpact alone — it may be enough. It will have to be.",
              next: "converge",
            },
            converge: {
              id: "converge",
              speaker: "Kalak",
              text: "And the people? When the Desolation comes again — and it will come, Jezrien — who tells them?",
              next: "final",
            },
            final: {
              id: "final",
              speaker: "Jezrien",
              text: "No one. We tell them that they finally won, that the Desolations are ended, and we let them live free of the dread we carry. It is a lie, Kalak. But it is a kind one. Goodbye, old friend.",
              end: true,
            },
          },
          onTalk: (game, scene) => {
            if (scene._done) return;
            scene._done = true;
            game.progress.setFlag("oathpactAbandoned", true);
            narrate(
              game,
              [
                {
                  subtitle: "The Oathpact, abandoned",
                  text:
                    "Jezrien walks away across the field of the dead, and does not look back. Kalak stands a long while among the seven Blades, then leaves his own beside them. The people will be told they won. Forty-five hundred years will pass before the storms say otherwise.",
                },
              ],
              () => game.completeChapter("prelude")
            );
          },
        },
      ],
    });
  },
};

// ===========================================================================
// Chapter One — "To Kill"
// Szeth-son-son-Vallano, Truthless of Shinovar, assassinates King Gavilar
// Kholin on the night Alethkar and the Parshendi sign their treaty.
// ===========================================================================

const szeth = {
  id: "szeth",
  title: "Chapter One — To Kill",
  blurb: "Szeth, a Truthless bound to obey, walks the halls of a king he must murder.",
  intro: [
    {
      epigraph: "“Szeth-son-son-Vallano, Truthless of Shinovar, wore white on the day he was to kill a king.”",
      title: "To Kill",
      subtitle: "The night of the treaty — 4,500 years after Aharietiam",
      text:
        "White, the color of the Shin death-marks — worn so the blood would show, so others would know what he was. He has been Truthless made, a slave to his Oathstone and the Lashings of the Stormlight. Tonight his masters command a king's death.",
    },
    {
      subtitle: "The palace of Kholinar",
      text:
        "Alethi celebrate a treaty signed with the Parshendi. Wine flows; no one watches the white-clad servant on the dais stairs. Reach King Gavilar. [WASD] move · [Space/J] strike · [Shift/K] Lash yourself forward on Stormlight.",
    },
  ],
  start(game) {
    game.setupCharacter({
      name: "Szeth",
      maxHp: 110,
      attack: 22,
      defense: 3,
      stormlightBonus: 24,
      stormlightCapacity: 120,
      stormlight: 80, // begins glowing with infused Stormlight
      powers: ["dash", "lashing"],
    });

    world(game, {
      id: "kholinar-feast",
      tileSize: 36,
      rows: [
        "##########################",
        "#........................#",
        "#..##......##......##.....#",
        "#..##......##......##.....#",
        "#........................#",
        "#........................#",
        "#..##......##......##.....#",
        "#..##......##......##.....#",
        "#........................#",
        "#........................#",
        "##########################",
      ],
      spawn: { tx: 2, ty: 9 },
      objective: "Cut your way to the king. Lash yourself forward to close the distance.",
      clearToExit: false,
      entities: [
        { type: "sphere", tx: 6, ty: 5, charge: 40 },
        { type: "sphere", tx: 13, ty: 9, charge: 40 },
        { type: "sphere", tx: 20, ty: 4, charge: 40 },
        guard(7, 4, "Palace guard"),
        guard(12, 6, "Palace guard"),
        guard(16, 8, "Elite of the King's Guard", { maxHp: 50, attack: 9 }),
        guard(19, 3, "Palace guard"),
        {
          type: "npc",
          tx: 23,
          ty: 1,
          name: "Gavilar",
          color: "#d8b24a",
          prompt: "confront the king",
          tree: {
            start: {
              id: "start",
              speaker: "Gavilar",
              text: "Wit warned me an assassin walked tonight. So they sent a Shin man — white clothes, white death. Do it, then. I am ready.",
              next: "b",
            },
            b: {
              id: "b",
              speaker: "Szeth",
              text: "You should not have invited the storm into your house, King of Alethkar. I do not wish this. But I am Truthless, and I obey.",
              next: "c",
            },
            c: {
              id: "c",
              speaker: "Gavilar",
              text: "The Parshendi sent you... why? I have done what they asked. Tell my brother — he must find the most important words a man can say.",
              next: "d",
            },
            d: {
              id: "d",
              speaker: "Gavilar",
              text: "There is a black sphere here, in my pocket. Take it to... to Dalinar. 'Unite them,' tell him. The words... the words are accepted.",
              next: "e",
            },
            e: {
              id: "e",
              speaker: "Szeth",
              text: "I leave you your last breath, and carry your curse with mine. This was a Truthless act, and the shame is added to my stone.",
              end: true,
            },
          },
          onTalk: (game, scene) => {
            if (scene._done) return;
            scene._done = true;
            narrate(
              game,
              [
                {
                  subtitle: "The king is dead",
                  text:
                    "Gavilar Kholin falls. In his hand, a strange black sphere that should hold Stormlight but instead seems to drink the light from the room. Szeth pockets it and walks out a window, Lashing himself into the night.",
                },
              ],
              () => game.completeChapter("szeth")
            );
          },
        },
      ],
    });
  },
};

// ===========================================================================
// Chapter Two — Kaladin: "Bridge Four"
// Months later, the surgeon's son turned soldier turned slave runs bridges for
// Highprince Sadeas. The signature BRIDGE RUN minigame.
// ===========================================================================

const kaladin = {
  id: "kaladin",
  title: "Chapter Two — Bridge Four",
  blurb: "A slave brand on his forehead, Kaladin carries bridges across the chasms for Sadeas.",
  intro: [
    {
      epigraph: "“Ten orders. We were loved, once. Why have you forsaken us, Almighty!”",
      title: "Bridge Four",
      subtitle: "Sadeas's warcamp, the Shattered Plains",
      text:
        "Eight months after the assassination, the Alethi wage the War of Reckoning against the Parshendi. Kaladin Stormblessed — once a soldier, now a slave — is given the worst duty in the army: bridgeman. Bridge crews sprint wooden bridges into Parshendi arrows so the lords can cross the chasms.",
    },
  ],
  start(game) {
    game.setupCharacter({
      name: "Kaladin",
      maxHp: 90,
      attack: 12,
      defense: 1,
      stormlightCapacity: 100,
      powers: [], // no Surges yet — just a man with a spear
    });

    // A short staging area in the bridge camp before the run.
    world(game, {
      id: "bridge-camp",
      tileSize: 36,
      rows: [
        "######################",
        "#....................#",
        "#..##............##..#",
        "#....................#",
        "#....................#",
        "#..##............##..#",
        "#....................#",
        "######################",
      ],
      spawn: { tx: 2, ty: 4 },
      objective: "Find Teft, then take your place under Bridge Four.",
      entities: [
        {
          type: "npc",
          tx: 8,
          ty: 3,
          name: "Teft",
          color: "#7fa86b",
          prompt: "talk to Teft",
          tree: {
            start: { id: "start", speaker: "Teft", text: "New blood. Don't bother learnin' names — bridgemen don't last. You run, you carry, you bleed.", next: "b" },
            b: { id: "b", speaker: "Kaladin", text: "I've buried more men than you've met, old man. I'm done dying. And I'm done letting the men around me die.", next: "c" },
            c: { id: "c", speaker: "Teft", text: "...Storms. You actually mean it. Huh. Bridge up, then, Stormblessed. Try not to get us all killed.", end: true },
          },
        },
        {
          type: "npc",
          tx: 8,
          ty: 5,
          name: "Syl",
          color: "#bfe6ff",
          prompt: "the windspren",
          tree: {
            start: { id: "start", speaker: "Syl", text: "You're sad. You're always sad. But you didn't run when the others did. I like that. I think I'll stay.", end: true },
          },
        },
        { type: "sign", tx: 4, ty: 6, speaker: "Bridgeleader", text: "BRIDGE FOUR: thirty-nine dead this month. The chasm doesn't count survivors. It counts the slow." },
        {
          type: "exit",
          tx: 20,
          ty: 4,
          label: "To the bridge",
          prompt: "lift the bridge",
          color: "rgba(232,160,60,0.6)",
          onTrigger: (game) => startBridgeRun(game),
        },
      ],
    });
  },
};

/** The bridge-run minigame plus its framing narration and aftermath. */
function startBridgeRun(game) {
  narrate(
    game,
    [
      {
        subtitle: "Bridge up!",
        text:
          "Twenty-four men lift the bridge and run. The chasm yawns ahead; across it the Parshendi raise their bows. The lords order Bridge Four to draw the arrows so their own crews live. HOLD [Space/Shift] to BRACE — lead from the arrow side and shield the crew through each volley.",
      },
    ],
    () => {
      game.scenes.replace(
        new BridgeRunScene(
          { crewSize: 24, minCarriers: 8, goalDistance: 1000 },
          {
            seed: 13,
            onComplete: () => {
              narrate(
                game,
                [
                  {
                    subtitle: "Across",
                    text:
                      "The bridge slams down. Bridge Four crosses, fewer than before but alive — more alive than any crew has a right to be. The men look at Kaladin differently now. He kept them breathing.",
                  },
                  {
                    epigraph: "“I will protect even those I hate, so long as it is right.”",
                    subtitle: "Words half-formed",
                    text:
                      "Something stirs in the back of his mind — words he cannot yet speak. Syl spins overhead, brighter than a windspren should be. Kaladin Stormblessed has decided to live. And to make Bridge Four live with him.",
                  },
                ],
                () => game.completeChapter("kaladin")
              );
            },
          }
        )
      );
    }
  );
}

// ===========================================================================
// Chapter Three — Shallan: "The Palanaeum"
// In the city of Kharbranth, Shallan Davar becomes ward to the heretic scholar
// Jasnah Kholin — and studies the Soulcaster she means to steal. The
// SOULCASTING minigame.
// ===========================================================================

const shallan = {
  id: "shallan",
  title: "Chapter Three — The Palanaeum",
  blurb: "Shallan wards under Jasnah Kholin and learns the art of Soulcasting.",
  intro: [
    {
      epigraph: "“The purpose of a storyteller is not to tell you how to think, but to give you questions to think upon.”",
      title: "The Palanaeum",
      subtitle: "Kharbranth, City of Bells",
      text:
        "Far from the war, Shallan Davar has crossed the world to find one woman: Jasnah Kholin, sister to a dead king, scholar, heretic — and Soulcaster. Shallan means to learn from her. She also means to steal the fabrial that could save her ruined House.",
    },
  ],
  start(game) {
    game.setupCharacter({
      name: "Shallan",
      maxHp: 70,
      attack: 6,
      defense: 1,
      stormlightCapacity: 100,
      stormlight: 100,
      powers: [],
    });

    world(game, {
      id: "palanaeum",
      tileSize: 36,
      rows: [
        "####################",
        "#..................#",
        "#..####....####....#",
        "#..................#",
        "#..####....####....#",
        "#..................#",
        "#..####....####....#",
        "#..................#",
        "####################",
      ],
      spawn: { tx: 2, ty: 7 },
      objective: "Speak with Jasnah, then practice with the Soulcaster.",
      entities: [
        { type: "sphere", tx: 5, ty: 1, charge: 50 },
        { type: "sphere", tx: 14, ty: 5, charge: 50 },
        { type: "sign", tx: 9, ty: 7, speaker: "Palanaeum", text: "The greatest library on Roshar. Ten million books descend into the rock. Silence is law here." },
        {
          type: "npc",
          tx: 16,
          ty: 2,
          name: "Jasnah",
          color: "#9b6bff",
          prompt: "study with Jasnah",
          tree: {
            start: {
              id: "start",
              speaker: "Jasnah",
              text: "You wish to be my ward. You are unprepared, undereducated, and — I suspect — hiding something. And yet you crossed an ocean to find me. That is not nothing.",
              next: "b",
            },
            b: {
              id: "b",
              speaker: "Shallan",
              text: "Teach me, Brightness. I learn quickly. I draw what I see, and I see... more than most.",
              next: "c",
            },
            c: {
              id: "c",
              speaker: "Jasnah",
              text: "Then learn this. A Soulcaster commands the Ten Essences. To change a thing, you must convince it to be something else. Choose the right gemstone, and pour Stormlight until the object forgets what it was. Try.",
              end: true,
            },
          },
          onTalk: (game, scene) => {
            if (scene._done) return;
            scene._done = true;
            startSoulcasting(game);
          },
        },
      ],
    });
  },
};

/** The Soulcasting puzzle set plus framing + Shallan's quiet betrayal. */
function startSoulcasting(game) {
  game.scenes.replace(
    new SoulcastScene(
      [
        { from: "Stone", to: "Smoke", gem: "Smokestone", resistance: 90, perPush: 22 },
        { from: "Water", to: "Fire", gem: "Ruby", resistance: 110, perPush: 22 },
        { from: "Air", to: "Crystal", gem: "Diamond", resistance: 120, perPush: 22 },
      ],
      {
        onComplete: () => {
          narrate(
            game,
            [
              {
                subtitle: "Transformation",
                text:
                  "Stone becomes smoke; air becomes crystal. Stormlight obeys the gem and the will behind it. Jasnah nods, almost approving. 'You have a gift,' she says. 'Most never feel the Essences answer at all.'",
              },
              {
                epigraph: "“I'm sorry. Truly.”",
                subtitle: "What Shallan came to do",
                text:
                  "That night Shallan looks at the Soulcaster she came to steal — and at the woman who is, against all expectation, beginning to trust her. The theft would save her family. It would also be a betrayal. She has not decided. Not yet.",
              },
            ],
            () => game.completeChapter("shallan")
          );
        },
      }
    )
  );
}

// ===========================================================================
// Chapter Four — Kaladin flashback: "The Shardbearer"
// Eight months before the bridges: squadleader Kaladin fells a Shardbearer on
// a battlefield in Alethkar — and Brightlord Amaram repays him with a brand.
// ===========================================================================

const amaram = {
  id: "amaram",
  title: "Chapter Four — The Shardbearer",
  blurb: "Eight months ago: Kaladin fells a Shardbearer, and learns what lighteyes are worth.",
  intro: [
    {
      epigraph: "“A spear in his hands, his brother safe behind him — that was all he had ever asked.”",
      title: "The Shardbearer",
      subtitle: "Amaram's army, northern Alethkar — eight months ago",
      text:
        "Before the brands. Before the bridges. Kaladin, son of a surgeon, is a squadleader in Brightlord Amaram's army — nineteen years old and already a legend among the spearmen, because his squad lives where others die. Today, two border lords squabble over a hilltop that matters to no one.",
    },
    {
      subtitle: "The battle turns",
      text:
        "Then the line shatters. A SHARDBEARER strides through the army like a man through tall grass, Blade flickering, dead men ungrieved behind him — and he is cutting straight toward Amaram. Kaladin's squad is all that stands in his path. Protect them. Kill him. [Space/J] strike — keep moving, never trade blows standing still.",
    },
  ],
  start(game) {
    game.setupCharacter({
      name: "Kaladin",
      maxHp: 120,
      attack: 16,
      defense: 2,
      stormlightCapacity: 100,
      powers: [], // no Stormlight, no Surges — just a spearman at his peak
    });

    world(game, {
      id: "amaram-battlefield",
      tileSize: 36,
      rows: [
        "##########################",
        "#........................#",
        "#...##...........##......#",
        "#........................#",
        "#........................#",
        "#.....##........##.......#",
        "#........................#",
        "#........................#",
        "##########################",
      ],
      spawn: { tx: 2, ty: 6 },
      objective: "Bring down the Shardbearer before he reaches Amaram's banner.",
      clearToExit: true,
      entities: [
        { type: "decoration", tx: 23, ty: 1, w: 10, h: 30, color: "#3f7d4e" }, // Amaram's banner
        { type: "sign", tx: 4, ty: 3, speaker: "Squadleader Kaladin", text: "Cenn, stay behind me. Dallet, hold the squad in tight formation. Nobody dies today. NOBODY." },
        enemySoldier(8, 3, "Enemy spearman"),
        enemySoldier(12, 5, "Enemy spearman"),
        enemySoldier(16, 2, "Enemy spearman"),
        {
          type: "enemy",
          tx: 18,
          ty: 5,
          w: 36,
          h: 36,
          color: "#cfd2da",
          speed: 46,
          aggro: 340,
          dropSphere: 0,
          combatant: { name: "The Shardbearer", maxHp: 220, attack: 17, defense: 4 },
        },
        {
          type: "exit",
          tx: 23,
          ty: 6,
          label: "The fallen Shardbearer",
          prompt: "stand over the Shardbearer",
          color: "rgba(207,210,218,0.6)",
          onTrigger: (game) => afterShardbearer(game),
        },
      ],
    });
  },
};

/** Aftermath of the Shardbearer kill: the refusal, then Amaram's betrayal. */
function afterShardbearer(game) {
  narrate(
    game,
    [
      {
        subtitle: "The impossible",
        text:
          "A darkeyed spearman has slain a Shardbearer. The man's Blade lies on the stone where it fell, gemstone winking in the pommel; his Plate has gone still around a corpse. By right of battle, both belong to Kaladin now — wealth enough to buy a princedom, and a heartbeat away from lighteyes himself.",
      },
      {
        subtitle: "The refusal",
        text:
          "Kaladin looks at the Blade and feels only revulsion. It killed his men. Half his squad lies on this hilltop because of it. He is a spearman, not a lighteyes — he will not become the thing he fought. He gives the Shards away and goes to bind his soldiers' wounds. Amaram has summoned him to the command tent.",
      },
    ],
    () => {
      world(game, {
        id: "amaram-tent",
        tileSize: 36,
        rows: [
          "##################",
          "#................#",
          "#................#",
          "#................#",
          "#................#",
          "#................#",
          "##################",
        ],
        spawn: { tx: 2, ty: 3 },
        objective: "Report to Brightlord Amaram.",
        entities: [
          // Amaram's personal guards flank the tent.
          { type: "decoration", tx: 12, ty: 1, w: 20, h: 24, color: "#5d6a52" },
          { type: "decoration", tx: 12, ty: 5, w: 20, h: 24, color: "#5d6a52" },
          { type: "sign", tx: 6, ty: 5, speaker: "Dallet", text: "Watch yourself in there, son. Lighteyes don't summon spearmen to say thank you." },
          {
            type: "npc",
            tx: 14,
            ty: 3,
            name: "Amaram",
            color: "#3f7d4e",
            prompt: "report to Amaram",
            tree: {
              start: {
                id: "start",
                speaker: "Amaram",
                text: "Kaladin. You saved my life today — a full Shardbearer, felled by a darkeyed spearman. Remarkable. They tell me you refused the Shards. Where are they now?",
                next: "b",
              },
              b: {
                id: "b",
                speaker: "Kaladin",
                text: "I gave them away, Brightlord. To one of my men. I want no part of them — I'm a spearman. That Blade killed half my squad.",
                next: "ask",
              },
              ask: {
                id: "ask",
                speaker: "Amaram",
                text: "A Shardblade is not a thing one simply gives away, son. Think of what it means — of who must carry it. Give the Shards to me, and I will see you and your men rewarded beyond any spearman's dreams.",
                choices: [
                  { text: "They were never mine to give you. I renounced them.", next: "turn" },
                  { text: "Why do you want them, Brightlord? You already have my answer.", next: "turn" },
                  { text: "Take them, then. I want no part of lighteyes' games.", next: "turn" },
                ],
              },
              turn: {
                id: "turn",
                speaker: "Amaram",
                text: "I feared you would say something like that. A pity. A spearman who can kill a Shardbearer is a story, and stories spread. Guards — the men of his squad who saw. Kill them.",
                next: "horror",
              },
              horror: {
                id: "horror",
                speaker: "Kaladin",
                text: "No — NO! They fought for you! Dallet — !  ...You planned this. Before I even walked in. You were always going to take it.",
                next: "brand",
              },
              brand: {
                id: "brand",
                speaker: "Amaram",
                text: "The Blade is mine now; the world will be told I slew the Shardbearer. You will be branded shash — dangerous — and sold as a slave, and no one will believe the rantings of a slave. What I do now, I do for the good of Alethkar.",
                end: true,
              },
            },
            onTalk: (game, scene) => {
              if (scene._done) return;
              scene._done = true;
              narrate(
                game,
                [
                  {
                    subtitle: "Shash",
                    text:
                      "The brand on his forehead burns for days. Glyphs: shash, dangerous — and beneath it, later, the mark of a runaway. His men are dead. The Blade that should have damned or exalted him hangs at Amaram's hip, and the world calls Amaram a hero.",
                  },
                  {
                    subtitle: "Down to the bridges",
                    text:
                      "Slave caravans carry Kaladin south and east, master after master, escape after failed escape, until nothing is left to sell him for but the bridge crews of the Shattered Plains. This is how Kaladin Stormblessed came to Bridge Four. This is the wound beneath everything.",
                  },
                ],
                () => game.completeChapter("amaram")
              );
            },
          },
        ],
      });
    }
  );
}

// ===========================================================================
// Chapter Five — Dalinar: "Visions in the Storm"
// Highprince Dalinar Kholin, brother to murdered Gavilar, is plagued by visions
// during the highstorms — visions that command him to UNITE THEM. The VISION
// minigame, expanded with the Midnight Essence town and Feverstone Keep.
// ===========================================================================

// New vision beats woven into the base gauntlet from visionScene.js. Defined
// here (content layer) rather than in the scene file so the scene code stays
// untouched. Same shape as the base beats: setting/speaker/text + choices with
// honor deltas and response lines, feeding the existing rating system.

const MIDNIGHT_TOWN_BEATS = [
  {
    id: "hebhome",
    setting: "A rural town, another age — a stranger's home",
    speaker: "Taffa, Heb's wife",
    text:
      "You wear another man's life: a one-room home, a fire in the hearth, a man named Heb and his wife and small daughter. Then the wall bursts. Things of Midnight Essence pour in — beasts of oily blackness, smooth as riverstone, all claws and wrongness. The only iron in reach is a fireplace poker.",
    choices: [
      { text: "Take up the poker and stand between the creatures and the family.", honor: 5, response: "It is not a Shardblade. You set your feet anyway. Life before death." },
      { text: "Push the family out the back and hold the doorway alone.", honor: 4, response: "The doorway is narrow. So, tonight, is the line between them and the dark." },
      { text: "Run. This is not your family, not your fight, not even your time.", honor: -4, response: "Their screams chase you into the rain. Some part of you never stops hearing them." },
    ],
  },
  {
    id: "radiants",
    setting: "The burning town — light cresting the ridge",
    speaker: "A woman in gleaming Shardplate",
    text:
      "When your arms are lead and the poker bent, light breaks over the town: two Knights Radiant. A woman in gleaming Plate summons her Blade from mist; a man in slate-grey armor moves like a falling boulder. Together they cut the Midnight Essence apart. The woman looks at your bloodied hands — and offers you her own Shardblade to hold the line, untrained as you are.",
    choices: [
      { text: "Accept the Blade with humility and guard the family while they fight.", honor: 4, response: "'Untrained, but you stood,' she says. 'The Knights Radiant exist so that ordinary people do not stand alone.'" },
      { text: "Refuse the Blade — the poker has served, and the Blade is hers.", honor: 1, response: "She smiles, and does not insist. There is more than one shape of honor." },
      { text: "Demand answers first: what are these things, and why did help come so late?", honor: -1, response: "'Questions after,' she says, already turning. 'Living people first.'" },
    ],
  },
];

const FEVERSTONE_BEAT = {
  id: "feverstone",
  setting: "Feverstone Keep — the Day of Recreance",
  speaker: "The voice of the Almighty",
  text:
    "Hundreds of Knights Radiant ride to the Keep — Windrunners in blue, Stonewards in deep red. They dismount as one. Without a word they drive their Shardblades into the stone, shed their Plate where it falls, and walk away, while the watching soldiers swarm down to scavenge what gods abandoned. No one will say why. 'These events will go down in history as the Day of Recreance,' the voice says. Then, softer, the command beneath every vision: UNITE THEM.",
  choices: [
    { text: "Catch a knight by the arm and demand to know why they break their oaths.", honor: 4, response: "He looks through you with hollow eyes and pulls free. Whatever they learned, it broke them. Unite them." },
    { text: "Run among them, begging even one to stay.", honor: 2, response: "Not one stops. A field of dead Blades hums behind you like a struck bell. Unite them." },
    { text: "Watch in silence. Some things must simply be witnessed.", honor: 1, response: "You memorize every face. Someone must remember what was lost here. Unite them." },
  ],
};

/** The base gauntlet with the new town beats early and Feverstone late. */
export function buildExpandedVisionBeats(base = DALINAR_VISION_BEATS) {
  const beats = [...base];
  const afterRefrain = beats.findIndex((b) => b.id === "refrain") + 1;
  beats.splice(afterRefrain, 0, ...MIDNIGHT_TOWN_BEATS);
  const beforeOath = beats.findIndex((b) => b.id === "oath");
  beats.splice(beforeOath < 0 ? beats.length : beforeOath, 0, FEVERSTONE_BEAT);
  return beats;
}

export const EXPANDED_VISION_BEATS = buildExpandedVisionBeats();

const dalinar = {
  id: "dalinar",
  title: "Chapter Five — Visions in the Storm",
  blurb: "Dalinar Kholin walks the highstorm's visions and weighs honor against survival.",
  intro: [
    {
      epigraph: "“Honor is dead. But I'll see what I can do.”",
      title: "Visions in the Storm",
      subtitle: "The Kholin warcamp",
      text:
        "Six years into the war, Highprince Dalinar — the Blackthorn — is changing. He clings to an ancient book his brother loved, The Way of Kings, while the other highprinces call him mad. For when the highstorms come, Dalinar is taken somewhere else, and shown things.",
    },
  ],
  start(game) {
    game.setupCharacter({
      name: "Dalinar",
      maxHp: 120,
      attack: 16,
      defense: 4,
      stormlightCapacity: 100,
      powers: [],
    });

    world(game, {
      id: "kholin-warcamp",
      tileSize: 36,
      rows: [
        "######################",
        "#....................#",
        "#....................#",
        "#....##......##......#",
        "#....................#",
        "#....##......##......#",
        "#....................#",
        "#....................#",
        "######################",
      ],
      spawn: { tx: 2, ty: 4 },
      objective: "Speak with Adolin, then shelter as the highstorm breaks.",
      entities: [
        {
          type: "npc",
          tx: 9,
          ty: 3,
          name: "Adolin",
          color: "#e0a93c",
          prompt: "talk to Adolin",
          tree: {
            start: { id: "start", speaker: "Adolin", text: "Father. The other highprinces are laughing again. They say the visions have unmanned you, that you'd have us all hold hands and sing.", next: "b" },
            b: { id: "b", speaker: "Dalinar", text: "Let them laugh. Gavilar's last word to me was 'unite them.' I will not dishonor my brother by ignoring it — however mad it makes me look.", next: "c" },
            c: { id: "c", speaker: "Adolin", text: "The stormwall's coming, Father. If you're going to... go wherever you go... go now. I'll keep watch.", end: true },
          },
        },
        { type: "sign", tx: 14, ty: 6, speaker: "The Codes", text: "Dalinar keeps the ancient Codes of war: always in uniform in a warcamp, never drunk, first to the battle and last to leave. The others mock him for it." },
        {
          type: "exit",
          tx: 20,
          ty: 4,
          label: "The stormwall",
          prompt: "face the highstorm",
          color: "rgba(155,107,255,0.6)",
          onTrigger: (game) => startVision(game),
        },
      ],
    });
  },
};

/** Dalinar's highstorm vision gauntlet, then the aftermath keyed to his rating. */
function startVision(game) {
  narrate(
    game,
    [
      {
        subtitle: "The storm takes him",
        text:
          "The stormwall hits like a god's fist. The world goes white — and then Dalinar is elsewhere, in another age, wearing another man's life. The visions test what kind of man he is. Choose with honor: protect the helpless, keep your oaths, unite rather than divide.",
      },
    ],
    () => {
      game.scenes.replace(
        new VisionScene(EXPANDED_VISION_BEATS, {
          onComplete: (result) => {
            game.progress.setFlag("dalinarRating", result.rating);
            game.progress.setFlag("dalinarUnited", result.united);
            const aftermath =
              result.united
                ? "Dalinar wakes with the words burning in him: UNITE THEM. He will gamble everything to bind the fractured highprinces into one — even if they think him mad. The path is set."
                : "Dalinar wakes shaken, the visions' demand sitting uneasy. UNITE THEM — but he is not yet sure he believes it, or himself. Still, he cannot unsee what he was shown.";
            narrate(
              game,
              [
                {
                  epigraph: "“The most important step a man can take. It's not the first one, is it? It's the next one.”",
                  subtitle: `The storm passes — your path: ${result.rating}`,
                  text: aftermath,
                },
              ],
              () => game.completeChapter("dalinar")
            );
          },
        })
      );
    }
  );
}

// ===========================================================================
// Chapter Six — Szeth: "The Assassin in White"
// Szeth's Oathstone has passed to a new, unnamed master who sends him against
// the rulers of the world. Two assassinations; one name left on the list.
// ===========================================================================

const assassin = {
  id: "assassin",
  title: "Chapter Six — The Assassin in White",
  blurb: "Szeth's new master sends him against the rulers of the world. He weeps, and obeys.",
  intro: [
    {
      epigraph: "“The wretch in white came in the night, and the king did not see morning.”",
      title: "The Assassin in White",
      subtitle: "Somewhere east of Shinovar",
      text:
        "Szeth's Oathstone has changed hands again — sold, traded, won, until it rests with a master whose face he has never seen, whose orders arrive written and sealed. The new commands are worse than any before: the rulers of the world must die, so that chaos will reign before the True Desolation comes.",
    },
    {
      subtitle: "The list",
      text:
        "He does not get to refuse. He is Truthless; he does as his master commands, and he adds the names to his list. Tonight the list says: Hanavanar, King of Jah Keved, feasting among his highprinces. [WASD] move · [Space/J] strike · [Shift/K] Lash forward on Stormlight.",
    },
  ],
  start(game) {
    game.setupCharacter({
      name: "Szeth",
      maxHp: 110,
      attack: 22,
      defense: 3,
      stormlightBonus: 24,
      stormlightCapacity: 120,
      stormlight: 80,
      powers: ["dash", "lashing"],
    });

    world(game, {
      id: "veden-feast-hall",
      tileSize: 36,
      rows: [
        "########################",
        "#......................#",
        "#..####..........####..#",
        "#......................#",
        "#.....##........##.....#",
        "#......................#",
        "#..####..........####..#",
        "#......................#",
        "########################",
      ],
      spawn: { tx: 2, ty: 7 },
      objective: "Reach King Hanavanar. His guards know the stories now — they will not hesitate.",
      clearToExit: false,
      entities: [
        { type: "sphere", tx: 6, ty: 1, charge: 40 },
        { type: "sphere", tx: 12, ty: 5, charge: 40 },
        { type: "sphere", tx: 18, ty: 7, charge: 40 },
        guard(5, 4, "Veden guard"),
        guard(10, 2, "Veden guard"),
        guard(13, 6, "Veden guard"),
        guard(17, 3, "Shield of the King", { maxHp: 55, attack: 9 }),
        {
          type: "npc",
          tx: 21,
          ty: 1,
          name: "Hanavanar",
          color: "#b65a3c",
          prompt: "reach the king",
          tree: {
            start: {
              id: "start",
              speaker: "Hanavanar",
              text: "The Assassin in White. So the stories out of Alethkar are true after all. I doubled my guard. I tripled it. And still you walk on my ceiling and bleed light like a god's own lantern.",
              next: "b",
            },
            b: {
              id: "b",
              speaker: "Szeth",
              text: "Your death is the wish of my master, Your Majesty. I am Truthless. I do not wish it — my wishes are nothing — but I obey, and I will weep for you after.",
              next: "c",
            },
            c: {
              id: "c",
              speaker: "Hanavanar",
              text: "Weep, then, monster. Jah Keved will not forget this night — none of the thrones of the world will. Whatever your master wants, it is not chaos for its own... sake...",
              end: true,
            },
          },
          onTalk: (game, scene) => {
            if (scene._done) return;
            scene._done = true;
            narrate(
              game,
              [
                {
                  subtitle: "The list grows",
                  text:
                    "The King of Jah Keved falls among his feast tables, and Szeth goes out through the high windows, walking on walls the Lashings make into floors. I am Truthless, he tells the night. I do as my master commands... and I add the names to my list.",
                },
                {
                  subtitle: "Westward",
                  text:
                    "There is no rest. The next sealed order is already waiting: Azimir, capital of Azir, and the bronze-walled palace of the Prime Aqasix. More guards. More stories of the white assassin. More names. Szeth weeps as he flies, and the wind takes the tears.",
                },
              ],
              () => startAzirAssassination(game)
            );
          },
        },
      ],
    });
  },
};

/** Second target: the Prime of Azir in the bronze palace at Azimir. */
function startAzirAssassination(game) {
  world(game, {
    id: "azir-bronze-palace",
    tileSize: 36,
    rows: [
      "######################",
      "#........#...........#",
      "#..####..#..####..####",
      "#........#...........#",
      "####..####..####..#..#",
      "#...........#.....#..#",
      "#..####..####..####..#",
      "#........#...........#",
      "######################",
    ],
    spawn: { tx: 2, ty: 7 },
    objective: "Thread the bronze corridors to the Prime. The whole palace is awake.",
    clearToExit: false,
    entities: [
      { type: "sphere", tx: 5, ty: 1, charge: 40 },
      { type: "sphere", tx: 11, ty: 3, charge: 40 },
      { type: "sphere", tx: 15, ty: 7, charge: 40 },
      guard(4, 3, "Azish guard"),
      guard(7, 5, "Azish guard"),
      guard(11, 1, "Azish guard"),
      guard(13, 5, "Azish guard"),
      guard(17, 3, "Vizier's blade", { maxHp: 50, attack: 9 }),
      guard(19, 7, "Imperial guard", { maxHp: 55, attack: 9 }),
      {
        type: "npc",
        tx: 20,
        ty: 1,
        name: "The Prime",
        color: "#d8b24a",
        prompt: "reach the Prime",
        tree: {
          start: {
            id: "start",
            speaker: "The Prime",
            text: "They said no one could pass the bronze walls. They wrote essays proving it. Please — whatever you were paid, Azir will double it. Treble it. You weep — I can see you weeping. Why do this?",
            next: "b",
          },
          b: {
            id: "b",
            speaker: "Szeth",
            text: "Because my master commands it, Excellency, and I am Truthless. Weeping does not stay my hand. Nothing stays my hand. That is the horror of it.",
            end: true,
          },
        },
        onTalk: (game, scene) => {
          if (scene._done) return;
          scene._done = true;
          narrate(
            game,
            [
              {
                subtitle: "Chaos, by design",
                text:
                  "The Prime of Azir is dead, and the bronze palace fills with wailing. Kings, primes, princes — throne by throne the world is being beheaded, and every death wears white. Chaos spreads exactly as Szeth's unseen master intends: a world too broken to stand together when the True Desolation comes.",
              },
              {
                subtitle: "The master revealed",
                text:
                  "Far away, in the quiet City of Bells, a kindly old man reads the reports and grieves over what he believes must be done. Taravangian, King of Kharbranth — keeper of hospitals, friend to the poor — holds the Oathstone now. He unrolls Szeth's list and adds the final name: DALINAR KHOLIN.",
              },
            ],
            () => game.completeChapter("assassin")
          );
        },
      },
    ],
  });
}

// ===========================================================================
// Chapter Seven — The Tower (the finale of Book One)
// On a distant plateau, Sadeas withdraws his army and leaves Dalinar's forces
// to die against the Parshendi. Kaladin — now touched by Stormlight — leads
// Bridge Four back across the chasms to save the Blackthorn. Climactic combat.
// ===========================================================================

const tower = {
  id: "tower",
  title: "The Tower",
  blurb: "Sadeas springs his trap; Kaladin and Bridge Four charge back to save Dalinar.",
  intro: [
    {
      epigraph: "“You cannot have my pain.”",
      title: "The Tower",
      subtitle: "A plateau deep in the Shattered Plains",
      text:
        "Dalinar and Sadeas hunt a Parshendi army together — until Sadeas pulls his forces back and abandons the Kholin army to be destroyed. Across the chasms, Kaladin watches the betrayal unfold. Bridge Four owes Dalinar nothing. Kaladin orders them back anyway.",
    },
    {
      subtitle: "Stormblessed",
      text:
        "Stormlight roars through Kaladin now — more than any bridgeman should hold. He can Lash himself across the stone, faster than thought. Cut a path through the Parshendi to Dalinar. [Shift/K] to Lash forward · [Space/J] to strike · grab spheres to refill the storm.",
    },
  ],
  start(game) {
    game.setupCharacter({
      name: "Kaladin",
      maxHp: 130,
      attack: 20,
      defense: 4,
      stormlightBonus: 30,
      stormlightCapacity: 140,
      stormlight: 100,
      powers: ["dash", "lashing"],
    });

    world(game, {
      id: "the-tower-plateau",
      tileSize: 36,
      rows: [
        "############################",
        "#..........................#",
        "#..~~~..............~~~....#",
        "#..~~~..............~~~....#",
        "#..........................#",
        "#......##........##........#",
        "#..........................#",
        "#..~~~..............~~~....#",
        "#..~~~..............~~~....#",
        "#..........................#",
        "############################",
      ],
      spawn: { tx: 2, ty: 5 },
      objective: "Cut through the Parshendi and reach Dalinar. Lash across the chasms.",
      clearToExit: true,
      entities: [
        { type: "sphere", tx: 7, ty: 1, charge: 50 },
        { type: "sphere", tx: 14, ty: 9, charge: 50 },
        { type: "sphere", tx: 21, ty: 1, charge: 50 },
        parshendi(8, 4, "Parshendi warrior"),
        parshendi(11, 6, "Parshendi warrior"),
        parshendi(15, 3, "Parshendi warrior"),
        parshendi(17, 7, "Parshendi shardbearer", { maxHp: 80, attack: 12, speed: 55 }),
        parshendi(20, 5, "Parshendi warrior"),
        {
          type: "npc",
          tx: 26,
          ty: 5,
          name: "Dalinar",
          color: "#c89b3c",
          prompt: "reach Dalinar",
          tree: {
            start: { id: "start", speaker: "Dalinar", text: "Bridgeman. You came back across the chasms — for us? Sadeas abandoned us to die and you, a slave, turned around. Why?", next: "b" },
            b: { id: "b", speaker: "Kaladin", text: "Because it was right, Brightlord. That's the only reason that's ever mattered. Now get your men to my bridges. We're getting everyone out.", next: "c" },
            c: { id: "c", speaker: "Dalinar", text: "Storms. There's something different about you, son. When this is done — Bridge Four does not go back to Sadeas. You have my word.", end: true },
          },
          onTalk: (game, scene) => {
            if (scene._done) return;
            scene._done = true;
            finishTheTower(game);
          },
        },
      ],
    });
  },
};

/** The Tower's resolution — the rescue, the trade, and the end of Book One. */
function finishTheTower(game) {
  const united = game.progress.getFlag("dalinarUnited");
  narrate(
    game,
    [
      {
        subtitle: "The withdrawal",
        text:
          "Bridge Four lays its bridges under arrowfall, and the trapped Kholin army pours back across the chasms. It costs them — bridgemen and soldiers both — but the army that Sadeas left for dead marches home through his own warcamp, alive, with a glowing bridgeman at its head.",
      },
      {
        subtitle: "The price of a Blade",
        text:
          "In front of every gathered eye, Dalinar walks to Sadeas and makes a trade no highprince can refuse or ever forget: Oathbringer, his priceless Shardblade, for every bridgeman Sadeas owns. One Blade, for a thousand slaves. 'You sold them cheap,' Dalinar tells him. Then he takes the bridgemen into his own guard — free men, every one." +
          (united
            ? " The visions asked him to unite. This, at last, is how it begins."
            : " He does not yet trust the visions. But he knows what honor demanded today."),
      },
      {
        epigraph: "“Life before death. Strength before weakness. Journey before destination.”",
        subtitle: "The end of Book One",
        text:
          "Bridge Four stands in Kholin blue. Shallan sails toward the Shattered Plains with Jasnah's secrets. The Assassin in White unrolls a list with one name left on it. And Dalinar, asked how a man keeps walking under all that weight, gives the only answer that has ever mattered: The most important step a man can take. It's not the first one, is it? It's the next one. Always the next step.",
      },
    ],
    () => game.completeChapter("tower")
  );
}

// --- entity factory helpers ------------------------------------------------

/** A human guard enemy at a tile, with sensible defaults. */
function guard(tx, ty, name, over = {}) {
  return {
    type: "enemy",
    tx,
    ty,
    color: "#b9a05a",
    speed: over.speed ?? 65,
    aggro: over.aggro ?? 240,
    dropSphere: over.dropSphere ?? 0,
    combatant: { name, maxHp: over.maxHp ?? 32, attack: over.attack ?? 7, defense: over.defense ?? 1 },
  };
}

/** An enemy soldier (rival army) at a tile. */
function enemySoldier(tx, ty, name, over = {}) {
  return {
    type: "enemy",
    tx,
    ty,
    color: "#9a4a3c",
    speed: over.speed ?? 60,
    aggro: over.aggro ?? 230,
    dropSphere: over.dropSphere ?? 0,
    combatant: { name, maxHp: over.maxHp ?? 30, attack: over.attack ?? 7, defense: over.defense ?? 1 },
  };
}

/** A Parshendi warrior enemy at a tile. */
function parshendi(tx, ty, name, over = {}) {
  return {
    type: "enemy",
    tx,
    ty,
    color: "#c0563a",
    speed: over.speed ?? 70,
    aggro: over.aggro ?? 260,
    dropSphere: over.dropSphere ?? 30,
    combatant: { name, maxHp: over.maxHp ?? 46, attack: over.attack ?? 9, defense: over.defense ?? 2 },
  };
}

export const CHAPTERS = [prelude, szeth, kaladin, shallan, amaram, dalinar, assassin, tower];
