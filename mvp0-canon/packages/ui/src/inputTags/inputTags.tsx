// GENERATED — DO NOT EDIT. Source: spec/components/input-tags.spec.json

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useMachine } from "@zag-js/react";
import { inputTags as inputTagsRecipe } from "styled-system/recipes";
import { inputTagsMachine } from "./machine";
import type { InputTagsSchema } from "./types";
import { Tag } from "../tag/tag";

const FORWARDED_CHILD_EVENTS = new WeakSet<object>();

const STATES = ["active"] as const;

const KEYBOARD_MAP: Record<string, string> = {

};

export interface InputTagsProps {
  tags?: string[];
  /** Fires whenever the underlying state changes — the extension point business logic (e.g. wiring an async action) hooks into, since the spec has no way to express "call this callback and feed its result back as an event." */
  onStateChange?: (state: InputTagsSchema["state"]) => void;
  /** Fires with the raw event object whenever this component's machine processes ANY event — the general escape hatch a composing parent's onChildEvent wiring uses to react to this component's own events without relying on DOM bubbling. */
  onEvent?: (event: { type: string } & Record<string, any>) => void;
}

export interface InputTagsHandle {
  send: (event: InputTagsSchema["event"]) => void;
}

export const InputTags = forwardRef<InputTagsHandle, InputTagsProps>(function InputTags(props, ref) {
  const { tags, onStateChange, onEvent } = props;
  const service = useMachine(inputTagsMachine, { tags, onEvent } as Partial<InputTagsSchema["props"]>);

  useImperativeHandle(ref, () => ({ send: service.send }), [service]);

  const state = STATES.find((s) => service.state.matches(s))!;

  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current !== state) {
      prevState.current = state;
      onStateChange?.(state);
    }
  }, [state, onStateChange]);

  const classes = inputTagsRecipe({ state });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const eventName = KEYBOARD_MAP[event.key];
    if (eventName) service.send({ type: eventName } as InputTagsSchema["event"]);
  };

  return (
    <div
      className={classes.root}
      role={"group"}
      data-state={state}
      onKeyDown={handleKeyDown}
    >
      {(service.context.get("tags") as string[]).map((item: string, index: number) => (
        <Tag key={index} label={item} deleteTrigger={"×"} onEvent={(event) => {
          if (event.type === "REMOVE" && !FORWARDED_CHILD_EVENTS.has(event)) {
            FORWARDED_CHILD_EVENTS.add(event);
            setTimeout(() => service.send({ type: "REMOVE_TAG", index: index } as InputTagsSchema["event"]), 0);
          }
        }} />
      ))}
      <input
        className={classes.input}
        aria-label="Add tag"
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const value = event.currentTarget.value.trim();
          if (!value) return;
          service.send({ type: "ADD_TAG", value: value } as InputTagsSchema["event"]);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
});
