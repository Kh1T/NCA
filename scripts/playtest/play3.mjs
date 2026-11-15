// Round 3 gate: a full mission in the new flow. node play3.mjs [cardIndex 0-3] [prefix] [fresh=1 shows tutorials]
import fs from "node:fs";
import { SHOTS, open } from "./lib.mjs";
fs.mkdirSync(SHOTS, { recursive: true });
const card = Number(process.argv[2] ?? 0), P0 = process.argv[3] ?? "r3", fresh = process.argv[4] !== "0";
const g = await open();
const { page } = g;
const wait = (ms) => page.waitForTimeout(ms);
const key = async (k, after = 250) => { await page.keyboard.down(k); await wait(60); await page.keyboard.up(k); await wait(after); };
const ev = (fn, arg) => page.evaluate(fn, arg);
const scenes = () => g.scenes();
const state = () => g.state();
const shotted = new Set();
const overflow = [];
const shotOnce = async (n) => {
  if (shotted.has(n)) return;
  shotted.add(n);
  await g.shot(`${P0}-${n}`);
  const o = await ev(() => window.__overflow());
  if (o.length) { overflow.push({ screen: n, o }); console.log("OVERFLOW on", n, JSON.stringify(o)); }
};
const waitFn = async (fn, arg, timeout = 20000) => { try { await page.waitForFunction(fn, arg, { timeout, polling: 40 }); return true; } catch { console.log("timeout:", String(fn).slice(0, 120)); return false; } };
async function holdUntil(k, fn, arg, timeout = 8000) { await page.keyboard.down(k); await waitFn(fn, arg, timeout); await page.keyboard.up(k); }
const modalOpen = () => ev(() => Boolean(window.__outpost.scene.getScene("OutpostUi").modal));
const active = (k) => ev((k) => window.__outpost.scene.isActive(k), k);
const coachOn = () => ev(() => window.__outpost.scene.getScenes(true).some((sc) => sc.coach?.active || sc.card?.coach?.active));
async function skipCoach(name) {
  if (!(await coachOn())) return false;
  await wait(250);
  if (name) await shotOnce(`coach-${name}`);
  for (let i = 0; i < 8 && (await coachOn()); i += 1) await key("Enter", 220);
  return true;
}
if (!fresh) await ev(() => { localStorage.setItem("outpost-progress", JSON.stringify({ seen: { story: 1, outpost: 1, daycard: 1, blueprints: 1, alert: 1, "photo-trip": 1 } })); location.reload(); });
if (!fresh) await waitFn(() => window.__outpost?.scene.isActive("Title"), null, 20000);
await wait(500);

// ---- Menus ----
const t0 = Date.now();
await shotOnce("title");
await key("Enter", 600);
if (await active("Story")) { await wait(1500); await shotOnce("story"); await key("Escape", 800); }
await shotOnce("scenario");
await key(String(card + 1), 500);
for (let i = 0; i < 4; i += 1) { await wait(350); await shotOnce(`howto-${i + 1}`); await key("Enter", 250); }
await wait(300);
await shotOnce("pack");
await key("s", 400);
await waitFn(() => window.__outpost.scene.isActive("OutpostUi"), null, 15000);
await wait(800);
await skipCoach("outpost");
await shotOnce("base-day1");

