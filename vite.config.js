import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative paths so the build works on GitHub Pages, Netlify or any subfolder.
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        // The earlier Mars choice game, kept as its own page.
        mars: resolve(import.meta.dirname, "mars.html"),
      },
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.js"],
    environment: "node",
  },
});
