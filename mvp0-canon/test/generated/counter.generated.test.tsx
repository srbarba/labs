// GENERATED — DO NOT EDIT. Source: spec/components/counter.spec.json

// One test per declared transition (valid), one per undeclared (state, event)
// pair (invalid — proving it's a no-op is as important as proving the real
// ones work), one per AFTER-delayed transition, and one accessibility check
// per state. Regenerate with `pnpm generate` after editing the spec.
import { describe, expect, it } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { useMachine } from "@zag-js/react";
import { axe } from "vitest-axe";
import { counterMachine } from "../../packages/ui/src/counter/machine";
import { Counter, type CounterHandle } from "../../packages/ui/src/counter/counter";

describe("Counter (generated) — valid transitions", () => {
  it("[valid #0] active --INCREMENT--> active", async () => {
    const { result } = renderHook(() => useMachine(counterMachine, { successDuration: 500 } as any));

    act(() => result.current.send({ type: "INCREMENT" } as any));
    await waitFor(() => expect(result.current.state.matches("active" as any)).toBe(true));
  });

  it("[valid #1] active --DECREMENT--> active", async () => {
    const { result } = renderHook(() => useMachine(counterMachine, { successDuration: 500 } as any));

    act(() => result.current.send({ type: "DECREMENT" } as any));
    await waitFor(() => expect(result.current.state.matches("active" as any)).toBe(true));
  });
});

describe("Counter (generated) — accessibility per state", () => {
  it("[a11y] active has no obvious accessibility violations", async () => {
    const ref = { current: null as CounterHandle | null };
    const { container } = render(<Counter ref={ref} count={999999} decrement={"content"} increment={"content"} />);
    await waitFor(() => expect(ref.current).not.toBeNull());

    await waitFor(() => expect(container.querySelector("[data-state=\"active\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
