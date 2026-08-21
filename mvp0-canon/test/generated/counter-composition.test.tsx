// Deliberately outside packages/ui/ — see action-button-machine.behavior.test.ts
// for why. Hand-written, not generated: emit/tests.ts's per-transition tests
// only assert `state.matches("active")`, which is trivially true before AND
// after an INCREMENT/DECREMENT — Counter has exactly one state, so the
// generator (whose only vocabulary is "which named state are we in") has no
// way to express "and the context field actually changed." This file is the
// real assertion the generated suite structurally cannot make.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Counter } from "../../packages/ui/src/counter/counter";

describe("Counter (generated) — the context mutation the generated suite can't see", () => {
  it("starts at the spec's declared default (0) when no count prop is passed", () => {
    render(<Counter decrement="−" increment="+" />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("clicking + increments the displayed count", async () => {
    const user = userEvent.setup();
    render(<Counter decrement="−" increment="+" />);
    await user.click(screen.getByText("+"));
    expect(screen.getByText("1")).toBeInTheDocument();
    await user.click(screen.getByText("+"));
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("clicking − decrements the displayed count, below zero with no clamping (not modeled in the spec)", async () => {
    const user = userEvent.setup();
    render(<Counter decrement="−" increment="+" />);
    await user.click(screen.getByText("−"));
    expect(screen.getByText("-1")).toBeInTheDocument();
    await user.click(screen.getByText("−"));
    expect(screen.getByText("-2")).toBeInTheDocument();
  });

  it("count starts from an explicitly passed construction prop, not always 0", async () => {
    const user = userEvent.setup();
    render(<Counter decrement="−" increment="+" count={10} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    await user.click(screen.getByText("+"));
    expect(screen.getByText("11")).toBeInTheDocument();
  });

  it("clicking a button does not also fire the root's own click handling (each part sends its own event, isolated by stopPropagation)", async () => {
    const user = userEvent.setup();
    const rootClicks: string[] = [];
    render(
      <div onClick={() => rootClicks.push("bubbled-to-ancestor")}>
        <Counter decrement="−" increment="+" />
      </div>,
    );
    await user.click(screen.getByText("+"));
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(rootClicks).toEqual([]);
  });
});
