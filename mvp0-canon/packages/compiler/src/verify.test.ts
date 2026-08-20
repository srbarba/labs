import { describe, expect, it } from "vitest";
import { ComponentSpec } from "../../../spec/schema/component.schema.js";
import { verifyCompleteness, VerificationError } from "./verify.js";

const validSpec: ComponentSpec = ComponentSpec.parse({
  name: "toggleSwitch",
  version: "0.1.0",
  anatomy: [{ name: "root", element: "button" }],
  states: [
    { name: "off", description: "off", initial: true },
    { name: "on", description: "on" },
  ],
  transitions: [
    { from: "off", event: "TOGGLE", to: "on" },
    { from: "on", event: "TOGGLE", to: "off" },
  ],
  events: [{ name: "TOGGLE" }],
  context: [],
  visual: {
    off: { root: { backgroundColor: "color.toggle.off.bg" } },
    on: { root: { backgroundColor: "color.toggle.on.bg" } },
  },
  a11y: {
    role: "switch",
    focusBehaviour: { off: "retain", on: "retain" },
    keyboard: { Enter: "TOGGLE" },
  },
});

function tokens() {
  return {};
}

describe("verifyCompleteness — five ways to break the spec produce five distinct, actionable messages", () => {
  it("accepts the valid fixture with no issues", () => {
    expect(() => verifyCompleteness(validSpec, tokens())).not.toThrow();
  });

  it("rule 1: a state missing visual treatment for a part fails with rule visual-coverage", () => {
    const broken: ComponentSpec = { ...validSpec, visual: { off: {}, on: validSpec.visual.on! } };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "visual-coverage" && i.path === "visual.off.root")).toBe(true);
    }
  });

  it("rule 2: a transition to a nonexistent state fails with rule transition-target", () => {
    const broken: ComponentSpec = {
      ...validSpec,
      transitions: [...validSpec.transitions, { from: "on", event: "EXPLODE", to: "ghost" }],
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "transition-target" && i.message.includes("ghost"))).toBe(true);
    }
  });

  it("rule 3: an unreachable state fails with rule reachability", () => {
    const broken: ComponentSpec = {
      ...validSpec,
      states: [...validSpec.states, { name: "orphan", description: "unreachable", initial: false, final: true }],
      visual: { ...validSpec.visual, orphan: { root: { backgroundColor: "color.toggle.off.bg" } } },
      a11y: { ...validSpec.a11y, focusBehaviour: { ...validSpec.a11y.focusBehaviour, orphan: "retain" } },
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "reachability" && i.message.includes("orphan"))).toBe(true);
    }
  });

  it("rule 4: a state with no outgoing transition and no final flag fails with rule dead-end", () => {
    const broken: ComponentSpec = {
      ...validSpec,
      states: validSpec.states.map((s) => (s.name === "on" ? { ...s, final: false } : s)),
      transitions: [validSpec.transitions[0]!], // remove on -> off, leaving "on" with no way out
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "dead-end" && i.path === "states.on")).toBe(true);
    }
  });

  it("rule 5: a keyboard mapping to an undeclared event fails with rule keyboard-event", () => {
    const broken: ComponentSpec = {
      ...validSpec,
      a11y: { ...validSpec.a11y, keyboard: { ...validSpec.a11y.keyboard, Escape: "CANCEL" } },
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "keyboard-event" && i.message.includes("CANCEL"))).toBe(true);
    }
  });

  it("rule 6: a state with no focus behaviour fails with rule focus-behaviour", () => {
    const { on: _on, ...rest } = validSpec.a11y.focusBehaviour;
    const broken: ComponentSpec = { ...validSpec, a11y: { ...validSpec.a11y, focusBehaviour: rest } };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "focus-behaviour" && i.path === "a11y.focusBehaviour.on")).toBe(true);
    }
  });

  it("all five broken specs produce genuinely different messages from each other", () => {
    const messages = new Set<string>();
    const cases: ComponentSpec[] = [
      { ...validSpec, visual: { off: {}, on: validSpec.visual.on! } },
      { ...validSpec, transitions: [...validSpec.transitions, { from: "on", event: "EXPLODE", to: "ghost" }] },
      {
        ...validSpec,
        states: [...validSpec.states, { name: "orphan", description: "x", initial: false, final: true }],
        visual: { ...validSpec.visual, orphan: { root: { backgroundColor: "color.toggle.off.bg" } } },
        a11y: { ...validSpec.a11y, focusBehaviour: { ...validSpec.a11y.focusBehaviour, orphan: "retain" } },
      },
      {
        ...validSpec,
        states: validSpec.states.map((s) => (s.name === "on" ? { ...s, final: false } : s)),
        transitions: [validSpec.transitions[0]!],
      },
      { ...validSpec, a11y: { ...validSpec.a11y, keyboard: { ...validSpec.a11y.keyboard, Escape: "CANCEL" } } },
    ];
    for (const c of cases) {
      try {
        verifyCompleteness(c, tokens());
      } catch (error) {
        messages.add((error as VerificationError).message);
      }
    }
    expect(messages.size).toBe(5);
  });
});
