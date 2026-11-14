// Turns the real solar events of a mission window into difficulty stars.

import { realEventsByDay } from "./events.js";

/**
 * The spec's formula, 1*M + 3*X + 5*SEP + 2*Earth-directed CME, applied to
 * mission DAYS rather than raw records. DONKI logs one particle storm several
 * times (once per instrument) and the May 2024 storm has 100 flares in ten
 * days, so counting records would make every active week three stars.
 * The star cut-offs were raised to match: 0-2, 3-15, 16+.
 */
export function difficultyFor(donki, missionDate, totalDays) {
  const days = realEventsByDay(donki, missionDate, totalDays);
  const count = { M: 0, X: 0, SEP: 0, CME: 0 };
  for (const { alert, notices } of days) {
    if (alert) count[alert.level] += 1;
    if (notices.some((n) => n.kind === "cme")) count.CME += 1;
  }
  const score = count.M + 3 * count.X + 5 * count.SEP + 2 * count.CME;
  const stars = score <= 2 ? 1 : score <= 15 ? 2 : 3;

  const bigFlares = (donki?.events?.FLR ?? []).filter((f) => {
    const time = f.peakTime ?? f.beginTime ?? "";
    return f.classType?.[0] === "X" && days.some((d) => time.startsWith(d.date));
  }).length;
  const flareDays = count.M + count.X + count.SEP;

  let summary;
  if (flareDays === 0) summary = "The Sun was quiet. No flares reached the Moon.";
  else if (bigFlares > 0) summary = `The Sun fired ${bigFlares} big flare${bigFlares > 1 ? "s" : ""}. Flare alerts on ${flareDays} day${flareDays > 1 ? "s" : ""}.`;
  else summary = `Flare alerts on ${flareDays} day${flareDays > 1 ? "s" : ""}, none of the biggest kind.`;

  return { score, stars, count, bigFlares, flareDays, summary };
}

export function starText(stars, max = 3) {
  return "★".repeat(stars) + "☆".repeat(Math.max(0, max - stars));
}
