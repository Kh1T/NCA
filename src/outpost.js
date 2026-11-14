const CREW_SIZE = 4;
const SOL_COUNT = 6;
const LIMITS = { air: 10, water: 10, food: 10, power: 12, shield: 3, health: 100, morale: 100 };
const RESOURCE_INFO = {
  power: { label: "POWER", unit: "battery units", tone: "power" },
  air: { label: "BREATHING AIR", unit: "crew-days", tone: "air" },
  water: { label: "WATER", unit: "crew-days", tone: "water" },
  food: { label: "MEALS", unit: "crew-days", tone: "food" },
  shield: { label: "STORM SHELTER", unit: "layers", tone: "shield" },
};

const FACTS = [
  {
    label: "LIFE SUPPORT",
    title: "A Mars day is called a sol.",
    text: "One sol lasts about 24 hours and 39 minutes. Your crew uses air, water, food, and power every sol, even when no experiment is running.",
    url: "https://www.nasa.gov/wp-content/uploads/2026/07/martian-dust-exposure-limits-sp-20260005907.pdf",
    source: "NASA Mars surface operations brief",
  },
  {
    label: "POWER",
    title: "Dust can dim a solar-powered mission.",
    text: "During Mars' 2018 global dust storm, solar-powered Opportunity rested to save energy while nuclear-powered Curiosity kept working.",
    url: "https://astrobiology.nasa.gov/news/forecasting-martian-dust-storms/",
    source: "NASA Astrobiology",
  },
  {
    label: "COMMUNICATIONS",
    title: "Earth cannot answer instantly.",
    text: "NASA mission studies show Mars messages can take about 4 to 24 minutes one way. A question and answer can take twice as long, so crews need plans of their own.",
    url: "https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know",
    source: "NASA Space Communications",
  },
  {
    label: "WATER RECOVERY",
    title: "Recycling can save launch mass.",
    text: "NASA demonstrated 98% water recovery on the space station. This game uses simple crew-day meters, not the station's engineering rates.",
    url: "https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station",
    source: "NASA International Space Station",
  },
  {
    label: "SPACE GARDENS",
    title: "Fresh food takes light, water, and time.",
    text: "NASA's Veggie experiments grow plants on the space station. Fresh crops can supplement packed food, but a garden needs care and does not grow overnight.",
    url: "https://www.nasa.gov/missions/station/ways-the-international-space-station-helps-us-study-plant-growth-in-space",
    source: "NASA Plant Research",
  },
  {
    label: "RADIATION SAFETY",
    title: "Water can help make a storm shelter.",
    text: "NASA radiation-protection guidance describes storm shelters and rearranging water containers as part of shielding plans. More shielding means less water ready for other jobs.",
    url: "https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf",
    source: "NASA Radiation Protection Technical Brief",
  },
];

