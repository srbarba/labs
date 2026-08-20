import { setup } from "@zag-js/core";
import type { ActionButtonSchema } from "./types";

const { createMachine } = setup<ActionButtonSchema>();

/**
 * Hand-written control machine. Mirrors the transition table a team would
 * design on a whiteboard before any tooling exists: `pending` deliberately
 * ignores CLICK — that rule lives only here unless someone remembers to
 * write it down elsewhere too.
 */
export const actionButtonMachine = createMachine({
  context({ prop, bindable }) {
    return {
      disabled: bindable(() => ({ defaultValue: prop("disabled") ?? false })),
      successDuration: bindable(() => ({ defaultValue: prop("successDuration") ?? 1500 })),
    };
  },
  initialState({ prop }) {
    return prop("disabled") ? "disabled" : "idle";
  },
  states: {
    idle: {
      on: {
        CLICK: { target: "pending", guard: "isEnabled" },
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
      isEnabled: ({ context }) => !context.get("disabled"),
    },
    effects: {
      successTimeout: ({ context, send }) => {
        const id = setTimeout(() => send({ type: "SUCCESS_TIMEOUT" }), context.get("successDuration"));
        return () => clearTimeout(id);
      },
    },
  },
});
