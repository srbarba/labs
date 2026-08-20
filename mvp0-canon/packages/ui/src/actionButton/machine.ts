// GENERATED — DO NOT EDIT. Source: spec/components/action-button.spec.json

import { setup } from "@zag-js/core";
import type { ActionButtonSchema } from "./types";

const { createMachine } = setup<ActionButtonSchema>();

export const actionButtonMachine = createMachine({
  context({ prop, bindable }) {
    return {
      disabled: bindable(() => ({ defaultValue: prop("disabled") ?? false })),
      successDuration: bindable(() => ({ defaultValue: prop("successDuration") ?? 1500 })),
    };
  },
  initialState() {
    return "idle";
  },
  states: {
    idle: {
      on: {
        CLICK: { target: "pending", guard: "notDisabled" },
        DISABLE: { target: "disabled" },
      },
    },
    pending: {
      on: {
        RESOLVE: { target: "success" },
        REJECT: { target: "error" },
      },
    },
    success: {
      effects: ["successTimeout"],
      on: {
        SUCCESS_TIMEOUT: { target: "idle" },
      },
    },
    error: {
      on: {
        CLICK: { target: "pending" },
        DISMISS: { target: "idle" },
      },
    },
    disabled: {
      on: {
        ENABLE: { target: "idle" },
      },
    },
  },
  implementations: {
    guards: {
      notDisabled: ({ context }) => !context.get("disabled"),
    },
    effects: {
      successTimeout: ({ context, send }) => {
        const id = setTimeout(() => send({ type: "SUCCESS_TIMEOUT" }), context.get("successDuration"));
        return () => clearTimeout(id);
      },
    },
  },
});
