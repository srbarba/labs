// GENERATED — DO NOT EDIT. Source: spec/components/status-chip.spec.json

import { setup } from "@zag-js/core";
import type { StatusChipSchema } from "./types";

const { createMachine } = setup<StatusChipSchema>();

export const statusChipMachine = createMachine({
  context({ prop, bindable }) {
    return {

    };
  },
  initialState() {
    return "default";
  },
  states: {
    default: {
      on: {
        HIGHLIGHT: { target: "highlighted" },
      },
    },
    highlighted: {
      on: {
        RESET: { target: "default" },
      },
    },
  },
  implementations: {

  },
});
