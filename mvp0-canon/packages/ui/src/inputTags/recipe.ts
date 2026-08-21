// GENERATED — DO NOT EDIT. Source: spec/components/input-tags.spec.json

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
export const inputTagsRecipe = defineSlotRecipe({
  className: "inputTags-generated",
  slots: ["root", "item", "input", "itemText", "itemDeleteTrigger"],
  base: {
    root: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "inputTags.gap",
      paddingInline: "inputTags.paddingX",
      paddingBlock: "inputTags.paddingY",
      borderRadius: "inputTags",
      fontSize: "inputTags",
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
          backgroundColor: "inputTags.active.bg",
          borderColor: "inputTags.active.border",
        },
        item: {
          backgroundColor: "inputTags.active.itemBg",
          borderColor: "inputTags.active.itemBorder",
        },
        input: {
          color: "inputTags.active.fg",
          backgroundColor: "inputTags.active.bg",
        },
        itemText: {
          color: "inputTags.active.itemFg",
        },
        itemDeleteTrigger: {
          backgroundColor: "inputTags.active.itemBg",
          color: "inputTags.active.itemFg",
        },
      },
    },
  },
  defaultVariants: {
    state: "active",
  },
});
