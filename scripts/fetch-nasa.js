// Downloads real space-weather records from NASA DONKI and saves them as
// cached JSON in public/data/donki/. The game only ever reads these files,
// so no API key reaches the browser and the game works offline.
//
// Run:  npm run fetch-nasa
// Key:  put NASA_API_KEY=your_key in a .env file (free at https://api.nasa.gov/).
//       Without a key the script reads the same records straight from CCMC,
//       the NASA centre that runs DONKI, which needs no key.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "data", "donki");
const CREDITS_FILE = path.join(ROOT, "public", "data", "credits.json");

const NASA_API = "https://api.nasa.gov/DONKI";
const CCMC_API = "https://ccmc.gsfc.nasa.gov/DONKI-API/get";
const EVENT_TYPES = ["FLR", "SEP", "CME", "GST"];
// Each window covers the longest mission (10 days) so every length has data.
const WINDOW_DAYS = 10;
const RECENT_DAYS = 30;

const PRESETS = [
  {
    id: "calm",
    label: "Calm Sun",
    startDate: "2019-12-01",
    why: "Solar minimum between cycles 24 and 25. DONKI lists no flares in this window.",
  },
  {
    id: "busy",
    label: "Busy Sun",
    startDate: "2021-07-01",
    why: "A moderately active week that includes the X1.5 flare of 3 July 2021.",
  },
  {
    id: "storm",
    label: "Solar Storm!",
    startDate: "2024-05-08",
    why: "The May 2024 'Gannon' storm: many X-class flares and a G5 geomagnetic storm.",
    reference:
      "https://science.nasa.gov/science-research/heliophysics/how-nasa-tracked-the-most-intense-solar-storm-in-decades/",
  },
];

try {
  process.loadEnvFile(path.join(ROOT, ".env"));
} catch {
  // No .env file: fine, the CCMC route needs no key.
}
const API_KEY = process.env.NASA_API_KEY?.trim();

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = (await response.text()).trim();
  // DONKI answers with an empty body, not [], when a window has no events.
  return body ? JSON.parse(body) : [];
}

/** Fetch one event type for one window. Returns { records, via }. */
async function fetchType(type, startDate, endDate) {
  const query = `startDate=${startDate}&endDate=${endDate}`;
  if (API_KEY) {
    try {
      const records = await getJson(`${NASA_API}/${type}?${query}&api_key=${API_KEY}`);
      return { records, via: "api.nasa.gov" };
    } catch (error) {
      console.warn(`  api.nasa.gov ${type} failed (${error.message}); using CCMC instead.`);
    }
  }
  const records = await getJson(`${CCMC_API}/${type}?${query}`);
  return { records, via: "ccmc.gsfc.nasa.gov" };
}

// The raw records are large (model runs, notification lists). We keep the
// fields the game shows or scores, and always keep the link to the full record.

function slimFlare(r) {
  return {
    id: r.flrID,
    beginTime: r.beginTime,
    peakTime: r.peakTime,
    endTime: r.endTime,
    classType: r.classType,
    sourceLocation: r.sourceLocation,
    activeRegionNum: r.activeRegionNum,
    link: r.link,
  };
}

function slimSep(r) {
  return {
    id: r.sepID,
    eventTime: r.eventTime,
    instruments: (r.instruments ?? []).map((i) => i.displayName),
    linkedEvents: (r.linkedEvents ?? []).map((e) => e.activityID),
    link: r.link,
  };
}

function slimCme(r) {
  const analyses = r.cmeAnalyses ?? [];
  const best = analyses.find((a) => a.isMostAccurate) ?? analyses[0];
  // Model runs for the most accurate measurement first, then any others.
  const runs = [...(best?.enlilList ?? []), ...analyses.flatMap((a) => a.enlilList ?? [])];
  // A run names Earth either with a predicted shock arrival time or a glancing blow.
  const earthRun = runs.find((run) => run.estimatedShockArrivalTime || run.isEarthGB) ?? null;
  return {
    id: r.activityID,
    startTime: r.startTime,
    sourceLocation: r.sourceLocation,
    activeRegionNum: r.activeRegionNum,
    note: r.note,
    speedKmS: best?.speed ?? null,
    type: best?.type ?? null,
    // True when a NASA model run predicted a hit or glancing blow at Earth.
    earthDirected: Boolean(earthRun),
    estimatedEarthArrival: earthRun?.estimatedShockArrivalTime ?? null,
    link: r.link,
  };
}

function slimStorm(r) {
  const kp = (r.allKpIndex ?? []).map((k) => k.kpIndex);
  return {
    id: r.gstID,
    startTime: r.startTime,
    maxKp: kp.length ? Math.max(...kp) : null,
    kpReadings: (r.allKpIndex ?? []).map((k) => ({ kp: k.kpIndex, time: k.observedTime })),
    link: r.link,
  };
}

