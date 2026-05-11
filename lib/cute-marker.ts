/**
 * Decorative marker hint for the single allowed location (Yunnan) in memory UI.
 */
const RULES: [RegExp, string][] = [
  [/yunnan|云南|云|lijiang|丽江|dali|大理/i, "🏝️"],
  [/mist|雾|mountain|山|ridge/i, "⛰️"],
  [/dawn|晨|sunrise/i, "🌅"],
];

const FALLBACK = "💌";

export function landmarkEmoji(name: string, id: string): string {
  for (const [re, emoji] of RULES) {
    if (re.test(name) || re.test(id)) return emoji;
  }
  return FALLBACK;
}
