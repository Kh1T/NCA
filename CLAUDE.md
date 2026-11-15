# OUTPOST: Dark Side

Browser game for ages 7–12: run a Moon base, survive solar storms taken from NASA's real records, learn that every choice saves one thing and costs another. Built for the NASA Space Apps Challenge. Single player, static build, no backend.

## Working rules
- **Never `git commit` or push** unless explicitly asked. NCA is a shared team repo.
- Always plan and get approval before large changes.
- Check in with the user after each step of the build plan; do not run ahead.
- Treat the user's email and project details as private; never send them to outside services.

## Commands
```
npm run dev          # Vite dev server (Moon game: index.html; old Mars game: mars.html)
npm test             # Vitest: rules, scenarios, badges, text length (src/sim/__tests__)
npm run build        # production build to dist/
npm run fetch-nasa   # refresh cached NASA data (needs internet; NASA_API_KEY in .env optional)
node scripts/balance-trace.js [scenarioId] [best|work|nocharge|smart] [seed]   # day-by-day bot run
```
Dev helpers: `window.__outpost` is the Phaser game; `?scene=<Key>` jumps to a scene; `window.__overflow()` lists any text that spills out of its panel or button (empty list = all good).

## How the game plays (round 3)
- Pick one of 4 missions (they are the difficulty ladder: Calm ★, Busy ★★, This Month ★★, Storm ★★★). No difficulty picker, no Custom mode.
- 4 how-to-play cards → STARTER PACK (or make your own) → landing → the base.
- Each day: build at flags (3 slots), then NEXT DAY opens one **day card** (`dayCard` in `rules.js`): 2–3 choices that fit the situation, with a preview of what each changes. Power is shared out automatically in a fixed order (air, oxygen, heaters at night, water recycler, the choice, builds, greenhouse).
- The last `nightDays` days are the **lunar night**: no solar power, heaters on. Charge up before dark or save power at night.
- Water has no building: the ship recycles it using power. Short on power = water drains.
- The rover can be built any time. A ROVER TRIP is a day's choice; photos are kept between trips (no timer).
- Win = everything built + 5 photos + reach sunrise. The debrief shows each day's choice next to the best call.
- One character only: the astronaut (hints are its speech bubbles). No Ceres, no crewmates, no antenna, no water extractor.

## Stack
Phaser 4, Vite, Vitest, JavaScript ES modules. 640×360 pixel-art canvas, Scale.FIT, arcade physics.

## Architecture
- `src/sim/` — pure rules engine, **no Phaser imports**. Seeded RNG lives in state; `advanceDay(state, plan)` returns a cloned state plus a report. Files: `state, rules, buildings, events, difficulty, scoring`. Keep all game numbers here and covered by tests.
- Flow: Title → Story (first launch) → Scenario (4 cards) → HowTo (4 cards) → Blueprints (starter pack / editor) → Landing → Outpost + OutpostUi ⇄ PhotoMission (trips) → Debrief. Menu also opens Badges, Glossary, Credits.
- `src/scenes/` — one file per screen above, plus Alert (overlay), Evacuated, UiTest (`?scene=UiTest`).
- `src/minigames/` — DragToShelter, PatchLeak, DustWipe, RepairBot, Controls, Viewfinder.
- `src/ui/` — shared widgets: `kit.js` (`Layer`, `FocusGroup`, buttons, dialog), Meter, Slider, Toggle, BuildQueue, `chips.js` (icon + value rows), `icons.js` (all pixel icons), InfoCard (the "i" button and Did-you-know card), Coach (tutorials), Toast (pop-ups, badges), TouchPad, Cockpit, SoundPanel, Settings (sound, pause, restart, leave), `sfx.js` (Web Audio effects, engine hum, music).
- `src/data/` — content as plain data: `scenarios.js` (add a scenario = add an object), `info.js` (info cards), `glossary.js` (82 terms), `badges.js`; plus loaders for cached NASA files. `public/data/`, `public/assets/craters/` — the cached files, written by `scripts/fetch-nasa.js`.
- `src/utils/progress.js` — what the device remembers (tutorials seen, badges, sound settings), all reads/writes wrapped in try/catch.
- Legacy, untouched: `src/mars.js`, `src/outpost.js`, `src/content.js`, `src/config.js`, old Mars scenes.

## Data honesty
- NASA data is fetched once at build time, cached with its fetch date, never fetched while playing. Never call saved data "live".
- Real data carries a "REAL DATA" badge with source and date. Scaled game numbers are labelled simplified.
- DONKI is read from `ccmc.gsfc.nasa.gov/DONKI-API/get/` (api.nasa.gov flare endpoint returned 404).
- Every alert option must have a visible cost; a test fails the build if any is free.

## Text sizes and layout
- Sizes come from `UI` in `src/constants.js` (body 18, big 24, title 32, huge 48 canvas px). Nothing under 18.
- Buttons the player taps during play are 34–40 px tall. On a phone in landscape the canvas shows at about 1.04–1.1×.
- `src/sim/__tests__/text.test.js` fails if any rules/content line is over 12 words (glossary: 20). Science Sources pages are exempt.
- Text is plain Jersey 15 with no shadow, stroke or outline. `textStyle` renders it at 2–4× resolution so it stays sharp when scaled.
- Every text must stay inside its box: check with `window.__overflow()` after layout changes.
- Edit files with UTF-8-safe tools (PowerShell 5 `Get-Content`/`Set-Content` garbles characters like · ° ↗).

## Game design rules
- Audience: children 7–12. Show, don't tell: icons, animation and color over sentences.
- Max ~12 words per on-screen message, simple words, one idea at a time.
- Info/"Did you know?" content is on demand (info button), never forced.
- Font: Jersey 15, bundled locally, large sizes for readability, no text effects.
- The game must be explainable in a 30-second demo: simple loop, few taps per day.
- The core of the challenge is resource decisions: every choice has a visible gain and cost, and the best choice depends on the situation.
- Must work on desktop and mobile: touch targets of at least 44px, no hover-only interactions.
- Glossary: write original short definitions, credit NASA Space Place, don't copy its text.
- Always plan and get approval before large changes.