const SLIM = { FLR: slimFlare, SEP: slimSep, CME: slimCme, GST: slimStorm };

async function fetchWindow({ id, label, startDate, endDate, why, reference }) {
  console.log(`${label}: ${startDate} to ${endDate}`);
  const events = {};
  const via = new Set();
  for (const type of EVENT_TYPES) {
    const result = await fetchType(type, startDate, endDate);
    events[type] = result.records.map(SLIM[type]);
    via.add(result.via);
    console.log(`  ${type}: ${events[type].length} records`);
  }

  const flareCount = (letter) => events.FLR.filter((f) => f.classType?.startsWith(letter)).length;
  const file = {
    id,
    label,
    why,
    reference: reference ?? null,
    startDate,
    endDate,
    fetchedAt: new Date().toISOString(),
    fetchedVia: [...via],
    source: "NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)",
    sourceUrl: "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
    note: "Cached copy. Fields trimmed for size; each record links to its full DONKI page.",
    counts: {
      flaresM: flareCount("M"),
      flaresX: flareCount("X"),
      sep: events.SEP.length,
      cme: events.CME.length,
      cmeEarthDirected: events.CME.filter((c) => c.earthDirected).length,
      gst: events.GST.length,
    },
    events,
  };
  await fs.writeFile(path.join(OUT_DIR, `${id}.json`), `${JSON.stringify(file, null, 1)}\n`);
  return file;
}

// ---------- Archive for the "random real date" mode ----------

const ARCHIVE = { startDate: "2023-01-01", endDate: "2023-12-31" };

async function fetchArchive() {
  console.log(`Archive: ${ARCHIVE.startDate} to ${ARCHIVE.endDate}`);
  const events = { FLR: [], SEP: [], CME: [], GST: [] };
  // DONKI rejects long date ranges, so ask one month at a time.
  for (let month = 0; month < 12; month += 1) {
    const start = `2023-${String(month + 1).padStart(2, "0")}-01`;
    const end = isoDate(new Date(Date.UTC(2023, month + 1, 0)));
    for (const type of EVENT_TYPES) {
      const { records } = await fetchType(type, start, end);
      events[type].push(...records.map(SLIM[type]));
    }
  }
  // Only flares strong enough to matter and clouds aimed at Earth, without the long notes.
  events.FLR = events.FLR.filter((f) => /^[MX]/.test(f.classType ?? ""));
  events.CME = events.CME.filter((c) => c.earthDirected).map(({ note, ...rest }) => rest);
  events.GST = events.GST.map(({ kpReadings, ...rest }) => rest);
  for (const type of EVENT_TYPES) console.log(`  ${type}: ${events[type].length} records kept`);
  const file = {
    id: "archive",
    label: "Random real date",
    why: "A full year near solar maximum, so a random start date gives a different real week each time.",
    reference: null,
    ...ARCHIVE,
    fetchedAt: new Date().toISOString(),
    source: "NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)",
    sourceUrl: "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
    note: "Cached copy. M and X flares, particle storms, Earth-directed clouds and geomagnetic storms only.",
    counts: {
      flaresM: events.FLR.filter((f) => f.classType.startsWith("M")).length,
      flaresX: events.FLR.filter((f) => f.classType.startsWith("X")).length,
      sep: events.SEP.length,
      cme: events.CME.length,
      cmeEarthDirected: events.CME.length,
      gst: events.GST.length,
    },
    events,
  };
  await fs.writeFile(path.join(OUT_DIR, "archive.json"), `${JSON.stringify(file)}\n`);
  return file;
}

// ---------- Real far-side photos for the crater photo race ----------

// Each image was looked at by hand before it was added here. The ids are
// NASA Image and Video Library ids (https://images.nasa.gov/details/<id>).
const CRATERS = [
  {
    nasaId: "PIA13225",
    name: "Orientale Basin",
    kidFact: "A giant bullseye made by an asteroid impact. Its rings are mountain ranges.",
    credit: "NASA/GSFC/Arizona State University",
    mission: "Lunar Reconnaissance Orbiter (LROC)",
  },
  {
    nasaId: "art002e009282",
    name: "Vavilov Crater",
    kidFact: "Long shadows show every bump. The Artemis II crew took this photo in April 2026.",
    credit: "NASA",
    mission: "Artemis II",
  },
  {
    nasaId: "art002e021296",
    name: "Hertzsprung Basin",
    kidFact: "An ancient, huge crater on the far side, seen as Artemis II flew around the Moon.",
    credit: "NASA",
    mission: "Artemis II",
  },
  {
    nasaId: "PIA12939",
    name: "Mare Moscoviense",
    kidFact: "One of the few dark lava plains on the far side. The line marks where it meets the highlands.",
    credit: "NASA/GSFC/Arizona State University",
    mission: "Lunar Reconnaissance Orbiter (LROC)",
  },
  {
    nasaId: "PIA13089",
    name: "Tsiolkovskiy Crater",
    kidFact: "Big boulders near the mountain in the middle of Tsiolkovskiy crater.",
    credit: "NASA/GSFC/Arizona State University",
    mission: "Lunar Reconnaissance Orbiter (LROC)",
  },
];

