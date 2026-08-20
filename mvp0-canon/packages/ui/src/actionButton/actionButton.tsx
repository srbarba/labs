// GENERATED — DO NOT EDIT. Source: spec/components/action-button.spec.json

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useMachine } from "@zag-js/react";
import { actionButton as actionButtonRecipe } from "styled-system/recipes";
import { actionButtonMachine } from "./machine";
import type { ActionButtonSchema } from "./types";

const STATES = ["idle", "pending", "success", "error", "retrying", "disabled"] as const;

const KEYBOARD_MAP: Record<string, string> = {
  "Enter": "CLICK",
  " ": "CLICK",
  "Escape": "DISMISS",
};

export interface ActionButtonProps {
  children: string;
  disabled?: boolean;
  successDuration?: number;
  /** Fires whenever the underlying state changes — the extension point business logic (e.g. wiring an async action) hooks into, since the spec has no way to express "call this callback and feed its result back as an event." */
  onStateChange?: (state: ActionButtonSchema["state"]) => void;
}

export interface ActionButtonHandle {
  send: (event: ActionButtonSchema["event"]) => void;
}

export const ActionButton = forwardRef<ActionButtonHandle, ActionButtonProps>(function ActionButton(props, ref) {
  const { children, disabled, successDuration, onStateChange } = props;
  const service = useMachine(actionButtonMachine, { disabled, successDuration } as Partial<ActionButtonSchema["props"]>);

  useImperativeHandle(ref, () => ({ send: service.send }), [service]);

  const state = STATES.find((s) => service.state.matches(s))!;

  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current !== state) {
      prevState.current = state;
      onStateChange?.(state);
    }
  }, [state, onStateChange]);

  const classes = actionButtonRecipe({ state });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const eventName = KEYBOARD_MAP[event.key];
    if (eventName) service.send({ type: eventName } as ActionButtonSchema["event"]);
  };

  return (
    <button
      type="button"
      className={classes.root}
      role={"button"}
      data-state={state}
      aria-busy={state === "pending"}
      disabled={state === "disabled"}
      onClick={() => service.send({ type: "CLICK" } as ActionButtonSchema["event"])}
      onKeyDown={handleKeyDown}
    >
      <span className={classes.label}>{children}</span>
      <span className={classes.indicator} aria-live="polite"></span>
    </button>
  );
});
