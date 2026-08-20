import { describe, expect, it } from "vitest";
import { ComponentSpec } from "../../../spec/schema/component.schema.js";

const validExample = {
  name: "toggleSwitch",
  version: "0.1.0",
  anatomy: [{ name: "root", element: "button" }],
  states: [
    { name: "off", description: "off", initial: true },
    { name: "on", description: "on" },
  ],
  transitions: [{ from: "off", event: "TOGGLE", to: "on" }, { from: "on", event: "TOGGLE", to: "off" }],
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
};

describe("ComponentSpec schema", () => {
  it("accepts a well-formed example", () => {
    const result = ComponentSpec.safeParse(validExample);
    expect(result.success).toBe(true);
  });

  it("rejects a spec with no states", () => {
    const result = ComponentSpec.safeParse({ ...validExample, states: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["states"]);
    }
  });

  it("rejects a spec whose visual property isn't a known CSS-ish property", () => {
    const bad = {
      ...validExample,
      visual: { off: { root: { fontFamily: "color.toggle.off.bg" } }, on: validExample.visual.on },
    };
    const result = ComponentSpec.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects a spec with an unknown top-level field (strict mode)", () => {
    const result = ComponentSpec.safeParse({ ...validExample, colour: "blue" });
    expect(result.success).toBe(false);
  });

  it("rejects a token reference that isn't a dot-path", () => {
    const bad = {
      ...validExample,
      visual: { off: { root: { backgroundColor: "not a token ref!" } }, on: validExample.visual.on },
    };
    const result = ComponentSpec.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