const SOLS = [
  {
    title: "Set up your survival systems",
    tag: "FIRST SHIFT",
    weather: "CLEAR SKIES",
    solar: 4,
    fact: 0,
    description: "The crew is inside the habitat. Pick one system to tune before the first night: recycle water, start a garden, or prepare a storm nook.",
    choices: [
      {
        id: "recycler",
        title: "Tune the water recycler",
        description: "Spend battery power to return water to the tank and log a systems test.",
        costs: { power: 2 },
        gains: { water: 2 },
        science: 1,
        result: "The recycler returned water to the tank. A working loop means fewer supplies need to arrive from Earth.",
      },
      {
        id: "garden-start",
        title: "Start a leafy-green tray",
        description: "Give the seedlings their first grow shift. Fresh food needs time before harvest.",
        costs: { power: 2, water: 1 },
        action: "grow",
        morale: 5,
        result: "The grow lights are on. The plants have started their first slow shift toward a harvest.",
      },
      {
        id: "water-shelter",
        title: "Stack water by the storm nook",
        description: "Move some water containers beside the shelter to add a layer of protection.",
        costs: { water: 2 },
        gains: { shield: 1 },
        result: "The crew organized water containers around the storm nook. That water is less handy for drinking, but it can help shield the crew.",
      },
    ],
  },
  {
    title: "Dust steals a little sunlight",
    tag: "POWER BUDGET",
    weather: "DUSTY SKIES",
    solar: 1,
    fact: 1,
    description: "Dust has settled on the solar array, and less sunlight is getting through today. Choose what to protect: tomorrow's power, the greenhouse, or research.",
    choices: [
      {
        id: "clean-panels",
        title: "Send the rover to brush the panels",
        description: "Use a little power now to improve solar charging on every later sol.",
        costs: { power: 1 },
        action: "clean-panels",
        science: 1,
        result: "The rover cleared part of the array. Future sols will collect one extra battery unit from sunlight.",
      },
      {
        id: "dim-lights",
        title: "Dim the grow lights",
        description: "Save stored power today, but the garden will not grow this shift.",
        gains: { power: 2 },
        morale: -3,
        result: "The habitat saved battery power by dimming the garden lights. The plants did not get a grow shift today.",
      },
      {
        id: "rock-study",
        title: "Keep the science lab running",
        description: "Spend power to study a rock sample while the sunlight is weak.",
        costs: { power: 3 },
        science: 2,
        result: "The crew finished a useful rock analysis, but the lab used battery power that could have gone elsewhere.",
      },
    ],
  },
  {
    title: "Solar particle storm warning",
    tag: "ACT BEFORE THE WINDOW CLOSES",
    weather: "RADIATION WATCH",
    solar: 2,
    fact: 2,
    type: "radiation",
    description: "A training alert says a burst of solar particles may arrive in 15 minutes. At this mission distance, a message to Earth takes about 21 minutes one way. The crew must decide locally.",
    choices: [
      {
        id: "enter-shelter",
        title: "Move water and crew into the shelter",
        description: "Use water containers as extra shielding and get everyone inside before the alert window closes.",
        costs: { water: 2, power: 1 },
        gains: { shield: 1 },
        storm: "shelter",
        result: "The crew followed its onboard checklist and sheltered before the particle burst.",
      },
      {
        id: "wait-for-earth",
        title: "Wait for Mission Control",
        description: "Send a question, but Earth cannot send a reply before this 15-minute warning window ends.",
        storm: "wait",
        warning: "A reply takes about 21 minutes to reach Mars, then about 21 minutes to come back.",
        result: "The crew waited for a reply that could not arrive before the warning window closed.",
      },
      {
        id: "keep-working",
        title: "Keep the lab and garden running",
        description: "Use the power for research and crops instead of moving everyone to shelter.",
        costs: { power: 2 },
        science: 2,
        action: "grow",
        storm: "exposed",
        warning: "The crew stays outside the storm nook during the alert.",
        result: "The lab collected more data, but the crew stayed exposed during the particle burst.",
      },
    ],
  },
  {
    title: "The air maker needs a power shift",
    tag: "LIFE SUPPORT",
    weather: "CLEAR SKIES",
    solar: 4,
    fact: 3,
    description: "The breathing-air reserve is shrinking. The oxygen maker can split water, while the recycler can recover more water. Both need battery power.",
    choices: [
      {
        id: "make-air",
        title: "Make oxygen from water",
        description: "Use power and a little water to refill the breathing-air reserve.",
        costs: { power: 2, water: 1 },
        gains: { air: 3 },
        result: "The oxygen maker turned water into breathing air. The crew gained air, but the water tank got smaller.",
      },
      {
        id: "recover-water",
        title: "Run the water recovery loop",
        description: "Spend power to recover water instead of boosting the air reserve this shift.",
        costs: { power: 2 },
        gains: { water: 2 },
        science: 1,
        result: "The water loop returned more water to storage. The breathing-air reserve still needs attention later.",
      },
      {
        id: "sample-analysis",
        title: "Analyze a science sample",
        description: "Keep the lab busy for a stronger research result, but leave life-support reserves alone.",
        costs: { power: 3 },
        science: 3,
        result: "The sample analysis added research points, but it did not refill air or water.",
      },
    ],
  },
  {
    title: "The garden needs another grow shift",
    tag: "FOOD PRODUCTION",
    weather: "PARTLY CLOUDY",
    solar: 3,
    fact: 4,
    description: "The plants are growing, but there is no harvest yet. You can spend power and water on the garden, top up air, or save the battery for tomorrow.",
    choices: [
      {
        id: "garden-grow",
        title: "Run the grow lights",
        description: "Give the plants another full shift. Two grow shifts are needed for this training harvest.",
        costs: { power: 2, water: 1 },
        action: "grow",
        morale: 5,
        result: "The garden got another grow shift. A steady light-and-water plan can add fresh food to packed meals.",
      },
      {
        id: "air-filter",
        title: "Run the backup oxygen maker",
        description: "Use power to split water and refill the breathing-air reserve.",
        costs: { power: 2, water: 1 },
        gains: { air: 2 },
        result: "The backup oxygen maker split water and replenished the breathing-air reserve.",
      },
      {
        id: "quiet-shift",
        title: "Give the crew a quiet shift",
        description: "Pause extra work to recharge the battery and help the crew feel rested.",
        gains: { power: 2 },
        morale: 12,
        result: "The crew rested while nonessential equipment stayed off. A rested crew is part of a healthy mission too.",
      },
    ],
  },
  {
    title: "Prepare the next crew's handover",
    tag: "FINAL SOL",
    weather: "CLEAR SKIES",
    solar: 4,
    fact: 5,
    description: "Your final shift is here. Send your research, harvest any ready greens, or add another layer to the storm shelter before the next crew arrives.",
    choices: [
      {
        id: "transmit-data",
        title: "Transmit the research package",
        description: "Spend power to send your findings toward Earth. The signal still travels at light speed.",
        costs: { power: 3 },
        science: 3,
        result: "The research package is on its way. Mission Control will not see it instantly, so the crew finishes its handover locally.",
      },
      {
        id: "harvest-garden",
        title: "Harvest the leafy greens",
        description: "Collect the garden's fresh food if it has completed two grow shifts.",
        requirements: (state) => state.cropProgress >= 2,
        disabledReason: "Needs two grow shifts",
        action: "harvest",
        gains: { food: 3 },
        morale: 8,
        result: "The crew harvested fresh greens to supplement the packed meals. The garden helped, but did not replace the food stores.",
      },
      {
        id: "reinforce-shelter",
        title: "Reinforce the storm shelter",
        description: "Use a water container and a little power to prepare extra shielding for the next team.",
        costs: { water: 1, power: 1 },
        gains: { shield: 1 },
        result: "The shelter has another shielding layer ready for the next crew's mission plan.",
      },
    ],
  },
];

