// Deliberately outside packages/ui/ — see action-button-machine.behavior.test.ts
// for why. Hand-written, not generated: it exercises composition/slot/event
// behaviors that the auto-generated state-machine-table tests never touch,
// because they're about how NotificationButton nests StatusChip, not about
// its own transition table.
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationButton } from "../../packages/ui/src/notificationButton/notificationButton";

describe("NotificationButton (generated) — composition with the nested StatusChip", () => {
  it("a contextRef slotFill reflects the spec's own default when the prop isn't passed", () => {
    render(<NotificationButton label="Save" />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("a contextRef slotFill reflects an explicitly passed prop, overriding the default", () => {
    render(<NotificationButton label="Save" statusBadgeText="3 unread" />);
    expect(screen.getByText("3 unread")).toBeInTheDocument();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("clicking the nested StatusChip highlights the badge itself AND, via onChildEvent, forwards CLICK up to the button — NOT via DOM bubbling, which is deliberately cut off by the badge's own stopPropagation()", async () => {
    const user = userEvent.setup();
    render(<NotificationButton label="Save" />);
    const button = screen.getByRole("button");
    const badge = screen.getByText("New").closest('[role="status"]')!;
    expect(button).toHaveAttribute("data-state", "default");
    expect(badge).toHaveAttribute("data-state", "default");

    await user.click(screen.getByText("New"));
    // The badge reacts locally to its own CLICK...
    await waitFor(() => expect(badge).toHaveAttribute("data-state", "highlighted"));
    // ...and separately, notificationButton's own machine receives a
    // forwarded CLICK (onChildEvent: {"CLICK": "CLICK"}), one macrotask
    // later (see emit/component.ts for why it's deferred).
    await waitFor(() => expect(button).toHaveAttribute("data-state", "active"));

    await user.click(screen.getByText("New"));
    await waitFor(() => expect(badge).toHaveAttribute("data-state", "default"));
    await waitFor(() => expect(button).toHaveAttribute("data-state", "default"));
  });

  it("clicking the badge does NOT also fire the button's click via DOM bubbling — stopPropagation makes onChildEvent the single authoritative channel, avoiding a double-CLICK send that would cancel itself out", async () => {
    const user = userEvent.setup();
    const domClicks: string[] = [];
    render(
      <div onClick={() => domClicks.push("bubbled-to-ancestor")}>
        <NotificationButton label="Save" />
      </div>,
    );
    await user.click(screen.getByText("New"));
    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("data-state", "active"));
    expect(domClicks).toEqual([]);
  });
});
