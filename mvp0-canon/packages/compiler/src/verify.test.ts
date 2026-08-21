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

  it("rule 7: a transition action referencing an undeclared context field fails with rule transition-action-field-exists", () => {
    const broken: ComponentSpec = {
      ...validSpec,
      context: [{ name: "count", type: "number", default: 0 }],
      transitions: [...validSpec.transitions, { from: "off", event: "BUMP", to: "off", action: { field: "bogus", op: "increment" } }],
      events: [...validSpec.events, { name: "BUMP" }],
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "transition-action-field-exists" && i.message.includes("bogus"))).toBe(true);
    }
  });

  it("rule 8: a transition action targeting a non-number context field fails with rule transition-action-field-exists", () => {
    const broken: ComponentSpec = {
      ...validSpec,
      context: [{ name: "locked", type: "boolean", default: false }],
      transitions: [...validSpec.transitions, { from: "off", event: "BUMP", to: "off", action: { field: "locked", op: "increment" } }],
      events: [...validSpec.events, { name: "BUMP" }],
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "transition-action-field-exists" && i.message.includes("boolean"))).toBe(true);
    }
  });

  it("rule 9: a textBinding referencing an undeclared context field fails with rule text-binding-field-exists", () => {
    const broken: ComponentSpec = {
      ...validSpec,
      anatomy: [...validSpec.anatomy, { name: "display", element: "span", textBinding: "bogus" }],
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "text-binding-field-exists" && i.message.includes("bogus"))).toBe(true);
    }
  });

  it("rule 10: a part's onClick referencing an undeclared event fails with rule part-click-event-exists", () => {
    const broken: ComponentSpec = {
      ...validSpec,
      anatomy: [...validSpec.anatomy, { name: "extra", element: "button", onClick: "BOGUS" }],
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "part-click-event-exists" && i.message.includes("BOGUS"))).toBe(true);
    }
  });

});

// A repeated `component` part — one nested `chip` instance per element of
// `items[]`, its own event ("REMOVE") forwarded under a DIFFERENT name
// ("REMOVE_ITEM") this spec declares, carrying which position raised it.
// `chip` itself is never resolved against a registry here — that
// cross-spec check (component-reference-exists) lives in
// verify-composition.test.ts, not exercised by verifyCompleteness alone.
const chipListFixture: ComponentSpec = ComponentSpec.parse({
  name: "chipList",
  version: "0.1.0",
  anatomy: [
    { name: "root", element: "div" },
    {
      name: "chip",
      component: "chip",
      repeatOver: "items",
      slotFill: { label: { kind: "loopItem" } },
      onChildEvent: { REMOVE: "REMOVE_ITEM" },
      onChildEventPayload: { REMOVE: { index: "$index" } },
    },
    { name: "input", element: "input", submitOnEnter: { event: "ADD", payloadField: "value" } },
  ],
  states: [{ name: "active", description: "active", initial: true }],
  transitions: [
    { from: "active", event: "ADD", to: "active", action: { field: "items", op: "push", source: { kind: "payloadField", field: "value" } } },
    {
      from: "active",
      event: "REMOVE_ITEM",
      to: "active",
      action: { field: "items", op: "removeAt", source: { kind: "payloadField", field: "index" } },
    },
  ],
  events: [
    { name: "ADD", payload: { value: "string" } },
    { name: "REMOVE_ITEM", payload: { index: "number" } },
  ],
  context: [{ name: "items", type: "stringList", default: [] }],
  visual: {
    // "chip" is a component part (repeated or not) — no style-slot of its
    // own here, so it needs no visual-coverage entry.
    active: {
      root: { backgroundColor: "color.chipList.active.bg" },
      input: { color: "color.chipList.active.fg" },
    },
  },
  a11y: {
    role: "group",
    focusBehaviour: { active: "retain" },
    keyboard: {},
  },
});

