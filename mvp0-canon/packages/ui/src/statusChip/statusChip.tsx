// GENERATED — DO NOT EDIT. Source: spec/components/status-chip.spec.json

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ReactNode } from "react";
import { useMachine } from "@zag-js/react";
import { statusChip as statusChipRecipe } from "styled-system/recipes";
import { statusChipMachine } from "./machine";
import type { StatusChipSchema } from "./types";

const STATES = ["default", "highlighted"] as const;

const KEYBOARD_MAP: Record<string, string> = {

};

export interface StatusChipProps {
  content: ReactNode;
  /** Fires whenever the underlying state changes — the extension point business logic (e.g. wiring an async action) hooks into, since the spec has no way to express "call this callback and feed its result back as an event." */
  onStateChange?: (state: StatusChipSchema["state"]) => void;
}

export interface StatusChipHandle {
  send: (event: StatusChipSchema["event"]) => void;
}

export const StatusChip = forwardRef<StatusChipHandle, StatusChipProps>(function StatusChip(props, ref) {
  const { onStateChange } = props;
  const service = useMachine(statusChipMachine, {} as Partial<StatusChipSchema["props"]>);

  useImperativeHandle(ref, () => ({ send: service.send }), [service]);

  const state = STATES.find((s) => service.state.matches(s))!;

  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current !== state) {
      prevState.current = state;
      onStateChange?.(state);
    }
  }, [state, onStateChange]);

  const classes = statusChipRecipe({ state });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const eventName = KEYBOARD_MAP[event.key];
    if (eventName) service.send({ type: eventName } as StatusChipSchema["event"]);
  };

  return (
    <span
      className={classes.root}
      role={"status"}
      data-state={state}
      onKeyDown={handleKeyDown}
    >
      <span className={classes.content}>{props.content}</span>
    </span>
  );
});
