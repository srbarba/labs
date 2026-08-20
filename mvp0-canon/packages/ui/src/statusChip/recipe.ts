// GENERATED — DO NOT EDIT. Source: spec/components/status-chip.spec.json

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
export const statusChipRecipe = defineSlotRecipe({
  className: "statusChip-generated",
  slots: ["root", "content"],
  base: {
    root: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "statusChip.gap",
      paddingInline: "statusChip.paddingX",
      paddingBlock: "statusChip.paddingY",
      borderRadius: "statusChip",
      fontSize: "statusChip",
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
          backgroundColor: "statusChip.default.bg",
          borderColor: "statusChip.default.bg",
        },
        content: {
          color: "statusChip.default.fg",
        },
      },
      highlighted: {
        root: {
          backgroundColor: "statusChip.highlighted.bg",
          borderColor: "statusChip.highlighted.bg",
        },
        content: {
          color: "statusChip.highlighted.fg",
        },
      },
    },
  },
  defaultVariants: {
    state: "default",
  },
});
