// GENERATED — DO NOT EDIT. Source: spec/components/notification-button.spec.json

// One test per declared transition (valid), one per undeclared (state, event)
// pair (invalid — proving it's a no-op is as important as proving the real
// ones work), one per AFTER-delayed transition, and one accessibility check
// per state. Regenerate with `pnpm generate` after editing the spec.
import { describe, expect, it } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { useMachine } from "@zag-js/react";
import { axe } from "vitest-axe";
import { notificationButtonMachine } from "../../packages/ui/src/notificationButton/machine";
import { NotificationButton, type NotificationButtonHandle } from "../../packages/ui/src/notificationButton/notificationButton";

describe("NotificationButton (generated) — valid transitions", () => {
  it("[valid #0] default --CLICK--> active", async () => {
    const { result } = renderHook(() => useMachine(notificationButtonMachine, { successDuration: 500 } as any));

    act(() => result.current.send({ type: "CLICK" } as any));
    await waitFor(() => expect(result.current.state.matches("active" as any)).toBe(true));
  });

  it("[valid #1] active --CLICK--> default", async () => {
    const { result } = renderHook(() => useMachine(notificationButtonMachine, { successDuration: 500 } as any));
      act(() => result.current.send({ type: "CLICK" } as any));
    act(() => result.current.send({ type: "CLICK" } as any));
    await waitFor(() => expect(result.current.state.matches("default" as any)).toBe(true));
  });
});

describe("NotificationButton (generated) — accessibility per state", () => {
  it("[a11y] default has no obvious accessibility violations", async () => {
    const ref = { current: null as NotificationButtonHandle | null };
    const { container } = render(<NotificationButton ref={ref} label={"content"} />);
    await waitFor(() => expect(ref.current).not.toBeNull());

    await waitFor(() => expect(container.querySelector("[data-state=\"default\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("[a11y] active has no obvious accessibility violations", async () => {
    const ref = { current: null as NotificationButtonHandle | null };
    const { container } = render(<NotificationButton ref={ref} label={"content"} />);
    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => ref.current?.send({ type: "CLICK" } as any));
    await waitFor(() => expect(container.querySelector("[data-state=\"active\"]")).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
