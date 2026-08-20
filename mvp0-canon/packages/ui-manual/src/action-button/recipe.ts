import { defineSlotRecipe } from "@pandacss/dev";

/**
 * Hand-written Panda recipe. Colors are read from the shared DTCG token set
 * (tokens/tokens.json) via Panda's `color.actionButton.<state>.<slot>` paths,
 * so both the manual and the generated component draw from the same source
 * of truth for color — only the recipe authoring differs.
 */
export const actionButtonManualRecipe = defineSlotRecipe({
  className: "action-button-manual",
  slots: ["root", "label", "indicator"],
  base: {
    root: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "actionButton.gap",
      paddingInline: "actionButton.paddingX",
      paddingBlock: "actionButton.paddingY",
      borderRadius: "actionButton",
      fontSize: "actionButton",
      fontWeight: "medium",
      borderWidth: "1px",
      borderStyle: "solid",
      cursor: "pointer",
      transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
      _disabled: { cursor: "not-allowed" },
    },
    label: {},
    indicator: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  variants: {
    state: {
      idle: {
        root: { background: "actionButton.idle.bg", borderColor: "actionButton.idle.border" },
        label: { color: "actionButton.idle.fg" },
        indicator: { color: "actionButton.idle.fg" },
      },
      pending: {
        root: { background: "actionButton.pending.bg", borderColor: "actionButton.pending.border" },
        label: { color: "actionButton.pending.fg" },
        indicator: { color: "actionButton.pending.fg" },
      },
      success: {
        root: { background: "actionButton.success.bg", borderColor: "actionButton.success.border" },
        label: { color: "actionButton.success.fg" },
        indicator: { color: "actionButton.success.fg" },
      },
      error: {
        root: { background: "actionButton.error.bg", borderColor: "actionButton.error.border" },
        label: { color: "actionButton.error.fg" },
        indicator: { color: "actionButton.error.fg" },
      },
      disabled: {
        root: { background: "actionButton.disabled.bg", borderColor: "actionButton.disabled.border" },
        label: { color: "actionButton.disabled.fg" },
        indicator: { color: "actionButton.disabled.fg" },
      },
    },
  },
  defaultVariants: {
    state: "idle",
  },
});
