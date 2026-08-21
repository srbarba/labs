// GENERATED — DO NOT EDIT. Source: spec/components/tag.spec.json

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
export const tagRecipe = defineSlotRecipe({
  className: "tag-generated",
  slots: ["root", "label", "deleteTrigger"],
  base: {
    root: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "tag.gap",
      paddingInline: "tag.paddingX",
      paddingBlock: "tag.paddingY",
      borderRadius: "tag",
      fontSize: "tag",
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
          backgroundColor: "tag.active.bg",
          borderColor: "tag.active.border",
        },
        label: {
          color: "tag.active.fg",
        },
        deleteTrigger: {
          backgroundColor: "tag.active.bg",
          color: "tag.active.fg",
        },
      },
      removed: {
        root: {
          backgroundColor: "tag.active.bg",
        },
        label: {
          color: "tag.active.fg",
        },
        deleteTrigger: {
          backgroundColor: "tag.active.bg",
          color: "tag.active.fg",
        },
      },
    },
  },
  defaultVariants: {
    state: "active",
  },
});
