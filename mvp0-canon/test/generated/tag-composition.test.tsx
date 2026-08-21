// Deliberately outside packages/ui/ — see action-button-machine.behavior.test.ts
// for why. Tag is meant to be usable on its own, not only nested inside
// InputTags — this proves it: standalone, its delete trigger fires its own
// "REMOVE" event (observable via onEvent, the same machine-level hook a
// composing parent's onChildEvent wiring listens on), with no knowledge of
// index, array position, or any other component.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tag } from "../../packages/ui/src/tag/tag";

describe("Tag (generated) — standalone, composable independently of InputTags", () => {
  it("renders its label and delete trigger content from the caller's own slotFill/props", () => {
    render(<Tag label="react" deleteTrigger="x" />);
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove tag" })).toHaveTextContent("x");
  });

  it("clicking the delete trigger fires Tag's own REMOVE event, observable via onEvent", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    render(<Tag label="react" deleteTrigger="x" onEvent={onEvent} />);
    await user.click(screen.getByRole("button", { name: "Remove tag" }));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "REMOVE" }));
  });

  it("clicking the delete trigger does not also fire an ancestor's own click handling (isolated by stopPropagation)", async () => {
    const user = userEvent.setup();
    const rootClicks: string[] = [];
    render(
      <div onClick={() => rootClicks.push("bubbled-to-ancestor")}>
        <Tag label="react" deleteTrigger="x" />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Remove tag" }));
    expect(rootClicks).toEqual([]);
  });
});
