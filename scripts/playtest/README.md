# Automated play-tests

Headless-browser scripts that play the game like a player, take screenshots,
and check that every text stays inside its box (`window.__overflow()`).

They are not part of `npm test`. To run them you need Microsoft Edge and
`playwright-core` (not in package.json, so install it yourself), plus the dev server:

```
npm i --no-save playwright-core
npx vite --port 4599 --strictPort      # in another terminal
node scripts/playtest/play3.mjs 0 r3 1   # full mission: card 0-3, prefix, 1 = show tutorials
node scripts/playtest/mobile3.mjs 844 390 m3   # touch-only phone run + portrait check
node scripts/playtest/sweep3.mjs         # every screen and pop-up, overflow check
```

Screenshots go to `scripts/playtest/shots/` (create it or let the scripts do it).