const alertInfo = () => ev(() => {
  if (!window.__outpost.scene.isActive("Alert")) return null;
  const s = window.__outpost.scene.getScene("Alert");
  const m = s.game_;
  return { id: s.event.id, level: s.event.level, finished: Boolean(s.finished),
    crew: m?.crew ? { xs: m.crew.map((c) => c.sprite.x), y: m.crew[0].sprite.y, door: m.doorX } : null,
    patch: m?.patch ? { x: m.patch.x, y: m.patch.y, cx: m.crack.x, cy: m.crack.y } : null,
    dust: m?.cells ? { left: m.left, top: m.top } : null,
    bot: m?.bot ? { hy: m.hole.y, bx: m.box.x, by: m.box.y } : null };
});
const seenAlerts = {};
async function handleAlert() {
  let info = await alertInfo();
  seenAlerts[info.id] = (seenAlerts[info.id] ?? 0) + 1;
  await wait(500);
  await skipCoach("alert");
  await shotOnce(`alert-${info.id}`);
  if (info.id === "flare") {
    await key("1", 500);
    info = await alertInfo();
    const c = info.crew;
    if (c) for (const x of c.xs.slice(0, 2)) {
      await page.mouse.move(x * 2, c.y * 2, { steps: 4 }); await page.mouse.down();
      await page.mouse.move((c.door + 8) * 2, c.y * 2, { steps: 14 }); await page.mouse.up(); await wait(200);
    }
    await key("3", 300);
  } else if (info.id === "leak") {
    await key("1", 500);
    info = await alertInfo();
    const p = info.patch;
    await page.mouse.move(p.x * 2, p.y * 2, { steps: 4 }); await page.mouse.down();
    await page.mouse.move(p.cx * 2, p.cy * 2, { steps: 18 }); await page.mouse.up();
    await wait(600);
    await key("ArrowRight", 300); await key("Tab", 200); await key("Enter", 200);
  } else if (info.id === "dust") {
    await key("1", 500);
    info = await alertInfo();
    const d = info.dust;
    for (let row = 0; row < 4; row += 1) {
      const y = (d.top + 13 + row * 26) * 2;
      const a = (d.left + 6) * 2, b = (d.left + 12 * 26 - 6) * 2;
      await page.mouse.move(row % 2 ? b : a, y, { steps: 3 });
      await page.mouse.move(row % 2 ? a : b, y, { steps: 30 });
    }
  } else if (info.id === "meteor") {
    await key("1", 500);
    info = await alertInfo();
    const b = info.bot;
    const bot = "window.__outpost.scene.getScene('Alert').game_?.bot";
    const until = (k, cond) => holdUntil(k, new Function("a", `const b=${bot}; return !b || (${cond});`), null);
    await until("ArrowDown", `b.y > ${b.by + 100}`); await until("ArrowRight", `b.x > ${b.bx + 200}`);
    await until("ArrowUp", `b.y < ${b.by + 40}`); await until("ArrowRight", `b.x > ${b.bx + 320}`);
    await until("ArrowDown", `b.y > ${b.by + 100}`); await until("ArrowRight", `b.x > ${b.bx + 420}`);
    await until(b.hy > b.by + 100 ? "ArrowDown" : "ArrowUp", `Math.abs(b.y - ${b.hy}) < 5`);
    await until("ArrowRight", "false");
  } else if (info.id === "temp" || info.id === "plant") {
    await key("ArrowRight", 400); await key("Enter", 300);
  } else if (info.id === "comms") {
    await key("1", 300);
  }
  await waitFn(() => window.__outpost.scene.getScene("Alert").finished, null, 16000);
  await wait(500);
  await shotOnce(`result-${info.id}`);
  await key("Enter", 400);
}

const ORDER = ["solar", "air", "oxygen", "rover", "greenhouse", "shield"];
const SITE_X = { solar: 280, air: 420, oxygen: 560, greenhouse: 700, shield: 840, rover: 1000 };
async function goTo(id) {
  await ev(([x, id]) => window.__outpost.scene.getScene("Outpost").walkTo(x, id), [SITE_X[id], id]);
  await waitFn(() => Boolean(window.__outpost.scene.getScene("OutpostUi").modal), null, 25000);
}

// ---- Photo trips ----
const PM = "window.__outpost.scene.getScene('PhotoMission')";
const waitP = (expr, timeout = 25000) => waitFn(new Function(`const p=${PM}; return ${expr};`), null, timeout);
const pinfo = () => ev(() => { const p = window.__outpost.scene.getScene("PhotoMission"); return { roverX: p.roverX, heat: p.heat, battery: p.battery, inRover: p.inRover, targets: p.targets.map((t) => ({ cx: t.climbX, y: t.y, done: t.done })) }; });
async function driveTo(x) {
  await page.keyboard.down("ArrowRight");
  await waitP(`p.roverX >= ${Math.min(x, 1199)} || p.battery <= 0`);
  await page.keyboard.up("ArrowRight");
  await wait(300);
}
async function photo(i) {
  const t = (await pinfo()).targets[i];
  await ev((t) => { window.__outpost.scene.getScene("PhotoMission").walkTarget = { x: t.cx, climbTo: t.y }; }, t);
  await waitP(`p.nearby() !== null && typeof p.nearby() === 'object'`);
  await wait(200);
  await key("e", 500);
  await shotOnce("viewfinder");
  const v = await ev(() => { const f = window.__outpost.scene.getScene("PhotoMission").viewfinder; return { fx: f.frame.x, fy: f.frame.y, tx: f.target.x, ty: f.target.y }; });
  const V = `${PM}.viewfinder`;
  const hold = (k, expr) => holdUntil(k, new Function(`const f=${V}; return !f || (${expr});`), null, 5000);
  await hold(v.tx > v.fx ? "ArrowRight" : "ArrowLeft", `Math.abs(f.frame.x - ${v.tx}) < 4`);
  await hold(v.ty > v.fy ? "ArrowDown" : "ArrowUp", `Math.abs(f.frame.y - ${v.ty}) < 4`);
  await key(" ", 600);
  await shotOnce("reveal");
  await key("Enter", 300);
}
async function backToRover() {
  const i = await pinfo();
  await ev((x) => { window.__outpost.scene.getScene("PhotoMission").walkTarget = { x, climbTo: null }; }, i.roverX + 10);
  await waitP(`p.nearby() === 'enter' || p.ended`, 30000);
  if (!(await ev(() => window.__outpost.scene.getScene("PhotoMission").ended))) await key("e", 300);
}
let trip = 0;
async function doTrip() {
  trip += 1;
  await waitFn(() => window.__outpost.scene.isActive("PhotoMission"), null, 10000);
  await wait(900);
  await shotOnce(`trip${trip}-start`);
  if (await ev(() => window.__outpost.scene.getScene("PhotoMission").paused)) await key("Enter", 400);
  const todo = (await pinfo()).targets.map((t, i) => (t.done ? -1 : i)).filter((i) => i >= 0);
  const plan = trip === 1 ? todo.slice(0, 3) : todo;
  for (const i of plan) {
    if (await ev(() => window.__outpost.scene.getScene("PhotoMission").ended)) break;
    const t = (await pinfo()).targets[i];
    if (i <= 2) {
      if (!(await pinfo()).inRover) await backToRover();
      await driveTo(t.cx - 100);
      await shotOnce(`trip-drive`);
      await key("e", 300);
    } else if ((await pinfo()).inRover) {
      await driveTo(1199);
      await key("e", 300);
    }
    await photo(i);
  }
  if (!(await ev(() => window.__outpost.scene.getScene("PhotoMission").ended))) {
    await backToRover();
    if (!(await ev(() => window.__outpost.scene.getScene("PhotoMission").ended))) {
      await key("h", 400); await shotOnce("trip-home-ask"); await key("Tab", 150); await key("Enter", 400);
    }
  }
  await wait(500);
  await shotOnce(`trip${trip}-end`);
  await key("Enter", 600);
  await waitFn(() => window.__outpost.scene.isActive("OutpostUi"), null, 10000);
}

