// GENERATED — DO NOT EDIT. Source: spec/components/action-button.spec.json

// One test per declared transition (valid), one per undeclared (state, event)
// pair (invalid — proving it's a no-op is as important as proving the real
// ones work), one per AFTER-delayed transition, and one accessibility check
// per state. Regenerate with `pnpm generate` after editing the spec.
import { describe, expect, it } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { useMachine } from "@zag-js/react";
import { axe } from "vitest-axe";
import { actionButtonMachine } from "../../packages/ui/src/actionButton/machine";
import { ActionButton, type ActionButtonHandle } from "../../packages/ui/src/actionButton/actionButton";

describe("ActionButton (generated) — valid transitions", () => {
  it("[valid #0] idle --CLICK--> pending", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 500 } as any));

    act(() => result.current.send({ type: "CLICK" } as any));
    await waitFor(() => expect(result.current.state.matches("pending" as any)).toBe(true));
  });

  it("[valid #1] pending --RESOLVE--> success", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 500 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
    act(() => result.current.send({ type: "RESOLVE" } as any));
    await waitFor(() => expect(result.current.state.matches("success" as any)).toBe(true));
  });

  it("[valid #2] pending --REJECT--> error", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 500 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
    act(() => result.current.send({ type: "REJECT" } as any));
    await waitFor(() => expect(result.current.state.matches("error" as any)).toBe(true));
  });

  it("[valid #3] error --CLICK--> pending", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 500 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "REJECT" } as any));
    act(() => result.current.send({ type: "CLICK" } as any));
    await waitFor(() => expect(result.current.state.matches("pending" as any)).toBe(true));
  });

  it("[valid #4] error --DISMISS--> idle", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 500 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "REJECT" } as any));
    act(() => result.current.send({ type: "DISMISS" } as any));
    await waitFor(() => expect(result.current.state.matches("idle" as any)).toBe(true));
  });

  it("[valid #5] idle --DISABLE--> disabled", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 500 } as any));

    act(() => result.current.send({ type: "DISABLE" } as any));
    await waitFor(() => expect(result.current.state.matches("disabled" as any)).toBe(true));
  });

  it("[valid #6] disabled --ENABLE--> idle", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 500 } as any));
      act(() => result.current.send({ type: "DISABLE" } as any));
    act(() => result.current.send({ type: "ENABLE" } as any));
    await waitFor(() => expect(result.current.state.matches("idle" as any)).toBe(true));
  });
});

describe("ActionButton (generated) — delayed transitions", () => {
  it("[delayed #0] success --AFTER(successDuration)--> idle", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 300 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "RESOLVE" } as any));
    await waitFor(() => expect(result.current.state.matches("idle" as any)).toBe(true), { timeout: 2000 });
  });
});

