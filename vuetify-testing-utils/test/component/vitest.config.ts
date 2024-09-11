import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  test: {
    clearMocks: true,
    environment: "jsdom",
    server: {
      deps: {
        inline: ["vuetify"],
      },
    },
    setupFiles: ["setup"],
  },
  resolve: {
    alias: {
      "@": new URL("../../src/", import.meta.url).pathname,
      "@/*": new URL("../../src/*", import.meta.url).pathname,
      "@@": new URL("../../", import.meta.url).pathname,
      "@@/*": new URL("../../*", import.meta.url).pathname,
    },
  },
});
