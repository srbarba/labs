import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";
import blue from "@park-ui/panda-preset/colors/blue";
import slate from "@park-ui/panda-preset/colors/slate";
import { actionButtonManualRecipe } from "./packages/ui-manual/src/action-button/recipe";
import { actionButtonTokens } from "./packages/ui/src/actionButton/tokens";
import { actionButtonRecipe } from "./packages/ui/src/actionButton/recipe";
import { statusChipTokens } from "./packages/ui/src/statusChip/tokens";
import { statusChipRecipe } from "./packages/ui/src/statusChip/recipe";
import { notificationButtonTokens } from "./packages/ui/src/notificationButton/tokens";
import { notificationButtonRecipe } from "./packages/ui/src/notificationButton/recipe";

/**
 * Hand-written app-level wiring — NOT generated. It stays editable across
 * phases even though it references generated recipes: registering a recipe
 * in Panda's theme is host-app configuration, not component output.
 *
 * Each component's generated `tokens.ts` (Fase 4) is the single source of
 * color/spacing/radius values for its own recipe — regenerating it from
 * tokens/tokens.json is enough to restyle it without touching this file
 * again. mergeTokenSets deep-merges every component's token fragment
 * (rather than overwriting) since they all share top-level Panda categories
 * (colors/radii/spacing/fontSizes) but namespace their own values under
 * their own component name.
 */
function mergeTokenSets(...sets: Record<string, unknown>[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const set of sets) {
    for (const [category, value] of Object.entries(set)) {
      out[category] = { ...(out[category] as object | undefined), ...(value as object) };
    }
  }
  return out;
}

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
      tokens: mergeTokenSets(actionButtonTokens, statusChipTokens, notificationButtonTokens),
      slotRecipes: {
        actionButtonManual: actionButtonManualRecipe,
        actionButton: actionButtonRecipe,
        statusChip: statusChipRecipe,
        notificationButton: notificationButtonRecipe,
      },
    },
  },
});
