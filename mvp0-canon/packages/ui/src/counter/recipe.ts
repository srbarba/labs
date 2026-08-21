// GENERATED — DO NOT EDIT. Source: spec/components/counter.spec.json

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
export const counterRecipe = defineSlotRecipe({
  className: "counter-generated",
  slots: ["root", "decrement", "display", "increment"],
  base: {
    root: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "counter.gap",
      paddingInline: "counter.paddingX",
      paddingBlock: "counter.paddingY",
      borderRadius: "counter",
      fontSize: "counter",
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
      active: {
        root: {
          backgroundColor: "counter.active.bg",
          borderColor: "counter.active.border",
        },
        decrement: {
          backgroundColor: "counter.active.buttonBg",
          color: "counter.active.buttonFg",
        },
        display: {
          color: "counter.active.fg",
        },
        increment: {
          backgroundColor: "counter.active.buttonBg",
          color: "counter.active.buttonFg",
        },
      },
    },
  },
  defaultVariants: {
    state: "active",
  },
});
