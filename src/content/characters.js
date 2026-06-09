// Character roster: display colors for dialogue tags and entity rendering.
// Keeping this in one place keeps the cast visually consistent across chapters.

import { PALETTE } from "../engine/renderer.js";

export const CHARACTERS = {
  Kaladin: { color: "#5b8dd9", role: "Bridgeman, surgeon's son" },
  Syl: { color: PALETTE.glow, role: "Honorspren" },
  Szeth: { color: "#e8ecf5", role: "Truthless of Shinovar" },
  Gavilar: { color: PALETTE.gold, role: "King of Alethkar" },
  Shallan: { color: "#e0654f", role: "Scholar, ward of Jasnah" },
  Jasnah: { color: "#9b6bff", role: "Heretic, scholar, Soulcaster" },
  Dalinar: { color: "#c89b3c", role: "Highprince, the Blackthorn" },
  Adolin: { color: "#e0a93c", role: "Dalinar's son" },
  Elhokar: { color: "#b9a05a", role: "King of Alethkar" },
  Sadeas: { color: "#7a5cc0", role: "Highprince of Information" },
  Teft: { color: "#7fa86b", role: "Bridgeman, old soldier" },
  Rock: { color: "#cf8a4a", role: "Bridgeman, Horneater" },
  Bridge4: { color: PALETTE.blue, role: "Bridge Four" },
  Wit: { color: "#cfd6e4", role: "The King's Wit" },
  Parshendi: { color: PALETTE.parshendi, role: "Listeners" },
  Narrator: { color: PALETTE.dim, role: "" },
};

export function speakerColor(name) {
  return CHARACTERS[name]?.color ?? PALETTE.white;
}
