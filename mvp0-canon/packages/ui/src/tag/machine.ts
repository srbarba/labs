// GENERATED — DO NOT EDIT. Source: spec/components/tag.spec.json

import { setup } from "@zag-js/core";
import type { TagSchema } from "./types";

const { createMachine } = setup<TagSchema>();

export const tagMachine = createMachine({
  context({ prop, bindable }) {
    return {

    };
  },
  initialState() {
    return "active";
  },
  states: {
    active: {
      on: {
        REMOVE: { target: "removed" },
      },
    },
    removed: {
    },
  },
  watch({ prop, event }) {
    prop("onEvent")?.(event.current());
  },
  implementations: {

  },
});
