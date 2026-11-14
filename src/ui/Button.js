import { COLORS, FONT } from "../config.js";

export function createButton(
  scene,
  x,
  y,
  label,
  onClick,
  { width = 250, height = 60, fontSize = 22, accent = COLORS.cyan } = {},
) {
  const background = scene.add
    .rectangle(x, y, width, height, COLORS.panel, 0.95)
    .setStrokeStyle(2, accent, 0.85)
    .setInteractive({ useHandCursor: true });

  const text = scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize: `${fontSize}px`,
      color: COLORS.text,
    })
    .setOrigin(0.5);

  const setHovered = (hovered) => {
    background.setFillStyle(hovered ? 0x123048 : COLORS.panel, hovered ? 1 : 0.95);
    text.setColor(hovered ? "#ffffff" : COLORS.text);
    scene.tweens.add({
      targets: [background, text],
      scale: hovered ? 1.04 : 1,
      duration: 120,
      ease: "Sine.easeOut",
    });
  };

  background.on("pointerover", () => setHovered(true));
  background.on("pointerout", () => setHovered(false));
  background.on("pointerdown", () => {
    scene.tweens.add({
      targets: [background, text],
      scale: 0.97,
      duration: 80,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
    onClick();
  });

  return { background, text };
}
