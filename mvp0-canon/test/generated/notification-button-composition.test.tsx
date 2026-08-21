// Deliberately outside packages/ui/ — see action-button-machine.behavior.test.ts
// for why. Hand-written, not generated: it exercises two composition/slot
// behaviors that the auto-generated state-machine-table tests never touch,
// because they're about how NotificationButton nests StatusChip, not about
// its own transition table.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("clicking the nested StatusChip bubbles up through the DOM and fires the button's own CLICK — no event-wiring mechanism needed, ordinary React event bubbling does it because StatusChip renders as a plain descendant, not a portal", async () => {
    const user = userEvent.setup();
    render(<NotificationButton label="Save" />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-state", "default");

    await user.click(screen.getByText("New"));
    expect(button).toHaveAttribute("data-state", "active");

    await user.click(screen.getByText("New"));
    expect(button).toHaveAttribute("data-state", "default");
  });
});
