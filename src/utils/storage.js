import { STORAGE_KEY } from "../config.js";

export function readBestScore() {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score) {
  try {
    if (score > readBestScore()) {
      localStorage.setItem(STORAGE_KEY, String(score));
      return score;
    }
  } catch {
    return readBestScore();
  }
  return readBestScore();
}
