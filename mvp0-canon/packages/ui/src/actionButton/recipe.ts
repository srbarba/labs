// GENERATED — DO NOT EDIT. Source: spec/components/action-button.spec.json

import { defineSlotRecipe } from "@pandacss/dev";

/**
 * Only the state-varying color properties (backgroundColor/color/borderColor)
 * come from the spec's visual block. Layout (padding, radius, gap, font
 * size, cursor) is NOT modeled in the spec — the schema's VisualProperty
 * enum only covers color — so the compiler supplies a fixed generic base
 * here, parametrized by this component's own token namespace (spec.name)
 * so two components never collide on the same "<name>.gap" token. See
 * METRICS.md, Fase 4, for why layout itself isn't spec-derived.
 */
export const actionButtonRecipe = defineSlotRecipe({
  className: "actionButton-generated",
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
  },
  variants: {
    state: {
      idle: {
        root: {
          backgroundColor: "actionButton.idle.bg",
          borderColor: "actionButton.idle.border",
        },
        label: {
          color: "actionButton.idle.fg",
        },
        indicator: {
          color: "actionButton.idle.fg",
        },
      },
      pending: {
        root: {
          backgroundColor: "actionButton.pending.bg",
          borderColor: "actionButton.pending.border",
        },
        label: {
          color: "actionButton.pending.fg",
        },
        indicator: {
          color: "actionButton.pending.fg",
        },
      },
      success: {
        root: {
          backgroundColor: "actionButton.success.bg",
          borderColor: "actionButton.success.border",
        },
        label: {
          color: "actionButton.success.fg",
        },
        indicator: {
          color: "actionButton.success.fg",
        },
      },
      error: {
        root: {
          backgroundColor: "actionButton.error.bg",
          borderColor: "actionButton.error.border",
        },
        label: {
          color: "actionButton.error.fg",
        },
        indicator: {
          color: "actionButton.error.fg",
        },
      },
      retrying: {
        root: {
          backgroundColor: "actionButton.retrying.bg",
          borderColor: "actionButton.retrying.border",
        },
        label: {
          color: "actionButton.retrying.fg",
        },
        indicator: {
          color: "actionButton.retrying.fg",
        },
      },
      disabled: {
        root: {
          backgroundColor: "actionButton.disabled.bg",
          borderColor: "actionButton.disabled.border",
        },
        label: {
          color: "actionButton.disabled.fg",
        },
        indicator: {
          color: "actionButton.disabled.fg",
        },
      },
    },
  },
  defaultVariants: {
    state: "idle",
  },
});