async function fetchCraters() {
  const dir = path.join(ROOT, "public", "assets", "craters");
  await fs.mkdir(dir, { recursive: true });
  const list = [];
  for (const crater of CRATERS) {
    const search = await getJson(`https://images-api.nasa.gov/search?nasa_id=${encodeURIComponent(crater.nasaId)}`);
    const data = search.collection?.items?.[0]?.data?.[0] ?? {};
    const file = `${crater.nasaId}.jpg`;
    const target = path.join(dir, file);
    try {
      await fs.access(target);
    } catch {
      const url = `https://images-assets.nasa.gov/image/${crater.nasaId}/${crater.nasaId}~small.jpg`;
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`image ${crater.nasaId}: HTTP ${response.status}`);
      await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
    }
    list.push({
      ...crater,
      file: `assets/craters/${file}`,
      nasaTitle: data.title ?? crater.name,
      dateCreated: (data.date_created ?? "").slice(0, 10),
      link: `https://images.nasa.gov/details/${crater.nasaId}`,
    });
    console.log(`  crater photo: ${crater.name} (${crater.nasaId})`);
  }
  await fs.writeFile(path.join(ROOT, "public", "data", "craters.json"), `${JSON.stringify(list, null, 2)}\n`);
  return list;
}

// ---------- Debrief fact cards, each tied to a real OSDR study ----------

// The kid sentence is ours and deliberately general. The study is the top
// match from NASA's Open Science Data Repository search for the keyword.
const FACTS = [
  { tag: "radiation", must: "radiation", term: "space radiation DNA damage", text: "Space radiation can damage the DNA inside cells. Scientists study how cells repair it, so crews can stay longer and stay safe." },
  { tag: "bone", must: "bone", term: "bone loss spaceflight", text: "With less gravity pulling on them, bones lose strength. Space station crews exercise about two hours a day to protect them." },
  { tag: "muscle", must: "muscle", term: "muscle atrophy spaceflight", text: "Muscles shrink in low gravity when they are not used. Studies on the space station look for ways to keep them strong." },
  { tag: "plants", must: "plant|arabidopsis", term: "plant growth spaceflight", text: "Plants can grow in space. Astronauts have grown lettuce on the space station and eaten it." },
  { tag: "sleep", must: "circadian|sleep", term: "circadian spaceflight", text: "Space has no normal day and night, so body clocks get confused. Good rest is part of mission safety." },
  { tag: "immune", must: "immune", term: "immune spaceflight", text: "Spaceflight can change how the immune system works. Staying rested and well fed helps a crew stay healthy." },
  { tag: "microbes", must: "microb|fung|bacteri", term: "microbial International Space Station", text: "Tiny microbes travel with every crew. Scientists keep track of which ones live on the space station." },
  { tag: "dust", must: "dust|regolith", term: "lunar dust", text: "Moon dust is sharp and sticky. Scientists study what it could do to lungs and machines." },
];

