// GENERATED — DO NOT EDIT. Source: spec/components/input-tags.spec.json

import { setup } from "@zag-js/core";
import type { InputTagsSchema } from "./types";

const { createMachine } = setup<InputTagsSchema>();

export const inputTagsMachine = createMachine({
  context({ prop, bindable }) {
    return {
      tags: bindable(() => ({ defaultValue: prop("tags") ?? [] })),
    };
  },
  initialState() {
    return "active";
  },
  states: {
    active: {
      on: {
        ADD_TAG: { target: "active", actions: ["pushTags"] },
        REMOVE_TAG: { target: "active", actions: ["removeAtTags"] },
      },
    },
  },
  watch({ prop, event }) {
    prop("onEvent")?.(event.current());
  },
  implementations: {
    actions: {
      pushTags: ({ context, event }) => context.set("tags", (prev) => [...(prev as string[]), (event as any)["value"]]),
      removeAtTags: ({ context, event }) => context.set("tags", (prev) => (prev as string[]).filter((_, i) => i !== (event as any)["index"])),
    },
  },
});
