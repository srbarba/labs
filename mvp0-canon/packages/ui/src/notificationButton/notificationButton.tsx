// GENERATED — DO NOT EDIT. Source: spec/components/notification-button.spec.json

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ReactNode } from "react";
import { useMachine } from "@zag-js/react";
import { notificationButton as notificationButtonRecipe } from "styled-system/recipes";
import { notificationButtonMachine } from "./machine";
import type { NotificationButtonSchema } from "./types";
import { StatusChip } from "../statusChip/statusChip";

const STATES = ["default", "active"] as const;

const KEYBOARD_MAP: Record<string, string> = {
  "Enter": "CLICK",
  " ": "CLICK",
};

export interface NotificationButtonProps {
  label: ReactNode;
  statusBadgeText?: string;
  /** Fires whenever the underlying state changes — the extension point business logic (e.g. wiring an async action) hooks into, since the spec has no way to express "call this callback and feed its result back as an event." */
  onStateChange?: (state: NotificationButtonSchema["state"]) => void;
}

export interface NotificationButtonHandle {
  send: (event: NotificationButtonSchema["event"]) => void;
}

export const NotificationButton = forwardRef<NotificationButtonHandle, NotificationButtonProps>(function NotificationButton(props, ref) {
  const { statusBadgeText, onStateChange } = props;
  const service = useMachine(notificationButtonMachine, { statusBadgeText } as Partial<NotificationButtonSchema["props"]>);

  useImperativeHandle(ref, () => ({ send: service.send }), [service]);

  const state = STATES.find((s) => service.state.matches(s))!;

  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current !== state) {
      prevState.current = state;
      onStateChange?.(state);
    }
  }, [state, onStateChange]);

  const classes = notificationButtonRecipe({ state });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const eventName = KEYBOARD_MAP[event.key];
    if (eventName) service.send({ type: eventName } as NotificationButtonSchema["event"]);
  };

  return (
    <button
      type="button"
      className={classes.root}
      role={"button"}
      data-state={state}
      onClick={() => service.send({ type: "CLICK" } as NotificationButtonSchema["event"])}
      onKeyDown={handleKeyDown}
    >
      <span className={classes.label}>{props.label}</span>
      <StatusChip content={service.context.get("statusBadgeText")} />
    </button>
  );
});
