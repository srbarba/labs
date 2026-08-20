// Deliberately outside packages/ui/ — see action-button-machine.behavior.test.ts
// for why. This test also demonstrates the one thing the generated component
// cannot do on its own: wire an async action to CLICK/RESOLVE/REJECT. The
// spec has no way to express that relationship (see METRICS.md, Fase 4), so
// this small hook is hand-written glue living outside the generated tree —
// exactly the kind of escape hatch the plan expects to surface.
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ActionButton, type ActionButtonHandle } from "../../packages/ui/src/actionButton/actionButton";

function AsyncActionButton(props: { onAction: () => Promise<void>; successDuration?: number; disabled?: boolean }) {
  const ref = useRef<ActionButtonHandle>(null);

  return (
    <ActionButton
      ref={ref}
      disabled={props.disabled}
      successDuration={props.successDuration}
      onStateChange={(state) => {
        if (state === "pending") {
          props.onAction().then(
            () => ref.current?.send({ type: "RESOLVE" }),
            () => ref.current?.send({ type: "REJECT" }),
          );
        }
      }}
    >
      Save
    </ActionButton>
  );
}

describe("ActionButton (generated)", () => {
  it("reaches idle, pending, success and back to idle", async () => {
    const user = userEvent.setup();
    render(<AsyncActionButton onAction={() => Promise.resolve()} successDuration={200} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-state", "idle");

    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute("data-state", "success"));
    await waitFor(() => expect(button).toHaveAttribute("data-state", "idle"), { timeout: 2000 });
  });

  it("reaches error and returns to idle via DISMISS (Escape)", async () => {
    const user = userEvent.setup();
    render(<AsyncActionButton onAction={() => Promise.reject(new Error("boom"))} successDuration={200} />);
    const button = screen.getByRole("button");
    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute("data-state", "error"));

    button.focus();
    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("data-state", "idle");
  });

  it("ignores CLICK while pending", async () => {
    let calls = 0;
    const user = userEvent.setup();
    render(
      <AsyncActionButton
        onAction={() => {
          calls += 1;
          return new Promise<void>(() => {});
        }}
      />,
    );
    const button = screen.getByRole("button");
    await user.click(button);
    await user.click(button);
    expect(calls).toBe(1);
  });

  it("blocks CLICK when constructed with disabled: true", async () => {
    // Unlike the manual control, the generated component does not route
    // disabled:true to a native `disabled` attribute at construction — the
    // spec's guard only blocks the state transition, it doesn't reach into
    // anatomy.root's HTML attributes. See METRICS.md, Fase 4.
    const user = userEvent.setup();
    let calls = 0;
    render(
      <AsyncActionButton
        onAction={() => {
          calls += 1;
          return Promise.resolve();
        }}
        disabled
      />,
    );
    const button = screen.getByRole("button");
    await user.click(button);
    expect(calls).toBe(0);
    expect(button).toHaveAttribute("data-state", "idle");
  });

  it("has no obvious accessibility violations in the idle state", async () => {
    const { container } = render(<AsyncActionButton onAction={() => Promise.resolve()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
