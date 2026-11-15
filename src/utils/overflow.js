// Text-fits-its-box checker, used by the automated screen sweep
// (window.__overflow() in the browser console, or a Playwright script).
//
// For every visible text on screen, the smallest panel or button that holds
// the text's centre is its box. The text must sit fully inside that box, and
// screen-fixed text must sit inside the 640×360 canvas.

const TOLERANCE = 1;

function boundsOf(obj) {
  const b = obj.getBounds();
  const cam = obj.scene.cameras.main;
  const fx = obj.scrollFactorX ?? 1;
  const fy = obj.scrollFactorY ?? 1;
  return { x: b.x - cam.scrollX * fx, y: b.y - cam.scrollY * fy, w: b.width, h: b.height, world: fx !== 0 };
}

function shown(obj) {
  if (!obj.visible || obj.alpha <= 0.05) return false;
  let parent = obj.parentContainer;
  while (parent) {
    if (!parent.visible || parent.alpha <= 0.05) return false;
    parent = parent.parentContainer;
  }
  return true;
}

/** @returns {Array<{scene, text, box?, why}>} every text that spills out */
export function findOverflow(game) {
  const problems = [];
  for (const scene of game.scene.getScenes(true)) {
    const list = scene.children.list;
    const moving = (o) => scene.tweens.isTweening(o) || (o.parentContainer && scene.tweens.isTweening(o.parentContainer));
    const texts = list.filter((o) => o.type === "Text" && shown(o) && o.text.trim() !== "" && !moving(o));
    // Boxes: rectangles that look like panels or buttons (not full-screen sheets).
    const boxes = list
      .filter((o) => o.type === "Rectangle" && shown(o) && (o.isStroked || o.fillAlpha >= 0.5) && !(o.width >= 600 && o.height >= 300))
      .map((o) => ({ obj: o, depth: o.depth, ...boundsOf(o) }));
    // Speech bubbles: a container with a drawn box of size w × h and a text inside.
    for (const box of list.filter((o) => o.type === "Container" && shown(o) && typeof o.bubbleW === "number" && typeof o.bubbleH === "number")) {
      for (const child of box.list.filter((c) => c.type === "Text")) {
        const right = child.x + child.width;
        const bottom = child.y + child.height;
        if (child.x < -TOLERANCE || child.y < -TOLERANCE || right > box.bubbleW + TOLERANCE || bottom > box.bubbleH + TOLERANCE) {
          problems.push({ scene: scene.scene.key, text: child.text.slice(0, 60), why: "outside its bubble" });
        }
      }
    }
    for (const text of texts) {
      const t = boundsOf(text);
      const cx = t.x + t.w / 2;
      const cy = t.y + t.h / 2;
      if (!t.world && (t.x < -TOLERANCE || t.y < -TOLERANCE || t.x + t.w > 640 + TOLERANCE || t.y + t.h > 360 + TOLERANCE)) {
        problems.push({ scene: scene.scene.key, text: text.text, why: "off screen", t });
        continue;
      }
      const holders = boxes
        .filter((b) => b.depth <= text.depth && b.world === t.world && cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h)
        // The box right underneath wins: highest depth first, then the smallest.
        .sort((a, b) => b.depth - a.depth || a.w * a.h - b.w * b.h);
      const box = holders[0];
      if (!box) continue;
      const out = t.x < box.x - TOLERANCE || t.y < box.y - TOLERANCE || t.x + t.w > box.x + box.w + TOLERANCE || t.y + t.h > box.y + box.h + TOLERANCE;
      if (out) {
        problems.push({
          scene: scene.scene.key,
          text: text.text.slice(0, 60),
          why: "outside its box",
          t: { x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.w), h: Math.round(t.h) },
          box: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h) },
        });
      }
    }
  }
  return problems;
}
