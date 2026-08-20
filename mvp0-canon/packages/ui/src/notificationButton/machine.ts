// GENERATED — DO NOT EDIT. Source: spec/components/notification-button.spec.json

import { setup } from "@zag-js/core";
import type { NotificationButtonSchema } from "./types";

const { createMachine } = setup<NotificationButtonSchema>();

export const notificationButtonMachine = createMachine({
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
        CLICK: { target: "active" },
      },
    },
    active: {
      on: {
        CLICK: { target: "default" },
      },
    },
  },
  implementations: {

  },
});