// ---- Days ----
let firstBuild = null;
for (let turn = 0; turn < 12; turn += 1) {
  let s = await state();
  if (s.outcome || !(await scenes()).includes("Outpost")) break;
  for (const id of ORDER) {
    s = await state();
    const b = s.buildings[id];
    if (!b.packed || b.status !== "idle" || s.buildQueue.filter((q) => s.buildings[q].status === "building").length >= 3) continue;
    await goTo(id);
    await wait(250);
    await shotOnce(`site-${id}`);
    await key("Enter", 300);
    if (firstBuild === null) { firstBuild = (Date.now() - t0) / 1000; console.log(`first build started after ${firstBuild.toFixed(1)} s of scripted play`); }
  }
  await shotOnce(`base-day${(await state()).day}`);
  await key("n", 500);
  await skipCoach("daycard");
  const cardInfo = await ev(() => { const c = window.__outpost.scene.getScene("OutpostUi").currentCard; return c; });
  await shotOnce(`card-${cardInfo.id}`);
  const idx = cardInfo.options.indexOf(cardInfo.best);
  await key(String(idx + 1), 300);
  await shotOnce(`card-${cardInfo.id}-picked`);
  await key("Enter", 400);
  if (cardInfo.best === "trip") await doTrip();
  for (let i = 0; i < 300; i += 1) {
    await wait(150);
    const a = await alertInfo();
    if (a && !a.finished) { await handleAlert(); continue; }
    if (!a && (await modalOpen()) && !(await ev(() => window.__outpost.scene.getScene("OutpostUi").busy === false && false))) break;
  }
  s = await state();
  console.log(`day ${s.day - 1} [${cardInfo.id}->${cardInfo.best}] pw ${s.power} oxy ${s.oxygen} air ${s.air} water ${s.water} food ${s.food} dose ${s.doseMSv.toFixed(2)} photos ${s.photosTaken} ${JSON.stringify(s.outcome)}`);
  await wait(400);
  await shotOnce(`summary-${s.day - 1}`);
  await key("Enter", 700);
  if ((await scenes()).includes("Evacuated")) break;
}
await wait(1200);
console.log("end scenes", await scenes(), "alerts", JSON.stringify(seenAlerts));
if ((await scenes()).includes("Evacuated")) { await shotOnce("evacuated"); await key("Enter", 800); }
for (let i = 1; i <= 4; i += 1) { await wait(300); await shotOnce(`debrief-${i}`); await key("Enter", 400); }
const s = await state();
console.log("outcome", JSON.stringify(s.outcome), "photos", s.photosTaken, "trips", s.trips, "calls", JSON.stringify(s.decisions.map((d) => d.good ? 1 : 0).join("")), "errors", g.errors.length, "overflow screens", overflow.length);
await g.close();
