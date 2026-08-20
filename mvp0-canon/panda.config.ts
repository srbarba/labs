import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";
import blue from "@park-ui/panda-preset/colors/blue";
import slate from "@park-ui/panda-preset/colors/slate";
import { actionButtonManualRecipe } from "./packages/ui-manual/src/action-button/recipe";
import { actionButtonTokens } from "./packages/ui/src/actionButton/tokens";
import { actionButtonRecipe } from "./packages/ui/src/actionButton/recipe";

/**
 * Hand-written app-level wiring — NOT generated. It stays editable across
 * phases even though it references generated recipes: registering a recipe
 * in Panda's theme is host-app configuration, not component output.
 *
 * actionButtonTokens (Fase 4) is the single source of color/spacing/radius
 * values for BOTH the manual and generated recipes — regenerating it from
 * tokens/tokens.json is enough to restyle either one without touching this
 * file again.
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
      tokens: actionButtonTokens,
      slotRecipes: {
        actionButtonManual: actionButtonManualRecipe,
        actionButton: actionButtonRecipe,
      },
    },
  },
});
