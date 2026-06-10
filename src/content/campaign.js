// The campaign: a six-chapter adaptation of The Way of Kings (Stormlight
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
// Chapter 1 — Prologue: "To Kill"
// Szeth-son-son-Vallano, Truthless of Shinovar, assassinates King Gavilar
// Kholin on the night Alethkar and the Parshendi sign their treaty.
// ===========================================================================

const prologue = {
  id: "prologue",
  title: "Prologue — To Kill",
  blurb: "Szeth, a Truthless bound to obey, walks the halls of a king he must murder.",
  intro: [
    {
      epigraph: "“Szeth-son-son-Vallano, Truthless of Shinovar, wore white on the day he was to kill a king.”",
      title: "To Kill",
      subtitle: "The night of the treaty",
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
              () => game.completeChapter("prologue")
            );
          },
        },
      ],
    });
  },
};

// ===========================================================================
// Chapter 2 — Kaladin: "The Shattered Plains"
// Months later, the surgeon's son turned soldier turned slave runs bridges for
// Highprince Sadeas. The signature BRIDGE RUN minigame.
// ===========================================================================

const kaladin = {
  id: "kaladin",
  title: "Chapter One — Bridge Four",
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
// Chapter 3 — Shallan: "Jasnah's Ward"
// In the city of Kharbranth, Shallan Davar becomes ward to the heretic scholar
// Jasnah Kholin — and studies the Soulcaster she means to steal. The
// SOULCASTING minigame.
// ===========================================================================

const shallan = {
  id: "shallan",
  title: "Chapter Two — The Palanaeum",
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
// Chapter 4 — Dalinar: "The Blackthorn"
// Highprince Dalinar Kholin, brother to murdered Gavilar, is plagued by visions
// during the highstorms — visions that command him to UNITE THEM. The VISION
// minigame.
// ===========================================================================

const dalinar = {
  id: "dalinar",
  title: "Chapter Three — Visions in the Storm",
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
        new VisionScene(DALINAR_VISION_BEATS, {
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
// Chapter 5 — The Tower: "Sadeas's Betrayal"
// On a distant plateau, Sadeas withdraws his army and leaves Dalinar's forces
// to die against the Parshendi. Kaladin — now touched by Stormlight — leads
// Bridge Four back across the chasms to save the Blackthorn. Climactic combat.
// ===========================================================================

const tower = {
  id: "tower",
  title: "Chapter Four — The Tower",
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
            narrate(
              game,
              [
                {
                  subtitle: "The withdrawal",
                  text:
                    "Bridge Four lays its bridges and Dalinar's army escapes the trap. It costs them, but they live. Furious at Sadeas's treachery, Dalinar trades his priceless Shardblade for every one of Sadeas's bridgemen — and sets them free.",
                },
              ],
              () => game.completeChapter("tower")
            );
          },
        },
      ],
    });
  },
};

// ===========================================================================
// Chapter 6 — Finale: "The First Ideal"
// In the chasm before the rescue, on the edge of death, Kaladin speaks the
// Words. Syl becomes a Shardblade. The Knights Radiant return. Resolution.
// ===========================================================================

const finale = {
  id: "finale",
  title: "Chapter Five — Words of Radiance",
  blurb: "On the edge of death, Kaladin speaks the First Ideal and the Radiants stir again.",
  intro: [
    {
      epigraph: "“Life before death. Strength before weakness. Journey before destination.”",
      title: "The First Ideal",
      subtitle: "A chasm, moments before",
      text:
        "Hours earlier, in the wet dark of a chasm, Kaladin bled and despaired and chose, finally, to stand. Syl offered him a question, and an oath older than the kingdoms. This is the moment everything turned.",
    },
  ],
  start(game) {
    game.setupCharacter({
      name: "Kaladin",
      maxHp: 140,
      attack: 22,
      defense: 5,
      stormlightBonus: 32,
      stormlightCapacity: 150,
      stormlight: 150,
      powers: ["dash", "lashing"],
    });

    // A short, charged sequence: speak the Ideal (dialogue), then a final
    // surge of resolve carries us out.
    narrate(
      game,
      [
        {
          subtitle: "Syl asks",
          text:
            "'Say the Words,' Syl whispers, no longer a mere windspren but something far older — an honorspren, a piece of a dead god's honor. 'They've been forgotten for so long. Say them, and live.'",
        },
      ],
      () => speakTheIdeal(game)
    );
  },
};

function speakTheIdeal(game) {
  world(game, {
    id: "the-oath",
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
    objective: "Speak with Syl, then walk into the light.",
    entities: [
      { type: "sphere", tx: 6, ty: 2, charge: 60 },
      { type: "sphere", tx: 6, ty: 4, charge: 60 },
      {
        type: "npc",
        tx: 9,
        ty: 3,
        name: "Syl",
        color: "#bfe6ff",
        prompt: "speak the Words",
        tree: {
          start: { id: "start", speaker: "Syl", text: "You're dying, Kaladin. But you don't have to. There's a thing you can become — a thing the world has needed for two thousand years. Will you?", hasChoices: true,
            choices: [
              { text: "“I will protect those who cannot protect themselves.”", next: "good" },
              { text: "“I will protect even those I hate, so long as it is right.”", next: "good" },
              { text: "I'm not strong enough.", next: "doubt" },
            ],
          },
          doubt: { id: "doubt", speaker: "Syl", text: "You've been strong enough this whole time. You just didn't have the words for it. Say them. I'm right here.", hasChoices: true,
            choices: [
              { text: "“Life before death. Strength before weakness. Journey before destination.”", next: "good" },
            ],
          },
          good: { id: "good", speaker: "Syl", text: "Yes! YES! That's the First Ideal of the Knights Radiant. Now — catch me!", next: "blade" },
          blade: { id: "blade", speaker: "Kaladin", text: "Stormlight floods through me. Syl shimmers, lengthens, becomes a Blade of living light in my hand. The Radiants are dead. The Radiants are reborn.", end: true },
        },
        onTalk: (game, scene) => {
          if (scene._done) return;
          scene._done = true;
          narrate(
            game,
            [
              {
                epigraph: "“I am Stormblessed.”",
                subtitle: "Dawn over the Shattered Plains",
                text:
                  "Bridge Four is free. Dalinar Kholin has a bodyguard who glows. Shallan sails toward the war with secrets of her own. Jasnah watches the spren gather. And in the storms, a recorded voice still pleads: unite them.",
              },
            ],
            () => endGame(game)
          );
        },
      },
    ],
  });
}

/** Final completion — branches the closing line on Dalinar's vision rating. */
function endGame(game) {
  const rating = game.progress.getFlag("dalinarRating");
  const line =
    rating === "Radiant"
      ? "You walked the visions as a true Radiant. Honor is not dead while men like Dalinar still choose it."
      : rating
      ? `Dalinar walked the visions as one ${ratingPhrase(rating)}. The road ahead is long, but the first steps are taken.`
      : "The storms have spoken, and a few have listened. That is how every age begins.";
  narrate(
    game,
    [
      {
        title: "The Way of Kings",
        subtitle: "Book One — complete",
        text: line,
      },
    ],
    () => game.completeChapter("finale")
  );
}

function ratingPhrase(rating) {
  switch (rating) {
    case "Honorable":
      return "Honorable";
    case "Wavering":
      return "Wavering, but unbroken";
    case "Fallen":
      return "Fallen, yet not beyond redemption";
    default:
      return rating;
  }
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

export const CHAPTERS = [prologue, kaladin, shallan, dalinar, tower, finale];
