// GENERATED — DO NOT EDIT. Source: spec/components/counter.spec.json

import { setup } from "@zag-js/core";
import type { CounterSchema } from "./types";

const { createMachine } = setup<CounterSchema>();

export const counterMachine = createMachine({
  context({ prop, bindable }) {
    return {
      count: bindable(() => ({ defaultValue: prop("count") ?? 0 })),
    };
  },
  initialState() {
    return "active";
  },
  states: {
    active: {
      on: {
        INCREMENT: { target: "active", actions: ["incrementCount"] },
        DECREMENT: { target: "active", actions: ["decrementCount"] },
      },
    },
  },
  watch({ prop, event }) {
    prop("onEvent")?.(event.current());
  },
  implementations: {
    actions: {
      incrementCount: ({ context }) => context.set("count", (prev) => prev + 1),
      decrementCount: ({ context }) => context.set("count", (prev) => prev - 1),
    },
  },
});