async function fetchFacts() {
  const facts = [];
  for (const fact of FACTS) {
    let study = null;
    try {
      const url = `https://osdr.nasa.gov/osdr/data/search?term=${encodeURIComponent(fact.term)}&size=5&type=cgene`;
      const hits = (await getJson(url)).hits?.hits ?? [];
      // Only keep a study whose title is clearly about the same topic.
      const hit = hits
        .map((h) => h._source)
        .find((src) => /^OSD-\d+$/.test(src?.Accession ?? "") && new RegExp(fact.must, "i").test(src["Study Title"] ?? ""));
      if (hit) {
        study = {
          accession: hit.Accession,
          title: hit["Study Title"],
          link: `https://osdr.nasa.gov/bio/repo/data/studies/${hit.Accession}`,
        };
      }
    } catch (error) {
      console.warn(`  OSDR search for "${fact.term}" failed: ${error.message}`);
    }
    facts.push({ tag: fact.tag, text: fact.text, searchTerm: fact.term, study });
    console.log(`  fact: ${fact.tag} -> ${study ? `${study.accession} ${study.title}` : "no study found"}`);
  }
  const file = {
    source: "NASA Open Science Data Repository (OSDR)",
    sourceUrl: "https://osdr.nasa.gov/bio/repo/",
    fetchedAt: new Date().toISOString(),
    note: "The plain-language sentence is written for this game. The study is a real OSDR record on the same topic.",
    facts,
  };
  await fs.writeFile(path.join(ROOT, "public", "data", "osdr-facts.json"), `${JSON.stringify(file, null, 2)}\n`);
  return file;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(API_KEY ? "Using NASA_API_KEY from the environment." : "No NASA_API_KEY set: reading from CCMC directly.");

  const today = isoDate(new Date());
  const windows = [
    ...PRESETS.map((preset) => ({ ...preset, endDate: addDays(preset.startDate, WINDOW_DAYS) })),
    {
      id: "recent",
      label: "This month",
      startDate: addDays(today, -RECENT_DAYS),
      endDate: today,
      why: `The ${RECENT_DAYS} days before this cache was made. Shown in the game as cached, never as live.`,
    },
  ];

  const files = [];
  for (const window of windows) files.push(await fetchWindow(window));
  files.push(await fetchArchive());
  console.log("NASA Image and Video Library:");
  const craters = await fetchCraters();
  console.log("NASA OSDR:");
  const facts = await fetchFacts();

  // Keep any credits written by other scripts (images, facts) and replace ours.
  let credits = {};
  try {
    credits = JSON.parse(await fs.readFile(CREDITS_FILE, "utf8"));
  } catch {
    // First run.
  }
  credits.donki = {
    name: "NASA DONKI space weather database",
    provider: "NASA Goddard, Community Coordinated Modeling Center (CCMC)",
    homepage: "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
    api: [`${NASA_API}/{FLR,SEP,CME,GST}`, `${CCMC_API}/{FLR,SEP,CME,GST}`],
    usedFor: "Solar flare, particle storm and solar cloud alerts, and the difficulty stars for each mission date.",
    fetchedAt: new Date().toISOString(),
    datasets: files.map((f) => ({
      file: `data/donki/${f.id}.json`,
      label: f.label,
      startDate: f.startDate,
      endDate: f.endDate,
      why: f.why,
      reference: f.reference,
      counts: f.counts,
    })),
  };
  credits.images = {
    name: "NASA Image and Video Library",
    homepage: "https://images.nasa.gov/",
    api: ["https://images-api.nasa.gov/search"],
    usedFor: "The real photo shown after each crater picture in the photo race.",
    fetchedAt: new Date().toISOString(),
    items: craters.map((c) => ({ name: c.name, nasaId: c.nasaId, credit: c.credit, mission: c.mission, link: c.link })),
  };
  credits.osdr = {
    name: "NASA Open Science Data Repository (OSDR)",
    homepage: "https://osdr.nasa.gov/bio/repo/",
    api: ["https://osdr.nasa.gov/osdr/data/search"],
    usedFor: "The science fact card in the debrief, matched to how the mission was played.",
    fetchedAt: facts.fetchedAt,
    items: facts.facts.filter((f) => f.study).map((f) => ({ topic: f.tag, accession: f.study.accession, title: f.study.title, link: f.study.link })),
  };
  // Facts that are not fetched: fixed values with their published source.
  credits.staticFacts = [
    { fact: "Moon surface dose: about 1.37 mSv per day", source: "Zhang et al. 2020, Science Advances (Chang'e-4, Chinese-German, not NASA)", link: "https://doi.org/10.1126/sciadv.aaz1334" },
    { fact: "NASA career limit 600 mSv; 250 mSv for one particle storm", source: "NASA-STD-3001 radiation brief", link: "https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf" },
    { fact: "A chest X-ray is about 0.1 mSv", source: "NASA NTRS dose comparisons", link: "https://ntrs.nasa.gov/api/citations/20250006168/downloads/ASCEND%20Simonsen%20draft%201.pdf" },
    { fact: "May 2024 'Gannon' storm dates", source: "NASA Science and CCMC", link: "https://science.nasa.gov/science-research/heliophysics/how-nasa-tracked-the-most-intense-solar-storm-in-decades/" },
    { fact: "Greenhouse rules: light, water, time", source: "Canadian Space Agency food toolkit", link: "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/" },
  ];
  await fs.writeFile(CREDITS_FILE, `${JSON.stringify(credits, null, 2)}\n`);
  console.log(`Saved ${files.length} DONKI files and ${path.relative(ROOT, CREDITS_FILE)}.`);
}

main().catch((error) => {
  console.error(`fetch-nasa failed: ${error.message}`);
  console.error("Existing cached files were left as they are.");
  process.exitCode = 1;
});
