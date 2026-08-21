// GENERATED — DO NOT EDIT. Source: spec/components/counter.spec.json

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ReactNode } from "react";
import { useMachine } from "@zag-js/react";
import { counter as counterRecipe } from "styled-system/recipes";
import { counterMachine } from "./machine";
import type { CounterSchema } from "./types";

const STATES = ["active"] as const;

const KEYBOARD_MAP: Record<string, string> = {

};

export interface CounterProps {
  decrement: ReactNode;
  increment: ReactNode;
  count?: number;
  /** Fires whenever the underlying state changes — the extension point business logic (e.g. wiring an async action) hooks into, since the spec has no way to express "call this callback and feed its result back as an event." */
  onStateChange?: (state: CounterSchema["state"]) => void;
  /** Fires with the raw event object whenever this component's machine processes ANY event — the general escape hatch a composing parent's onChildEvent wiring uses to react to this component's own events without relying on DOM bubbling. */
  onEvent?: (event: { type: string } & Record<string, any>) => void;
}

export interface CounterHandle {
  send: (event: CounterSchema["event"]) => void;
}

export const Counter = forwardRef<CounterHandle, CounterProps>(function Counter(props, ref) {
  const { count, onStateChange, onEvent } = props;
  const service = useMachine(counterMachine, { count, onEvent } as Partial<CounterSchema["props"]>);

  useImperativeHandle(ref, () => ({ send: service.send }), [service]);

  const state = STATES.find((s) => service.state.matches(s))!;

  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current !== state) {
      prevState.current = state;
      onStateChange?.(state);
    }
  }, [state, onStateChange]);

  const classes = counterRecipe({ state });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const eventName = KEYBOARD_MAP[event.key];
    if (eventName) service.send({ type: eventName } as CounterSchema["event"]);
  };

  return (
    <div
      className={classes.root}
      role={"group"}
      data-state={state}
      onKeyDown={handleKeyDown}
    >
      <button type="button" className={classes.decrement} onClick={(event) => {
        event.stopPropagation();
        service.send({ type: "DECREMENT" } as CounterSchema["event"]);
      }}>{props.decrement}</button>
      <span className={classes.display} aria-live="polite">{String(service.context.get("count"))}</span>
      <button type="button" className={classes.increment} onClick={(event) => {
        event.stopPropagation();
        service.send({ type: "INCREMENT" } as CounterSchema["event"]);
      }}>{props.increment}</button>
    </div>
  );
});
