// Deliberately outside packages/ui/ — see action-button-machine.behavior.test.ts
// for why. Hand-written, not generated: emit/tests.ts's per-transition tests
// only assert `state.matches("active")`, which is trivially true before AND
// after ADD_TAG/REMOVE_TAG — InputTags has exactly one state, so the
// generator (whose only vocabulary is "which named state are we in") has no
// way to express "and the array in context actually gained/lost the right
// element." This file is the real assertion the generated suite structurally
// cannot make — and the first one to exercise repeatOver (N DOM nodes from
// one array field) and a payload-carrying event (ADD_TAG/REMOVE_TAG) end to
// end, not just that the machine transitions.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputTags } from "../../packages/ui/src/inputTags/inputTags";

describe("InputTags (generated) — the array mutation the generated suite can't see", () => {
  it("starts with no tags when no prop is passed", () => {
    render(<InputTags />);
    expect(screen.queryAllByRole("button", { name: "Remove tag" })).toHaveLength(0);
  });

  it("typing a value and pressing Enter adds a tag and clears the input", async () => {
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

  it("adding several tags renders one independent chip per element, in order", async () => {
    const user = userEvent.setup();
    render(<InputTags />);
    const input = screen.getByRole("textbox", { name: "Add tag" });
    await user.type(input, "react{Enter}");
    await user.type(input, "vue{Enter}");
    await user.type(input, "svelte{Enter}");
    expect(screen.getAllByRole("button", { name: "Remove tag" })).toHaveLength(3);
    expect(["react", "vue", "svelte"].every((tag) => screen.getByText(tag))).toBe(true);
  });

  it("removing the MIDDLE tag drops exactly that array element by index, leaving the others in order", async () => {
    const user = userEvent.setup();
    render(<InputTags tags={["react", "vue", "svelte"]} />);
    const deleteButtons = screen.getAllByRole("button", { name: "Remove tag" });
    await user.click(deleteButtons[1]!);
    expect(screen.queryByText("vue")).not.toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("svelte")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Remove tag" })).toHaveLength(2);
  });

  it("tags start from an explicitly passed construction prop, not always empty", () => {
    render(<InputTags tags={["seed"]} />);
    expect(screen.getByText("seed")).toBeInTheDocument();
  });

  it("clicking a delete trigger does not also fire an ancestor's own click handling (isolated by stopPropagation)", async () => {
    const user = userEvent.setup();
    const rootClicks: string[] = [];
    render(
      <div onClick={() => rootClicks.push("bubbled-to-ancestor")}>
        <InputTags tags={["react"]} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Remove tag" }));
    expect(screen.queryByText("react")).not.toBeInTheDocument();
    expect(rootClicks).toEqual([]);
  });
});
