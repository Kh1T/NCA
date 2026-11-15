import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SHOTS = path.join(HERE, "shots");

export async function open(url = "http://localhost:4599/") {
  const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader", "--mute-audio"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("pageerror", (e) => { errors.push(String(e.stack || e)); console.log("PAGEERROR:", String(e.stack || e).slice(0, 600)); });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") { const t = m.text(); if (!/GPU stall|WebGL|swiftshader|Automatic fallback/i.test(t)) console.log(`CONSOLE ${m.type()}:`, t.slice(0, 300)); } });
  await page.goto(url);
  await page.waitForFunction(() => window.__outpost && window.__outpost.scene.isActive && (window.__outpost.scene.getScenes(true).some((s) => s.scene.key !== "Boot")), null, { timeout: 30000 });
  await page.waitForTimeout(400);
  const api = {
    page, browser, errors,
    wait: (ms) => page.waitForTimeout(ms),
    key: async (k, hold = 60) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(90); },
    click: async (x, y) => { await page.mouse.click(x * 2, y * 2); await page.waitForTimeout(120); },
    move: async (x, y) => { await page.mouse.move(x * 2, y * 2); },
    shot: async (name) => { await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); },
    scenes: () => page.evaluate(() => window.__outpost.scene.getScenes(true).map((s) => s.scene.key)),
    state: () => page.evaluate(() => window.__outpost.registry.get("state")),
    eval: (fn, arg) => page.evaluate(fn, arg),
    close: () => browser.close(),
  };
  return api;
}
