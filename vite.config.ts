import { defineConfig } from "vite-plus";

export default defineConfig({
  base: "/grid-graph-puzzle/",
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  server: {
    port: 5178,
  },
});
