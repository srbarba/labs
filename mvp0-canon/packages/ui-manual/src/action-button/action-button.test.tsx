import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ActionButton } from "./action-button";

describe("ActionButton (manual control)", () => {
  it("reaches idle, pending, success and back to idle", async () => {
    const user = userEvent.setup();
    render(
      <ActionButton onAction={() => Promise.resolve()} successDuration={200}>
        Save
      </ActionButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-state", "idle");

    await user.click(button);
    expect(["pending", "success"]).toContain(button.getAttribute("data-state"));

    await waitFor(() => expect(button).toHaveAttribute("data-state", "success"));
    await waitFor(() => expect(button).toHaveAttribute("data-state", "idle"), { timeout: 2000 });
  });

  it("reaches error and returns to idle via DISMISS", async () => {
    const user = userEvent.setup();
    render(
      <ActionButton onAction={() => Promise.reject(new Error("boom"))} successDuration={200}>
        Save
      </ActionButton>,
    );
    const button = screen.getByRole("button");
    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute("data-state", "error"));

    button.focus();
    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("data-state", "idle");
  });

  it("reaches disabled and back to idle when the prop toggles", async () => {
    const { rerender } = render(
      <ActionButton onAction={() => Promise.resolve()} disabled>
        Save
      </ActionButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-state", "disabled");
    expect(button).toBeDisabled();

    rerender(
      <ActionButton onAction={() => Promise.resolve()} disabled={false}>
        Save
      </ActionButton>,
    );
    await waitFor(() => expect(button).toHaveAttribute("data-state", "idle"));
  });

  it("ignores CLICK while pending", async () => {
    const onAction = vi.fn(() => new Promise<void>(() => {}));
    const user = userEvent.setup();
    render(<ActionButton onAction={onAction}>Save</ActionButton>);
    const button = screen.getByRole("button");
    await user.click(button);
    await user.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("has no obvious accessibility violations in the idle state", async () => {
    const { container } = render(<ActionButton onAction={() => Promise.resolve()}>Save</ActionButton>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
