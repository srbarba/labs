// Deliberately outside packages/ui/ — see action-button-machine.behavior.test.ts
// for why. Hand-written, not generated: emit/tests.ts's per-transition tests
// only assert `state.matches("active")`, which is trivially true before AND
// after ADD_TAG/REMOVE_TAG — InputTags has exactly one state, so the
// generator (whose only vocabulary is "which named state are we in") has no
// way to express "and the array in context actually gained/lost the right
// element." This file is the real assertion the generated suite structurally
// cannot make — and the first one to exercise repeatOver over a NESTED
// COMPONENT (N separately-composed Tag instances, one per array element,
// not an inline template): InputTags never renders a delete button itself.
// Each Tag fires its OWN event ("REMOVE"); InputTags catches it via
// onChildEvent and forwards its OWN, differently-named event ("REMOVE_TAG")
// carrying which array position raised it — real cross-component,
// custom-named event composition, not a single spec's local state machine.
// That forward is deferred one macrotask (see emit/component.ts's
// onEventForwardingProp for why), so every assertion that follows a click
// on a delete trigger needs waitFor — same pattern already established by
// test/generated/notification-button-composition.test.tsx for onChildEvent.
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputTags } from "../../packages/ui/src/inputTags/inputTags";

describe("InputTags (generated) — composing N Tag instances, not an inline template", () => {
  it("starts with no tags when no prop is passed", () => {
    render(<InputTags />);
    expect(screen.queryAllByRole("button", { name: "Remove tag" })).toHaveLength(0);
  });

  it("typing a value and pressing Enter adds a tag (rendered by a real Tag instance) and clears the input", async () => {
    const user = userEvent.setup();
    render(<InputTags />);
    const input = screen.getByRole("textbox", { name: "Add tag" });
    await user.type(input, "react{Enter}");
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("pressing Enter on an empty or whitespace-only input adds nothing (trim + non-empty is a fixed compiler convention)", async () => {
    const user = userEvent.setup();
    render(<InputTags />);
    const input = screen.getByRole("textbox", { name: "Add tag" });
    await user.type(input, "   {Enter}");
    expect(screen.queryAllByRole("button", { name: "Remove tag" })).toHaveLength(0);
  });

  it("adding several tags renders one independent Tag instance per element, in order", async () => {
    const user = userEvent.setup();
    render(<InputTags />);
    const input = screen.getByRole("textbox", { name: "Add tag" });
    await user.type(input, "react{Enter}");
    await user.type(input, "vue{Enter}");
    await user.type(input, "svelte{Enter}");
    expect(screen.getAllByRole("button", { name: "Remove tag" })).toHaveLength(3);
    expect(["react", "vue", "svelte"].every((tag) => screen.getByText(tag))).toBe(true);
  });

  it("clicking the MIDDLE Tag's own delete trigger fires Tag's REMOVE, forwarded as InputTags' own REMOVE_TAG with the right index, dropping exactly that element", async () => {
    const user = userEvent.setup();
    render(<InputTags tags={["react", "vue", "svelte"]} />);
    const deleteButtons = screen.getAllByRole("button", { name: "Remove tag" });
    await user.click(deleteButtons[1]!);
    await waitFor(() => expect(screen.queryByText("vue")).not.toBeInTheDocument());
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("svelte")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Remove tag" })).toHaveLength(2);
  });

  it("removing tags one at a time, then adding a new one, never replays a stale forward against the wrong position (the WeakSet-guarded re-render hazard, see emit/component.ts's onEventForwardingProp)", async () => {
    const user = userEvent.setup();
    render(<InputTags tags={["a", "b", "c", "d"]} />);
    // Removing "b" forces InputTags to re-render, recreating every
    // surviving Tag's onEvent closure — the exact trigger for the replay
    // hazard the WeakSet guards against.
    await user.click(screen.getAllByRole("button", { name: "Remove tag" })[1]!);
    await waitFor(() => expect(screen.queryByText("b")).not.toBeInTheDocument());
    expect(["a", "c", "d"].every((tag) => screen.getByText(tag))).toBe(true);

    // A second, unrelated mutation (typing + Enter) is itself another
    // parent re-render — if a stale event were still queued for replay,
    // this would silently drop another tag.
    const input = screen.getByRole("textbox", { name: "Add tag" });
    await user.type(input, "e{Enter}");
    await waitFor(() => expect(screen.getByText("e")).toBeInTheDocument());
    expect(["a", "c", "d", "e"].every((tag) => screen.getByText(tag))).toBe(true);
    expect(screen.getAllByRole("button", { name: "Remove tag" })).toHaveLength(4);

    // Remove the new first position ("a") to confirm indices keep working
    // correctly after the array has already shifted once.
    await user.click(screen.getAllByRole("button", { name: "Remove tag" })[0]!);
    await waitFor(() => expect(screen.queryByText("a")).not.toBeInTheDocument());
    expect(["c", "d", "e"].every((tag) => screen.getByText(tag))).toBe(true);
    expect(screen.getAllByRole("button", { name: "Remove tag" })).toHaveLength(3);
  });

  it("tags start from an explicitly passed construction prop, not always empty", () => {
    render(<InputTags tags={["seed"]} />);
    expect(screen.getByText("seed")).toBeInTheDocument();
  });

  it("clicking a Tag's delete trigger does not also fire an ancestor's own click handling (isolated by stopPropagation, same as the onChildEvent forward it triggers)", async () => {
    const user = userEvent.setup();
    const rootClicks: string[] = [];
    render(
      <div onClick={() => rootClicks.push("bubbled-to-ancestor")}>
        <InputTags tags={["react"]} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Remove tag" }));
    await waitFor(() => expect(screen.queryByText("react")).not.toBeInTheDocument());
    expect(rootClicks).toEqual([]);
  });
});
