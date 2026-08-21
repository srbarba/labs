// GENERATED — DO NOT EDIT. Source: spec/components/tag.spec.json

// One test per declared transition (valid), one per undeclared (state, event)
// pair (invalid — proving it's a no-op is as important as proving the real
// ones work), one per AFTER-delayed transition, and one accessibility check
// per state. Regenerate with `pnpm generate` after editing the spec.
import { describe, expect, it } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { useMachine } from "@zag-js/react";
import { axe } from "vitest-axe";
import { tagMachine } from "../../packages/ui/src/tag/machine";
import { Tag, type TagHandle } from "../../packages/ui/src/tag/tag";

describe("Tag (generated) — valid transitions", () => {
  it("[valid #0] active --REMOVE--> removed", async () => {
    const { result } = renderHook(() => useMachine(tagMachine, { successDuration: 500 } as any));

    act(() => result.current.send({ type: "REMOVE" } as any));
    await waitFor(() => expect(result.current.state.matches("removed" as any)).toBe(true));
  });
});

describe("Tag (generated) — invalid transitions are no-ops", () => {
  it("[invalid] REMOVE in removed is a no-op", async () => {
    const { result } = renderHook(() => useMachine(tagMachine, { successDuration: 5000 } as any));
      act(() => result.current.send({ type: "REMOVE" } as any));
    act(() => result.current.send({ type: "REMOVE" } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches("removed" as any)).toBe(true);
  });
});

describe("Tag (generated) — accessibility per state", () => {
  it("[a11y] active has no obvious accessibility violations", async () => {
    const ref = { current: null as TagHandle | null };
    const { container } = render(<Tag ref={ref} label={"content"} deleteTrigger={"content"} />);
    await waitFor(() => expect(ref.current).not.toBeNull());

    await waitFor(() => expect(container.querySelector("[data-state=\"active\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("[a11y] removed has no obvious accessibility violations", async () => {
    const ref = { current: null as TagHandle | null };
    const { container } = render(<Tag ref={ref} label={"content"} deleteTrigger={"content"} />);
    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => ref.current?.send({ type: "REMOVE" } as any));
    await waitFor(() => expect(container.querySelector("[data-state=\"removed\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