describe("ActionButton (generated) — invalid transitions are no-ops", () => {
  it("[invalid] RESOLVE in idle is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));

    act(() => result.current.send({ type: "RESOLVE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("idle" as any)).toBe(true);
  });

  it("[invalid] REJECT in idle is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));

    act(() => result.current.send({ type: "REJECT" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("idle" as any)).toBe(true);
  });

  it("[invalid] DISMISS in idle is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));

    act(() => result.current.send({ type: "DISMISS" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("idle" as any)).toBe(true);
  });

  it("[invalid] ENABLE in idle is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));

    act(() => result.current.send({ type: "ENABLE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("idle" as any)).toBe(true);
  });

  it("[invalid] CLICK in pending is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
    act(() => result.current.send({ type: "CLICK" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("pending" as any)).toBe(true);
  });

  it("[invalid] DISMISS in pending is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
    act(() => result.current.send({ type: "DISMISS" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("pending" as any)).toBe(true);
  });

  it("[invalid] DISABLE in pending is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
    act(() => result.current.send({ type: "DISABLE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("pending" as any)).toBe(true);
  });

  it("[invalid] ENABLE in pending is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
    act(() => result.current.send({ type: "ENABLE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("pending" as any)).toBe(true);
  });

  it("[invalid] CLICK in success is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "RESOLVE" } as any));
    act(() => result.current.send({ type: "CLICK" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("success" as any)).toBe(true);
  });

  it("[invalid] RESOLVE in success is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "RESOLVE" } as any));
    act(() => result.current.send({ type: "RESOLVE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("success" as any)).toBe(true);
  });

  it("[invalid] REJECT in success is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "RESOLVE" } as any));
    act(() => result.current.send({ type: "REJECT" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("success" as any)).toBe(true);
  });

  it("[invalid] DISMISS in success is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "RESOLVE" } as any));
    act(() => result.current.send({ type: "DISMISS" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("success" as any)).toBe(true);
  });

  it("[invalid] DISABLE in success is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "RESOLVE" } as any));
    act(() => result.current.send({ type: "DISABLE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("success" as any)).toBe(true);
  });

  it("[invalid] ENABLE in success is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "RESOLVE" } as any));
    act(() => result.current.send({ type: "ENABLE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("success" as any)).toBe(true);
  });

  it("[invalid] RESOLVE in error is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "REJECT" } as any));
    act(() => result.current.send({ type: "RESOLVE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("error" as any)).toBe(true);
  });

  it("[invalid] REJECT in error is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "REJECT" } as any));
    act(() => result.current.send({ type: "REJECT" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("error" as any)).toBe(true);
  });

  it("[invalid] DISABLE in error is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "REJECT" } as any));
    act(() => result.current.send({ type: "DISABLE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("error" as any)).toBe(true);
  });

  it("[invalid] ENABLE in error is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
      act(() => result.current.send({ type: "REJECT" } as any));
    act(() => result.current.send({ type: "ENABLE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("error" as any)).toBe(true);
  });

  it("[invalid] CLICK in disabled is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "DISABLE" } as any));
    act(() => result.current.send({ type: "CLICK" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("disabled" as any)).toBe(true);
  });

  it("[invalid] RESOLVE in disabled is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "DISABLE" } as any));
    act(() => result.current.send({ type: "RESOLVE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("disabled" as any)).toBe(true);
  });

  it("[invalid] REJECT in disabled is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "DISABLE" } as any));
    act(() => result.current.send({ type: "REJECT" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("disabled" as any)).toBe(true);
  });

  it("[invalid] DISMISS in disabled is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "DISABLE" } as any));
    act(() => result.current.send({ type: "DISMISS" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("disabled" as any)).toBe(true);
  });

  it("[invalid] DISABLE in disabled is a no-op", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "DISABLE" } as any));
    act(() => result.current.send({ type: "DISABLE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("disabled" as any)).toBe(true);
  });
});

describe("ActionButton (generated) — accessibility per state", () => {
  it("[a11y] idle has no obvious accessibility violations", async () => {
    const ref = { current: null as ActionButtonHandle | null };
    const { container } = render(<ActionButton ref={ref} successDuration={5000}>Save</ActionButton>);
    await waitFor(() => expect(ref.current).not.toBeNull());

    await waitFor(() => expect(container.querySelector("[data-state=\"idle\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("[a11y] pending has no obvious accessibility violations", async () => {
    const ref = { current: null as ActionButtonHandle | null };
    const { container } = render(<ActionButton ref={ref} successDuration={5000}>Save</ActionButton>);
    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => ref.current?.send({ type: "CLICK" } as any));
    await waitFor(() => expect(container.querySelector("[data-state=\"pending\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("[a11y] success has no obvious accessibility violations", async () => {
    const ref = { current: null as ActionButtonHandle | null };
    const { container } = render(<ActionButton ref={ref} successDuration={5000}>Save</ActionButton>);
    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => ref.current?.send({ type: "CLICK" } as any));
    act(() => ref.current?.send({ type: "RESOLVE" } as any));
    await waitFor(() => expect(container.querySelector("[data-state=\"success\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("[a11y] error has no obvious accessibility violations", async () => {
    const ref = { current: null as ActionButtonHandle | null };
    const { container } = render(<ActionButton ref={ref} successDuration={5000}>Save</ActionButton>);
    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => ref.current?.send({ type: "CLICK" } as any));
    act(() => ref.current?.send({ type: "REJECT" } as any));
    await waitFor(() => expect(container.querySelector("[data-state=\"error\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("[a11y] disabled has no obvious accessibility violations", async () => {
    const ref = { current: null as ActionButtonHandle | null };
    const { container } = render(<ActionButton ref={ref} successDuration={5000}>Save</ActionButton>);
    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => ref.current?.send({ type: "DISABLE" } as any));
    await waitFor(() => expect(container.querySelector("[data-state=\"disabled\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
