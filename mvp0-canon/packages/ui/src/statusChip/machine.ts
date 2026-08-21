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
        CLICK: { target: "highlighted" },
      },
    },
    highlighted: {
      on: {
        CLICK: { target: "default" },
      },
    },
  },
  watch({ prop, event }) {
    prop("onEvent")?.(event.current());
  },
  implementations: {

  },
});
