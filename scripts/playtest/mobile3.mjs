// Round 3 phone check: touch only, from the title to a few days of play.
// node mobile3.mjs [width] [height] [prefix]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { SHOTS } from "./lib.mjs";

fs.mkdirSync(SHOTS, { recursive: true });
const W = Number(process.argv[2] ?? 844), H = Number(process.argv[3] ?? 390), P0 = process.argv[4] ?? "m3";
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader", "--mute-audio"] });
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => { errors.push(String(e)); console.log("PAGEERROR", String(e).slice(0, 300)); });
await page.goto("http://localhost:4599/");
await page.waitForFunction(() => window.__outpost?.scene.isActive("Title"), null, { timeout: 30000 });
const wait = (ms) => page.waitForTimeout(ms);
const ev = (fn, a) => page.evaluate(fn, a);
const overflow = [];
const shot = async (n) => {
  await page.screenshot({ path: path.join(SHOTS, `${P0}-${n}.png`) });
  const o = await ev(() => window.__overflow());
  if (o.length) { overflow.push(n); console.log("OVERFLOW", n, JSON.stringify(o)); }
};
const scenes = () => ev(() => window.__outpost.scene.getScenes(true).map((s) => s.scene.key));
const rect = await ev(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const scale = rect.w / 640;
console.log("canvas scale", scale.toFixed(3), "-> 36px button =", (36 * scale).toFixed(1), "css px");
const tap = async (x, y, after = 380) => { await page.touchscreen.tap(rect.x + x * scale, rect.y + y * scale); await wait(after); };
const tapText = async (label, after = 420) => {
  const pos = await ev((label) => {
    let best = null;
    for (const s of window.__outpost.scene.getScenes(true)) for (const o of s.children.list) {
      if (o.type === "Text" && o.visible && o.text.toUpperCase() === label.toUpperCase() && o.alpha > 0.5) {
        const b = o.getBounds();
        if (!best || o.depth >= best.depth) best = { x: b.centerX, y: b.centerY, depth: o.depth };
      }
    }
    return best;
  }, label);
  if (!pos) { console.log("  no label:", label); return false; }
  await tap(pos.x, pos.y, after);
  return true;
};
const coach = () => ev(() => window.__outpost.scene.getScenes(true).some((s) => s.coach?.active || s.card?.coach?.active));
const skipCoach = async () => { for (let i = 0; i < 8 && (await coach()); i += 1) { if (!(await tapText("NEXT", 260))) await tapText("GOT IT", 260); } };

const t0 = Date.now();
await shot("title");
await tapText("PLAY", 700);
if ((await scenes()).includes("Story")) await tapText("SKIP", 800);
await shot("scenario");
await tap(88, 176, 600); // Calm Sun card
for (let i = 0; i < 3; i += 1) await tapText("NEXT", 350);
await tapText("PACK UP!", 600);
await shot("pack");
await tapText("FLY!", 600);
await page.waitForFunction(() => window.__outpost.scene.isActive("OutpostUi"), null, { timeout: 15000 });
await wait(900);
await skipCoach();
await shot("base");
const padShown = await ev(() => window.__outpost.scene.getScene("Outpost").pad?.shown ?? window.__outpost.registry.get("touchUsed"));
console.log("touch pad on:", padShown);

let firstBuild = null;
for (let day = 1; day <= 4; day += 1) {
  // Build from the checklist: tap the arrowed line, then BUILD! when the panel opens.
  for (let k = 0; k < 3; k += 1) {
    const s = await ev(() => window.__outpost.registry.get("state"));
    const free = 3 - s.buildQueue.filter((q) => s.buildings[q].status === "building").length;
    const next = ["solar", "air", "oxygen", "rover", "greenhouse", "shield"].find((id) => s.buildings[id].status === "idle");
    if (!next || free <= 0) break;
    const y = await ev((id) => window.__outpost.scene.getScene("OutpostUi").listRows?.[id], next);
    if (!y) break;
    await tap(560, y + 8, 300);
    await page.waitForFunction(() => Boolean(window.__outpost.scene.getScene("OutpostUi").modal), null, { timeout: 25000 }).catch(() => console.log("  walk timeout"));
    await wait(300);
    if (day === 1 && k === 0) await shot("site");
    await tapText("BUILD!", 500);
    if (firstBuild === null) { firstBuild = (Date.now() - t0) / 1000; console.log(`first build after ${firstBuild.toFixed(1)} s of scripted taps`); }
  }
  if (!(await ev(() => Boolean(window.__outpost.scene.getScene("OutpostUi").modal)))) await tapText("NEXT DAY", 600);
  await skipCoach();
  const card = await ev(() => window.__outpost.scene.getScene("OutpostUi").currentCard);
  if (day === 1) await shot("card");
  // Tap the best option twice (the second tap is GO).
  const i = card.options.indexOf(card.best === "trip" ? card.options.find((o) => o !== "trip") : card.best);
  const n = card.options.length;
  const ow = n === 3 ? 178 : 250;
  const left = 30 + (580 - (n * ow + (n - 1) * 12)) / 2;
  const cx = left + i * (ow + 12) + ow / 2;
  await tap(cx, 160, 400);
  await tap(cx, 160, 600);
  for (let t = 0; t < 120; t += 1) {
    await wait(150);
    if (await ev(() => window.__outpost.scene.isActive("Alert") && !window.__outpost.scene.getScene("Alert").finished)) { await skipCoach(); console.log("  alert: tapping choice 2"); await (await tapText("Leave it for now", 500) || await tapText("Leave the dust", 500) || await tapText("Keep working", 500) || await tapText("Deal with it later", 500) || await tapText("Decide now", 500)); await wait(900); await shot("alert-result"); await tapText("OK", 500); continue; }
    const m = await ev(() => { const u = window.__outpost.scene.getScene("OutpostUi"); return Boolean(u.modal) && !u.busy; });
    if (m) break;
  }
  const s = await ev(() => window.__outpost.registry.get("state"));
  console.log(`day ${s.day - 1}: [${card.id}] pw ${s.power} air ${s.air} built ${Object.values(s.buildings).filter((b) => b.status === "done").length}`);
  await shot(`summary-${day}`);
  await tapText("NEXT DAY", 900);
}
// Settings from the gear, then leave.
await tap(250, 340, 500);
await shot("settings");
await tapText("BACK TO GAME", 400);
console.log("scenes", await scenes(), "errors", errors.length, "overflow screens", overflow.length);

// Portrait check.
await page.setViewportSize({ width: H, height: W });
await wait(500);
const rotate = await ev(() => getComputedStyle(document.getElementById("rotate")).display);
console.log("portrait overlay display:", rotate);
await page.screenshot({ path: path.join(SHOTS, `${P0}-portrait.png`) });
await browser.close();
