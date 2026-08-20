import { useEffect, useRef } from "react";
import { useMachine } from "@zag-js/react";
import { actionButtonManual } from "styled-system/recipes";
import { actionButtonMachine } from "./machine";

export interface ActionButtonProps {
  children: string;
  onAction: () => Promise<void>;
  disabled?: boolean;
  successDuration?: number;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "",
  pending: "Working…",
  success: "Done",
  error: "Something went wrong",
  disabled: "",
};

export function ActionButton(props: ActionButtonProps) {
  const { children, onAction, disabled = false, successDuration = 1500 } = props;
  const service = useMachine(actionButtonMachine, { disabled, successDuration });
  const state = service.state.matches("idle")
    ? "idle"
    : service.state.matches("pending")
      ? "pending"
      : service.state.matches("success")
        ? "success"
        : service.state.matches("error")
          ? "error"
          : "disabled";

  const prevDisabled = useRef(disabled);
  useEffect(() => {
    if (prevDisabled.current !== disabled) {
      service.send({ type: disabled ? "DISABLE" : "ENABLE" });
      prevDisabled.current = disabled;
    }
  }, [disabled, service]);

  const classes = actionButtonManual({ state });

  const handleClick = () => {
    if (state !== "idle" && state !== "error") return;
    service.send({ type: "CLICK" });
    onAction().then(
      () => service.send({ type: "RESOLVE" }),
      () => service.send({ type: "REJECT" }),
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && state === "error") {
      service.send({ type: "DISMISS" });
    }
  };

  return (
    <button
      type="button"
      className={classes.root}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={state === "disabled"}
      aria-busy={state === "pending"}
      data-state={state}
    >
      <span className={classes.label}>{children}</span>
      <span className={classes.indicator} aria-live="polite">
        {STATUS_LABEL[state]}
      </span>
    </button>
  );
}
