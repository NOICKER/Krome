export const UNIVERSAL_BRICK_ACCENT = "#62699D";

function normalizeHexColor(color: string) {
  const trimmed = color.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed;
  }

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return null;
}

export function withAlpha(color: string, alphaHex: string) {
  const normalizedColor = normalizeHexColor(color);
  const normalizedAlpha = alphaHex.trim().toLowerCase();

  if (!normalizedColor || !/^[0-9a-f]{2}$/i.test(normalizedAlpha)) {
    return normalizedColor;
  }

  return `${normalizedColor}${normalizedAlpha}`;
}

export function resolveBrickAccent(subjectColor?: string) {
  return normalizeHexColor(subjectColor ?? "") ?? UNIVERSAL_BRICK_ACCENT;
}

export function buildBrickDisplayTheme(subjectColor?: string) {
  const accent = resolveBrickAccent(subjectColor);

  return {
    accent,
    filledBackground: `linear-gradient(180deg, ${withAlpha(accent, "ff")} 0%, ${withAlpha(accent, "c8")} 100%)`,
    filledGlow: `0 0 20px ${withAlpha(accent, "70")}`,
    currentShellBackground: `linear-gradient(180deg, ${withAlpha(accent, "42")} 0%, ${withAlpha(accent, "14")} 100%)`,
    currentShellBorder: withAlpha(accent, "9c") ?? accent,
    currentShellGlow: `0 0 24px ${withAlpha(accent, "52")}`,
    currentProgressBackground: `linear-gradient(180deg, ${withAlpha(accent, "f2")} 0%, ${withAlpha(accent, "8a")} 100%)`,
    currentProgressGlow: `inset 0 1px 0 ${withAlpha("#ffffff", "30")}, 0 0 18px ${withAlpha(accent, "66")}`,
    currentHighlight: `linear-gradient(180deg, ${withAlpha("#ffffff", "24")} 0%, transparent 55%)`,
    statusDot: accent,
  };
}
