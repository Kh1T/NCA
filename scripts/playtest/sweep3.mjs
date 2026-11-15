// Visit every screen and pop-up, screenshot it, and run the text-fits-its-box check.
import fs from "node:fs";
import { SHOTS, open } from "./lib.mjs";
fs.mkdirSync(SHOTS, { recursive: true });
const g = await open();
const { page } = g;
const wait = (ms) => page.waitForTimeout(ms);
const key = async (k, after = 300) => { await page.keyboard.down(k); await wait(60); await page.keyboard.up(k); await wait(after); };
const ev = (fn, arg) => page.evaluate(fn, arg);
const results = [];
const check = async (name) => {
  await wait(350);
  await g.shot(`sw-${name}`);
  const o = await ev(() => window.__overflow());
  results.push([name, o.length]);
  if (o.length) console.log("OVERFLOW", name, JSON.stringify(o));
};
await ev(() => { localStorage.setItem("outpost-progress", JSON.stringify({ seen: { story: 1, outpost: 1, daycard: 1, blueprints: 1, alert: 1, "photo-trip": 1 } })); location.reload(); });
await page.waitForFunction(() => window.__outpost?.scene.isActive("Title"), null, { timeout: 20000 });
await wait(600);
await check("title");
const start = (key, data) => ev(([k, d]) => { const m = window.__outpost.scene; for (const s of m.getScenes(true)) m.stop(s.scene.key); m.start(k, d); }, [key, data]);

// Scenario + each card's info
await start("Scenario"); await check("scenario");
for (let i = 0; i < 4; i += 1) {
  await g.click(88 + i * 155 + 59, 68); await check(`scenario-info-${i}`); await key("Escape");
}
for (const k of ["HowTo", "Blueprints"]) { await start(k); await check(k.toLowerCase()); }
await g.click(490, 182); await check("blueprints-editor");
await key("ArrowDown"); await key("ArrowDown"); await check("blueprints-editor-2");
for (const k of ["Badges", "Credits", "Glossary"]) { await start(k, { from: "Title" }); await check(k.toLowerCase()); }

// Base: start a mission and open every panel.
await ev(() => { const m = window.__outpost.scene; for (const s of m.getScenes(true)) m.stop(s.scene.key); m.start("Blueprints"); });
await wait(400); await key("s", 500);
await page.waitForFunction(() => window.__outpost.scene.isActive("OutpostUi"), null, { timeout: 15000 });
await wait(800);
await check("base");
const ui = "window.__outpost.scene.getScene('OutpostUi')";
for (const id of ["solar", "oxygen", "air", "greenhouse", "shield", "rover"]) {
  await ev(new Function(`${ui}.openSite('${id}')`)); await check(`site-${id}`); await key("Escape");
}
for (const m of ["power", "oxygen", "air", "water", "food", "dose", "night"]) {
  await ev(new Function(`${ui}.info('meter.${m}')`)); await check(`info-${m}`); await key("Escape");
}
await ev(new Function(`${ui}.openSettingsPanel()`)); await check("settings");
await key("Enter"); await check("settings-sound"); await key("Escape");
await wait(300); await key("Tab"); await key("Enter"); await check("pause"); await key("Escape");
await wait(300); await key("Tab"); await key("Tab"); await key("Enter"); await check("restart-ask"); await key("Enter"); await key("Escape");
// The day card in every situation.
const set = (fn) => ev(new Function(`const s=window.__outpost.registry.get('state'); ${fn}; ${ui}.refresh();`));
const card = async (name) => { await ev(new Function(`${ui}.openDay()`)); await key("1", 300); await check(`card-${name}`); await key("Escape"); };
await card("quiet");
await set("s.effects.leak=true"); await card("broken"); await set("s.effects.leak=false");
await set("s.buildings.rover.status='done'"); await card("rover");
await set("s.buildings.greenhouse.status='done'; s.food=2; s.buildings.rover.status='idle'"); await card("food");
await set("s.day=s.nightStart-1; s.power=3"); await card("dusk");
await set("s.day=s.nightStart"); await card("night");
// A few alerts.
for (const id of ["flare", "meteor", "leak", "dust", "temp", "plant", "comms"]) {
  await ev((id) => {
    const s = window.__outpost.registry.get("state");
    for (const b of Object.values(s.buildings)) b.status = "done";
    window.__outpost.scene.getScene("OutpostUi").scene.launch("Alert", { event: id === "flare" ? { id, real: true, level: "X", dose: 1, title: "Big solar flare!", badge: "Real X1.0 solar flare, 2024-05-10, NASA DONKI" } : id === "meteor" ? { id, targetId: "solar", targetName: "Solar array" } : { id }, onDone: () => {} });
  }, id);
  await wait(600); await check(`alert-${id}`);
  await key("2", 600); await check(`alert-${id}-result`);
  await ev(() => window.__outpost.scene.stop("Alert"));
}
for (const k of ["Evacuated"]) {
  await ev(() => { const s = window.__outpost.registry.get("state"); s.outcome = { kind: "evacuated", cause: "water" }; s.stats.nightPowerOut = 1; });
  await start(k); await check(k.toLowerCase());
  await key("Enter", 800);
  for (let i = 1; i <= 4; i += 1) { await check(`debrief-evac-${i}`); await key("Enter", 400); }
}
console.log("screens", results.length, "with overflow", results.filter((r) => r[1] > 0).map((r) => r[0]).join(", ") || "none", "errors", g.errors.length);
await g.close();