describe("verifyCompleteness — collection rules (repeatOver / child-event payload / submitOnEnter / push-removeAt sources)", () => {
  it("accepts the valid chipList fixture with no issues", () => {
    expect(() => verifyCompleteness(chipListFixture, tokens())).not.toThrow();
  });

  it("repeatOver referencing an undeclared context field fails with rule repeat-over-field-exists", () => {
    const broken: ComponentSpec = {
      ...chipListFixture,
      anatomy: chipListFixture.anatomy.map((p) => (p.name === "chip" ? { ...p, repeatOver: "bogus" } : p)),
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "repeat-over-field-exists" && i.message.includes("bogus"))).toBe(true);
    }
  });

  it("repeatOver on a non-stringList field fails with rule repeat-over-field-exists", () => {
    const broken: ComponentSpec = {
      ...chipListFixture,
      context: [...chipListFixture.context, { name: "label", type: "string", default: "" }],
      anatomy: chipListFixture.anatomy.map((p) => (p.name === "chip" ? { ...p, repeatOver: "label" } : p)),
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "repeat-over-field-exists" && i.message.includes('"string"'))).toBe(true);
    }
  });

  it("onChildEventPayload naming a payload field the forwarded event doesn't declare fails with rule child-event-payload-exists", () => {
    const broken: ComponentSpec = {
      ...chipListFixture,
      anatomy: chipListFixture.anatomy.map((p) =>
        p.name === "chip" ? { ...p, onChildEventPayload: { REMOVE: { bogus: "$index" as const } } } : p,
      ),
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "child-event-payload-exists" && i.message.includes("bogus"))).toBe(true);
    }
  });

  it("onChildEventPayload feeding the wrong loop-variable type fails with rule child-event-payload-exists", () => {
    const broken: ComponentSpec = {
      ...chipListFixture,
      anatomy: chipListFixture.anatomy.map((p) =>
        p.name === "chip" ? { ...p, onChildEventPayload: { REMOVE: { index: "$item" as const } } } : p,
      ),
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "child-event-payload-exists" && i.message.includes("types don't match"))).toBe(true);
    }
  });

  it("submitOnEnter targeting an undeclared event fails with rule submit-on-enter-event-exists", () => {
    const broken: ComponentSpec = {
      ...chipListFixture,
      anatomy: chipListFixture.anatomy.map((p) => (p.name === "input" ? { ...p, submitOnEnter: { event: "BOGUS", payloadField: "value" } } : p)),
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "submit-on-enter-event-exists" && i.message.includes("BOGUS"))).toBe(true);
    }
  });

  it("submitOnEnter.payloadField naming an undeclared payload field fails with rule submit-on-enter-payload-exists", () => {
    const broken: ComponentSpec = {
      ...chipListFixture,
      anatomy: chipListFixture.anatomy.map((p) => (p.name === "input" ? { ...p, submitOnEnter: { event: "ADD", payloadField: "bogus" } } : p)),
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "submit-on-enter-payload-exists" && i.message.includes("bogus"))).toBe(true);
    }
  });

  it("a push action sourcing from an undeclared payload field fails with rule transition-action-source-exists", () => {
    const broken: ComponentSpec = {
      ...chipListFixture,
      transitions: chipListFixture.transitions.map((t) =>
        t.event === "ADD" ? { ...t, action: { field: "items", op: "push" as const, source: { kind: "payloadField" as const, field: "bogus" } } } : t,
      ),
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "transition-action-source-exists" && i.message.includes("bogus"))).toBe(true);
    }
  });

  it("a removeAt action sourcing from a wrongly-typed payload field fails with rule transition-action-source-exists", () => {
    const broken: ComponentSpec = {
      ...chipListFixture,
      events: [...chipListFixture.events.filter((e) => e.name !== "REMOVE_ITEM"), { name: "REMOVE_ITEM", payload: { index: "string" } }],
    };
    try {
      verifyCompleteness(broken, tokens());
      throw new Error("expected verifyCompleteness to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VerificationError);
      const err = error as VerificationError;
      expect(err.issues.some((i) => i.rule === "transition-action-source-exists" && i.message.includes('expects a "number"'))).toBe(true);
    }
  });
});

describe("verifyCompleteness — five ways to break the spec produce five distinct, actionable messages", () => {
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
