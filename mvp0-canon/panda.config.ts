import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";
import blue from "@park-ui/panda-preset/colors/blue";
import slate from "@park-ui/panda-preset/colors/slate";
import { actionButtonManualRecipe } from "./packages/ui-manual/src/action-button/recipe";

/**
 * Hand-written app-level wiring — NOT generated. It stays editable across
 * phases even though it references generated recipes: registering a recipe
 * in Panda's theme is host-app configuration, not component output.
 */
export default defineConfig({
  preflight: true,
  presets: [createPreset({ accentColor: blue, grayColor: slate, radius: "sm" })],
  include: [
    "./packages/ui-manual/src/**/*.{ts,tsx}",
    "./packages/ui/src/**/*.{ts,tsx}",
    "./apps/storybook/**/*.{ts,tsx}",
  ],
  exclude: [],
  jsxFramework: "react",
  outdir: "styled-system",
  theme: {
    extend: {
      tokens: {
        // Fase 0 control: values are typed by hand, copied from tokens/tokens.json
        // at the time of writing. This duplication — and the drift it invites
        // the moment tokens.json changes — is exactly what Fase 4's generated
        // preset (packages/ui/panda-preset.generated.ts) exists to remove.
        colors: {
          actionButton: {
            idle: {
              bg: { value: "#2563eb" },
              fg: { value: "#ffffff" },
              border: { value: "#2563eb" },
            },
            pending: {
              bg: { value: "#60a5fa" },
              fg: { value: "#ffffff" },
              border: { value: "#60a5fa" },
            },
            success: {
              bg: { value: "#16a34a" },
              fg: { value: "#ffffff" },
              border: { value: "#16a34a" },
            },
            error: {
              bg: { value: "#dc2626" },
              fg: { value: "#ffffff" },
              border: { value: "#dc2626" },
            },
            disabled: {
              bg: { value: "#e5e7eb" },
              fg: { value: "#9ca3af" },
              border: { value: "#e5e7eb" },
            },
          },
        },
        radii: {
          actionButton: { value: "6px" },
        },
        spacing: {
          actionButton: {
            paddingX: { value: "16px" },
            paddingY: { value: "8px" },
            gap: { value: "8px" },
          },
        },
        fontSizes: {
          actionButton: { value: "14px" },
        },
      },
      slotRecipes: {
        actionButtonManual: actionButtonManualRecipe,
      },
    },
  },
});
