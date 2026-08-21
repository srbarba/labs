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

describe("ComponentSpec schema — anatomy composition (element vs. component, contentSlot, slotFill)", () => {
  it("accepts a part with only element (unchanged legacy shape)", () => {
    const result = ComponentSpec.safeParse(validExample);
    expect(result.success).toBe(true);
  });

  it("accepts a part with only component", () => {
    const spec = {
      ...validExample,
      anatomy: [
        ...validExample.anatomy,
        { name: "icon", component: "badge" },
      ],
    };
    const result = ComponentSpec.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it("rejects a part with both element and component", () => {
    const spec = {
      ...validExample,
      anatomy: [{ name: "root", element: "button", component: "badge" }],
    };
    const result = ComponentSpec.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it("rejects a part with neither element nor component", () => {
    const spec = {
      ...validExample,
      anatomy: [{ name: "root" }],
    };
    const result = ComponentSpec.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it("rejects slotFill on a part that has element instead of component", () => {
    const spec = {
      ...validExample,
      anatomy: [{ name: "root", element: "button", slotFill: { content: { kind: "text", value: "x" } } }],
    };
    const result = ComponentSpec.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it("rejects contentSlot on a part that has component instead of element", () => {
    const spec = {
      ...validExample,
      anatomy: [{ name: "root", element: "button" }, { name: "icon", component: "badge", contentSlot: {} }],
    };
    const result = ComponentSpec.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it("accepts a contentSlot part with an explicit required flag", () => {
    const spec = {
      ...validExample,
      anatomy: [...validExample.anatomy, { name: "label", element: "span", contentSlot: { required: false } }],
    };
    const result = ComponentSpec.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it("accepts all three slotFill kinds (text, children, contextRef)", () => {
    const spec = {
      ...validExample,
      context: [{ name: "count", type: "number", default: 0 }],
      anatomy: [
        ...validExample.anatomy,
        {
          name: "badgeA",
          component: "badge",
          slotFill: { content: { kind: "text", value: "New" } },
        },
        {
          name: "badgeB",
          component: "badge",
          slotFill: { content: { kind: "children" } },
        },
        {
          name: "badgeC",
          component: "badge",
          slotFill: { content: { kind: "contextRef", field: "count" } },
        },
      ],
    };
    const result = ComponentSpec.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it("accepts a component part with onChildEvent", () => {
    const spec = {
      ...validExample,
      anatomy: [
        ...validExample.anatomy,
        { name: "badge", component: "statusChip", onChildEvent: { CLICK: "TOGGLE" } },
      ],
    };
    const result = ComponentSpec.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it("rejects onChildEvent on a part that has element instead of component", () => {
    const spec = {
      ...validExample,
      anatomy: [{ name: "root", element: "button", onChildEvent: { CLICK: "TOGGLE" } }],
    };
    const result = ComponentSpec.safeParse(spec);
    expect(result.success).toBe(false);
  });
});
