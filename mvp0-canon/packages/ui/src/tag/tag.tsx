// GENERATED — DO NOT EDIT. Source: spec/components/tag.spec.json

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ReactNode } from "react";
import { useMachine } from "@zag-js/react";
import { tag as tagRecipe } from "styled-system/recipes";
import { tagMachine } from "./machine";
import type { TagSchema } from "./types";

const STATES = ["active", "removed"] as const;

const KEYBOARD_MAP: Record<string, string> = {

};

export interface TagProps {
  label: ReactNode;
  deleteTrigger: ReactNode;
  /** Fires whenever the underlying state changes — the extension point business logic (e.g. wiring an async action) hooks into, since the spec has no way to express "call this callback and feed its result back as an event." */
  onStateChange?: (state: TagSchema["state"]) => void;
  /** Fires with the raw event object whenever this component's machine processes ANY event — the general escape hatch a composing parent's onChildEvent wiring uses to react to this component's own events without relying on DOM bubbling. */
  onEvent?: (event: { type: string } & Record<string, any>) => void;
}

export interface TagHandle {
  send: (event: TagSchema["event"]) => void;
}

export const Tag = forwardRef<TagHandle, TagProps>(function Tag(props, ref) {
  const { onStateChange, onEvent } = props;
  const service = useMachine(tagMachine, { onEvent } as Partial<TagSchema["props"]>);

  useImperativeHandle(ref, () => ({ send: service.send }), [service]);

  const state = STATES.find((s) => service.state.matches(s))!;

  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current !== state) {
      prevState.current = state;
      onStateChange?.(state);
    }
  }, [state, onStateChange]);

  const classes = tagRecipe({ state });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const eventName = KEYBOARD_MAP[event.key];
    if (eventName) service.send({ type: eventName } as TagSchema["event"]);
  };

  return (
    <span
      className={classes.root}
      role={"group"}
      data-state={state}
      onKeyDown={handleKeyDown}
    >
      <span className={classes.label}>{props.label}</span>
      <button type="button" aria-label="Remove tag" className={classes.deleteTrigger} onClick={(event) => {
        event.stopPropagation();
        service.send({ type: "REMOVE" } as TagSchema["event"]);
      }}>{props.deleteTrigger}</button>
    </span>
  );
});