function freshState() {
  return {
    phase: "plan",
    solIndex: 0,
    selectedChoiceId: null,
    air: 8,
    water: 8,
    food: 8,
    power: 8,
    shield: 0,
    health: 100,
    morale: 72,
    science: 0,
    cropProgress: 0,
    solarBonus: 0,
    report: null,
    history: [],
    ending: "complete",
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function canAfford(choice, state) {
  if (choice.requirements && !choice.requirements(state)) return false;
  return Object.entries(choice.costs ?? {}).every(([resource, amount]) => state[resource] >= amount);
}

function applyChoice(choice, state, scenario) {
  const before = { ...state };
  const notes = [choice.result];

  for (const [resource, amount] of Object.entries(choice.costs ?? {})) {
    state[resource] = Math.max(0, state[resource] - amount);
  }

  for (const [resource, amount] of Object.entries(choice.gains ?? {})) {
    state[resource] = clamp(state[resource] + amount, 0, LIMITS[resource]);
  }

  if (choice.science) state.science += choice.science;
  if (choice.morale) state.morale = clamp(state.morale + choice.morale, 0, LIMITS.morale);

  if (choice.action === "grow") {
    state.cropProgress = Math.min(2, state.cropProgress + 1);
    notes.push(`Garden progress: ${state.cropProgress} of 2 grow shifts.`);
  }

  if (choice.action === "clean-panels") state.solarBonus = Math.min(2, state.solarBonus + 1);

  if (choice.action === "harvest") {
    if (state.cropProgress < 2) {
      notes.push("The garden is not ready to harvest yet.");
    } else {
      state.cropProgress = 0;
    }
  }

  if (scenario.type === "radiation") {
    let damage = 0;
    if (choice.storm === "shelter") damage = Math.max(2, 22 - state.shield * 7);
    if (choice.storm === "wait") damage = Math.max(8, 30 - state.shield * 4);
    if (choice.storm === "exposed") damage = Math.max(10, 34 - state.shield * 5);
    state.health = clamp(state.health - damage, 0, LIMITS.health);
    notes.push(`Storm drill result: crew health changed by −${damage} points. More shelter layers reduced the simulated exposure.`);
  }

  if (state.air > 0) state.air -= 1;
  else {
    state.health = clamp(state.health - 16, 0, LIMITS.health);
    notes.push("The air reserve ran out before the next shift; crew health fell.");
  }

  if (state.water > 0) state.water -= 1;
  else {
    state.health = clamp(state.health - 12, 0, LIMITS.health);
    notes.push("The water reserve ran out before the next shift; crew health fell.");
  }

  if (state.food > 0) state.food -= 1;
  else {
    state.health = clamp(state.health - 10, 0, LIMITS.health);
    state.morale = clamp(state.morale - 8, 0, LIMITS.morale);
    notes.push("The meal stores ran out; crew health and morale fell.");
  }

  if (state.power >= 2) state.power -= 2;
  else {
    state.health = clamp(state.health - 12, 0, LIMITS.health);
    state.power = 0;
    notes.push("There was not enough battery power for the habitat's basic systems.");
  }

  const solarReceived = scenario.solar + state.solarBonus;
  const powerBeforeCharge = state.power;
  state.power = clamp(state.power + solarReceived, 0, LIMITS.power);
  notes.push(`Daily use: 1 crew-day of air, water, and meals; 2 power units for habitat basics. Solar charged ${state.power - powerBeforeCharge} units.`);

  const tracked = ["air", "water", "food", "power", "shield", "health", "morale", "science"];
  const changes = tracked
    .map((key) => ({ key, amount: state[key] - before[key] }))
    .filter((change) => change.amount !== 0);

  return { notes, changes, choiceTitle: choice.title, solTitle: scenario.title };
}

function signed(value) {
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}

function renderChange(change) {
  const labels = {
    air: "Air",
    water: "Water",
    food: "Meals",
    power: "Power",
    shield: "Shelter",
    health: "Crew health",
    morale: "Crew mood",
    science: "Research",
  };
  return `<span class="change-chip ${change.amount > 0 ? "positive" : "negative"}">${labels[change.key]} ${signed(change.amount)}</span>`;
}

function renderMeter(key, state) {
  const info = RESOURCE_INFO[key];
  const value = state[key];
  const max = LIMITS[key];
  const width = Math.round((value / max) * 100);
  const low = value <= (key === "power" ? 3 : 2) ? " low" : "";
  const valueText = key === "shield" ? `${value} / ${max}` : `${value} / ${max}`;
  return `<article class="resource-card ${info.tone}${low}">
    <div class="resource-head"><span>${info.label}</span><span class="resource-value">${valueText}</span></div>
    <div class="meter-track" role="meter" aria-label="${info.label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><span style="width:${width}%"></span></div>
    <div class="resource-foot"><span>${info.unit}</span>${key === "power" ? `<span>2 units / sol for basics</span>` : ""}</div>
  </article>`;
}

function renderChoice(choice, state) {
  const affordable = canAfford(choice, state);
  const selected = choice.id === state.selectedChoiceId;
  const tags = [];
  for (const [key, amount] of Object.entries(choice.costs ?? {})) {
    tags.push(`<span class="effect cost">${RESOURCE_INFO[key]?.label ?? key} −${amount}</span>`);
  }
  for (const [key, amount] of Object.entries(choice.gains ?? {})) {
    tags.push(`<span class="effect gain">${RESOURCE_INFO[key]?.label ?? key} +${amount}</span>`);
  }
  if (choice.action === "grow") tags.push(`<span class="effect gain">GARDEN +1 SHIFT</span>`);
  if (choice.science) tags.push(`<span class="effect gain">RESEARCH +${choice.science}</span>`);
  if (choice.storm === "wait") tags.push(`<span class="effect risk">DELAY RISK</span>`);
  if (choice.storm === "exposed") tags.push(`<span class="effect risk">RADIATION RISK</span>`);
  const status = !affordable ? (choice.disabledReason ?? "Not enough supplies") : selected ? "Selected" : "Select plan";
  return `<button class="choice-card${selected ? " selected" : ""}" type="button" data-choice="${choice.id}" aria-pressed="${selected}" ${affordable ? "" : "disabled"}>
    <span class="choice-number">${String.fromCharCode(65 + SOLS[state.solIndex].choices.indexOf(choice))}</span>
    <span class="choice-content"><strong>${choice.title}</strong><span class="choice-description">${choice.description}</span>
    ${choice.warning ? `<span class="choice-warning">${choice.warning}</span>` : ""}
    <span class="effects">${tags.join("")}</span></span>
    <span class="choice-status">${status}</span>
  </button>`;
}

function renderLandscape(scenario) {
  const weatherClass = scenario.weather === "DUSTY SKIES" ? " dusty" : scenario.weather === "RADIATION WATCH" ? " alert" : "";
  return `<div class="landscape${weatherClass}" role="img" aria-label="A small Mars habitat with solar panels under a red Martian sky">
    <div class="landscape-stars"></div><div class="earth-dot"></div><div class="mars-horizon"></div>
    <div class="ridge ridge-back"></div><div class="ridge ridge-front"></div>
    <div class="base-scene">
      <div class="solar-panel panel-left"><i></i><i></i><i></i><i></i></div>
      <div class="habitat"><span class="habitat-window"></span><span class="habitat-door"></span><span class="habitat-ring"></span></div>
      <div class="solar-panel panel-right"><i></i><i></i><i></i><i></i></div>
      <div class="rover"><span></span><i></i><i></i></div>
    </div>
    <div class="landscape-caption"><span>JEZERO CRATER</span><span>FIELD STATION 04</span></div>
  </div>`;
}

function renderTimeline(state) {
  const completed = state.phase === "plan" ? state.solIndex : Math.min(state.solIndex + 1, SOL_COUNT);
  return `<div class="timeline-track" aria-label="Mission progress">${SOLS.map((scenario, index) => {
    const status = index < completed ? "done" : index === completed && state.phase !== "finished" ? "current" : "upcoming";
    return `<div class="timeline-step ${status}"><span class="step-mark">${index < completed ? "✓" : String(index + 1).padStart(2, "0")}</span><span class="step-name">Sol ${index + 1}</span></div>`;
  }).join("")}</div>`;
}

function renderFact(fact) {
  return `<section class="fact-card">
    <div class="section-kicker"><span class="kicker-dot"></span>NASA FIELD NOTE · ${fact.label}</div>
    <h3>${fact.title}</h3><p>${fact.text}</p>
    <a href="${fact.url}" target="_blank" rel="noopener noreferrer">${fact.source}<span aria-hidden="true"> ↗</span></a>
  </section>`;
}

function renderReview(state) {
  const report = state.report;
  const nextSol = state.solIndex + 2;
  return `<div class="review-panel" aria-live="polite">
    <div class="review-icon" aria-hidden="true">✓</div>
    <div class="section-kicker">SHIFT DEBRIEF · SOL ${state.solIndex + 1}</div>
    <h3>${report.choiceTitle}</h3>
    <ul class="report-notes">${report.notes.map((note) => `<li>${note}</li>`).join("")}</ul>
    <div class="change-list">${report.changes.length ? report.changes.map(renderChange).join("") : `<span class="change-chip neutral">No reserve change</span>`}</div>
    <button class="primary-button continue-button" type="button" data-action="continue">${state.solIndex + 1 >= SOL_COUNT ? "Complete the mission" : `Continue to Sol ${nextSol}`}<span aria-hidden="true">→</span></button>
  </div>`;
}

function renderPlan(state, scenario) {
  const selected = scenario.choices.find((choice) => choice.id === state.selectedChoiceId);
  return `<div class="choice-area">
    <div class="choice-intro"><div><div class="section-kicker">PICK ONE PLAN</div><p>Check the costs, then commit your crew's choice. Daily supplies are used when the sol ends.</p></div><span class="one-plan">ONE ACTION</span></div>
    <div class="choice-list" role="group" aria-label="Mission plans">${scenario.choices.map((choice) => renderChoice(choice, state)).join("")}</div>
    <div class="commit-row"><span class="commit-hint">${selected ? `Ready: ${selected.title}` : "Choose a plan to continue."}</span><button class="primary-button" type="button" data-action="commit" ${selected && canAfford(selected, state) ? "" : "disabled"}>Commit plan<span aria-hidden="true">→</span></button></div>
  </div>`;
}

function renderMission(root, state) {
  const scenario = SOLS[state.solIndex];
  const fact = FACTS[scenario.fact];
  const currentSol = Math.min(state.solIndex + (state.phase === "review" ? 1 : 1), SOL_COUNT);
  const phaseText = state.phase === "review" ? "SHIFT REVIEW" : "OUTPOST OPERATIONS";
  root.innerHTML = `<div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Astropeer mission control">
        <span class="brand-mark">AP</span><span class="brand-name">ASTROPEER<span>MISSION CONTROL</span></span>
      </a>
      <div class="top-status"><span class="status-light"></span> MARS SURFACE MISSION</div>
      <div class="top-actions"><span class="mission-code">JZ-04 · CREW ${String(CREW_SIZE).padStart(2, "0")}</span><button type="button" class="restart-button" data-action="restart">RESTART</button></div>
    </header>
    <main class="main-layout">
      <section class="mission-heading">
        <div><div class="eyebrow">${phaseText} <span> / </span> JEZERO CRATER</div><h1>Keep the outpost <em>ready.</em></h1><p>Lead four explorers through six sols. Every system shares the same power, water, and crew time.</p></div>
        <div class="sol-counter"><span>SOL</span><strong>${String(currentSol).padStart(2, "0")}</strong><span>OF 06</span></div>
      </section>
      <div class="mission-grid">
        <aside class="side-column">
          <section class="outpost-card">${renderLandscape(scenario)}<div class="outpost-caption"><span><strong>RED MESA</strong><small>MARS · JEZERO CRATER</small></span><span class="site-status"><i></i>${scenario.weather}</span></div></section>
          <section class="crew-card">
            <div class="card-label"><span>CREW CONDITION</span><span>${CREW_SIZE} EXPLORERS</span></div>
            <div class="crew-meter-row"><strong>${state.health}%</strong><span>HEALTH</span><div class="crew-meter"><span style="width:${state.health}%"></span></div></div>
            <div class="crew-footer"><span>TEAM MOOD</span><strong>${state.morale >= 70 ? "STEADY" : state.morale >= 40 ? "TIRED" : "LOW"}</strong><div class="mood-dots">${[0, 1, 2, 3, 4].map((i) => `<i class="${state.morale > i * 20 ? "on" : ""}"></i>`).join("")}</div></div>
          </section>
          ${renderFact(fact)}
        </aside>
        <section class="operations-column">
          <div class="ops-strip"><span class="ops-label"><i></i> ${state.phase === "review" ? "SHIFT COMPLETE" : `SOL ${String(currentSol).padStart(2, "0")} · ${scenario.tag}`}</span><span class="comm-link"><span class="signal-icon">↗</span> EARTH LINK <strong>21 MIN · ONE WAY</strong></span></div>
          <section class="resource-section"><div class="resource-heading"><div><div class="section-kicker">OUTPOST RESERVES</div><span>Game units · current crew-day supplies</span></div><span class="battery-forecast">NEXT SUNLIGHT <strong>+${scenario.solar + state.solarBonus} POWER</strong></span></div>
            <div class="resource-grid">${["power", "air", "water", "food", "shield"].map((key) => renderMeter(key, state)).join("")}</div>
          </section>
          <section class="decision-card">
            <div class="decision-head"><div><div class="section-kicker">${state.phase === "review" ? "MISSION LOG" : "TODAY'S CHALLENGE"}</div><h2>${state.phase === "review" ? "Your choice is in." : scenario.title}</h2><p>${state.phase === "review" ? "See what changed before the next outpost shift." : scenario.description}</p></div><span class="event-mark">${String(state.solIndex + 1).padStart(2, "0")}<small>/06</small></span></div>
            ${state.phase === "review" ? renderReview(state) : renderPlan(state, scenario)}
          </section>
          <section class="timeline-card"><div class="timeline-heading"><div><div class="section-kicker">MISSION TIMELINE</div><span>${state.phase === "review" ? `${state.solIndex + 1} of ${SOL_COUNT} sols complete` : `${state.solIndex} of ${SOL_COUNT} sols complete`}</span></div><span class="timeline-legend"><i></i> COMPLETE <i class="legend-current"></i> CURRENT</span></div>${renderTimeline(state)}</section>
        </section>
      </div>
      <footer class="site-footer"><span>TRAINING SIMULATION · NOT FLIGHT GUIDANCE</span><span>NASA facts are linked in the field notes. All game meters are simplified.</span></footer>
    </main>
  </div>`;
}

function renderFinished(root, state) {
  const complete = state.ending === "complete";
  const title = complete ? state.health >= 70 ? "Outpost ready for handover." : "Mission complete. Lessons learned." : "Mission paused: the crew needs help.";
  const summary = complete
    ? "Your crew made it through the six-sol training mission. Every plan shifted the balance between supplies, science, and safety."
    : "A key reserve ran too low for the crew to continue safely. In a real mission, teams plan backup systems before a crisis begins.";
  const remaining = ["air", "water", "food", "power", "shield"].map((key) => `<div class="final-stat"><span>${RESOURCE_INFO[key].label}</span><strong>${state[key]}<small> / ${LIMITS[key]}</small></strong></div>`).join("");
  const lessons = state.history.slice(-3).map((item) => `<li><span>SOL ${String(item.sol).padStart(2, "0")}</span><span>${item.choiceTitle}</span></li>`).join("");
  root.innerHTML = `<div class="app-shell finish-shell">
    <header class="topbar"><div class="brand"><span class="brand-mark">AP</span><span class="brand-name">ASTROPEER<span>MISSION CONTROL</span></span></div><div class="top-status"><span class="status-light"></span> MISSION REPORT</div><span class="mission-code">JZ-04 · CREW ${String(CREW_SIZE).padStart(2, "0")}</span></header>
    <main class="finish-layout"><section class="finish-hero"><div class="eyebrow">SIX-SOL MISSION REPORT <span> / </span> JEZERO CRATER</div><h1>${title}</h1><p>${summary}</p><div class="finish-stamp"><span class="stamp-ring">${complete ? "OK" : "!"}</span><span>${complete ? "CREW SAFE" : "SAFETY LIMIT REACHED"}<small>FINAL CREW HEALTH · ${state.health}%</small></span></div></section>
      <section class="finish-grid"><article class="final-card"><div class="section-kicker">FINAL RESERVES</div><div class="final-stats">${remaining}</div><div class="research-score"><span>RESEARCH POINTS</span><strong>${state.science}</strong></div><div class="garden-score"><span>GARDEN GROWTH</span><strong>${state.cropProgress} / 2 shifts</strong></div></article>
      <article class="final-card lessons-card"><div class="section-kicker">YOUR CREW'S FIELD LOG</div>${lessons ? `<ol>${lessons}</ol>` : `<p>Your crew is ready to choose its first plan.</p>`}<div class="finish-lesson"><strong>Mission lesson</strong><p>Earth can advise, but a Mars crew needs supplies, shelter, and a plan it can use before a message arrives.</p></div></article></section>
      <div class="finish-actions"><button class="primary-button" type="button" data-action="restart">Fly another mission<span aria-hidden="true">→</span></button><span>${state.history.length} decisions · ${state.science} research points</span></div>
      <section class="sources-footer"><div class="section-kicker">KEEP EXPLORING · NASA SOURCES</div>${FACTS.map((fact) => `<a href="${fact.url}" target="_blank" rel="noopener noreferrer">${fact.source}<span aria-hidden="true"> ↗</span></a>`).join("")}</section>
      <footer class="site-footer"><span>TRAINING SIMULATION · NOT FLIGHT GUIDANCE</span><span>All game meters are simplified, not hardware measurements.</span></footer>
    </main>
  </div>`;
}

export function createOutpost(root) {
  if (!root) return;
  let state = freshState();

  function render() {
    if (state.phase === "finished") renderFinished(root, state);
    else renderMission(root, state);
  }

  function commitChoice() {
    const scenario = SOLS[state.solIndex];
    const choice = scenario.choices.find((item) => item.id === state.selectedChoiceId);
    if (!choice || !canAfford(choice, state)) return;
    state.report = applyChoice(choice, state, scenario);
    state.history.push({ sol: state.solIndex + 1, choiceTitle: choice.title });
    state.selectedChoiceId = null;
    if (state.health <= 0) {
      state.ending = "paused";
      state.phase = "finished";
    } else {
      state.phase = "review";
    }
    render();
    root.querySelector("[data-action='continue'], [data-action='restart']")?.focus();
  }

  function continueMission() {
    if (state.solIndex + 1 >= SOL_COUNT) {
      state.phase = "finished";
      state.ending = "complete";
    } else {
      state.solIndex += 1;
      state.phase = "plan";
      state.report = null;
      state.selectedChoiceId = null;
    }
    render();
    root.querySelector("[data-choice]")?.focus();
  }

  function restartMission() {
    state = freshState();
    render();
    root.querySelector("[data-choice]")?.focus();
  }

  root.addEventListener("click", (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;
    if (target.matches("a.brand")) {
      event.preventDefault();
      return;
    }
    if (target.dataset.choice) {
      state.selectedChoiceId = target.dataset.choice;
      render();
      root.querySelector(`[data-choice="${state.selectedChoiceId}"]`)?.focus();
      return;
    }
    if (target.dataset.action === "commit") commitChoice();
    if (target.dataset.action === "continue") continueMission();
    if (target.dataset.action === "restart") restartMission();
  });

  render();
}
