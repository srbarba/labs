// GENERATED — DO NOT EDIT. Source: spec/components/status-chip.spec.json

// One test per declared transition (valid), one per undeclared (state, event)
// pair (invalid — proving it's a no-op is as important as proving the real
// ones work), one per AFTER-delayed transition, and one accessibility check
// per state. Regenerate with `pnpm generate` after editing the spec.
import { describe, expect, it } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { useMachine } from "@zag-js/react";
import { axe } from "vitest-axe";
import { statusChipMachine } from "../../packages/ui/src/statusChip/machine";
import { StatusChip, type StatusChipHandle } from "../../packages/ui/src/statusChip/statusChip";

describe("StatusChip (generated) — valid transitions", () => {
  it("[valid #0] default --CLICK--> highlighted", async () => {
    const { result } = renderHook(() => useMachine(statusChipMachine, { successDuration: 500 } as any));

    act(() => result.current.send({ type: "CLICK" } as any));
    await waitFor(() => expect(result.current.state.matches("highlighted" as any)).toBe(true));
  });

  it("[valid #1] highlighted --CLICK--> default", async () => {
    const { result } = renderHook(() => useMachine(statusChipMachine, { successDuration: 500 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
    act(() => result.current.send({ type: "CLICK" } as any));
    await waitFor(() => expect(result.current.state.matches("default" as any)).toBe(true));
  });
});

describe("StatusChip (generated) — accessibility per state", () => {
  it("[a11y] default has no obvious accessibility violations", async () => {
    const ref = { current: null as StatusChipHandle | null };
    const { container } = render(<StatusChip ref={ref} content={"content"} />);
    await waitFor(() => expect(ref.current).not.toBeNull());

    await waitFor(() => expect(container.querySelector("[data-state=\"default\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("[a11y] highlighted has no obvious accessibility violations", async () => {
    const ref = { current: null as StatusChipHandle | null };
    const { container } = render(<StatusChip ref={ref} content={"content"} />);
    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => ref.current?.send({ type: "CLICK" } as any));
    await waitFor(() => expect(container.querySelector("[data-state=\"highlighted\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
