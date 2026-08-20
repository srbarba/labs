// GENERATED — DO NOT EDIT. Source: spec/components/notification-button.spec.json

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
export const notificationButtonRecipe = defineSlotRecipe({
  className: "notificationButton-generated",
  slots: ["root", "label"],
  base: {
    root: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "notificationButton.gap",
      paddingInline: "notificationButton.paddingX",
      paddingBlock: "notificationButton.paddingY",
      borderRadius: "notificationButton",
      fontSize: "notificationButton",
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
      default: {
        root: {
          backgroundColor: "notificationButton.default.bg",
          borderColor: "notificationButton.default.border",
        },
        label: {
          color: "notificationButton.default.fg",
        },
      },
      active: {
        root: {
          backgroundColor: "notificationButton.active.bg",
          borderColor: "notificationButton.active.border",
        },
        label: {
          color: "notificationButton.active.fg",
        },
      },
    },
  },
  defaultVariants: {
    state: "default",
  },
});
