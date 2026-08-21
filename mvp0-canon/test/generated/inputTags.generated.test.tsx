// GENERATED — DO NOT EDIT. Source: spec/components/input-tags.spec.json

// One test per declared transition (valid), one per undeclared (state, event)
// pair (invalid — proving it's a no-op is as important as proving the real
// ones work), one per AFTER-delayed transition, and one accessibility check
// per state. Regenerate with `pnpm generate` after editing the spec.
import { describe, expect, it } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { useMachine } from "@zag-js/react";
import { axe } from "vitest-axe";
import { inputTagsMachine } from "../../packages/ui/src/inputTags/machine";
import { InputTags, type InputTagsHandle } from "../../packages/ui/src/inputTags/inputTags";

describe("InputTags (generated) — valid transitions", () => {
  it("[valid #0] active --ADD_TAG--> active", async () => {
    const { result } = renderHook(() => useMachine(inputTagsMachine, { successDuration: 500 } as any));

    act(() => result.current.send({ type: "ADD_TAG" } as any));
    await waitFor(() => expect(result.current.state.matches("active" as any)).toBe(true));
  });

  it("[valid #1] active --REMOVE_TAG--> active", async () => {
    const { result } = renderHook(() => useMachine(inputTagsMachine, { successDuration: 500 } as any));

    act(() => result.current.send({ type: "REMOVE_TAG" } as any));
    await waitFor(() => expect(result.current.state.matches("active" as any)).toBe(true));
  });
});

describe("InputTags (generated) — accessibility per state", () => {
  it("[a11y] active has no obvious accessibility violations", async () => {
    const ref = { current: null as InputTagsHandle | null };
    const { container } = render(<InputTags ref={ref} />);
    await waitFor(() => expect(ref.current).not.toBeNull());

    await waitFor(() => expect(container.querySelector("[data-state=\"active\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
