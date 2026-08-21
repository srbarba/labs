import { describe, expect, it } from "vitest";
import { ComponentSpec } from "../../../spec/schema/component.schema.js";
import { collectCompositionIssues, verifyComposition } from "./verify-composition.js";
import { VerificationError } from "./verify.js";
import type { DiscoveredSpec } from "./discover.js";

function spec(overrides: Record<string, unknown>): ComponentSpec {
  return ComponentSpec.parse({
    name: "x",
    version: "0.1.0",
    anatomy: [{ name: "root", element: "div" }],
    states: [{ name: "s", description: "s", initial: true }],
    transitions: [],
    events: [{ name: "EV" }],
    context: [],
    visual: {},
    a11y: { role: "generic", focusBehaviour: { s: "none" }, keyboard: {} },
    ...overrides,
  });
}

function registry(specs: ComponentSpec[]): Map<string, DiscoveredSpec> {
  return new Map(specs.map((s) => [s.name, { spec: s, filePath: `spec/components/${s.name}.spec.json` }]));
}

const badge = spec({
  name: "badge",
  anatomy: [
    { name: "root", element: "span" },
    { name: "content", element: "span", contentSlot: { required: true } },
  ],
});

describe("verify-composition — a valid nested pair passes cleanly", () => {
  it("accepts a component part whose slotFill covers every required contentSlot", () => {
    const widget = spec({
      name: "widget",
      anatomy: [
        { name: "root", element: "div" },
        { name: "badgePart", component: "badge", slotFill: { content: { kind: "text", value: "New" } } },
      ],
    });
    const issues = collectCompositionIssues(registry([badge, widget]));
    expect(issues).toEqual([]);
  });

  it("accepts the same component referenced twice in one spec (independent instances)", () => {
    const widget = spec({
      name: "widget",
      anatomy: [
        { name: "root", element: "div" },
        { name: "badgeA", component: "badge", slotFill: { content: { kind: "text", value: "A" } } },
        { name: "badgeB", component: "badge", slotFill: { content: { kind: "text", value: "B" } } },
      ],
    });
    const issues = collectCompositionIssues(registry([badge, widget]));
    expect(issues).toEqual([]);
  });
});

describe("verify-composition — eight ways to break composition produce eight distinct, actionable rules", () => {
  it("rule: component-reference-exists — referencing an undeclared component", () => {
    const widget = spec({
      name: "widget",
      anatomy: [{ name: "root", element: "div" }, { name: "ghost", component: "doesNotExist" }],
    });
    const issues = collectCompositionIssues(registry([widget]));
    expect(issues.some((i) => i.rule === "component-reference-exists")).toBe(true);
  });

  it("rule: circular-component-reference — a two-component cycle is detected with its chain", () => {
    const a = spec({ name: "a", anatomy: [{ name: "root", element: "div" }, { name: "x", component: "b" }] });
    const b = spec({ name: "b", anatomy: [{ name: "root", element: "div" }, { name: "x", component: "a" }] });
    const issues = collectCompositionIssues(registry([a, b]));
    const issue = issues.find((i) => i.rule === "circular-component-reference");
    expect(issue).toBeDefined();
    expect(issue!.message).toContain("a -> b -> a");
  });

  it("rule: root-part-native — root cannot itself be a component reference", () => {
    const widget = spec({ name: "widget", anatomy: [{ name: "root", component: "badge" }] });
    const issues = collectCompositionIssues(registry([badge, widget]));
    expect(issues.some((i) => i.rule === "root-part-native")).toBe(true);
  });

  it("rule: slot-fill-unknown-key — filling a key the referenced component never declared as a contentSlot", () => {
    const widget = spec({
      name: "widget",
      anatomy: [
        { name: "root", element: "div" },
        { name: "badgePart", component: "badge", slotFill: { nope: { kind: "text", value: "x" } } },
      ],
    });
    const issues = collectCompositionIssues(registry([badge, widget]));
    expect(issues.some((i) => i.rule === "slot-fill-unknown-key")).toBe(true);
  });

  it("rule: slot-fill-missing-required — a required contentSlot left unfilled", () => {
    const widget = spec({
      name: "widget",
      anatomy: [{ name: "root", element: "div" }, { name: "badgePart", component: "badge" }],
    });
    const issues = collectCompositionIssues(registry([badge, widget]));
    expect(issues.some((i) => i.rule === "slot-fill-missing-required")).toBe(true);
  });

  it("rule: slot-fill-context-ref-exists — contextRef to a field the referencing spec never declared", () => {
    const widget = spec({
      name: "widget",
      anatomy: [
        { name: "root", element: "div" },
        { name: "badgePart", component: "badge", slotFill: { content: { kind: "contextRef", field: "missingField" } } },
      ],
      context: [],
    });
    const issues = collectCompositionIssues(registry([badge, widget]));
    expect(issues.some((i) => i.rule === "slot-fill-context-ref-exists")).toBe(true);
  });

  it("rule: child-event-unknown-key — onChildEvent key isn't an event the referenced component declares", () => {
    const widget = spec({
      name: "widget",
      anatomy: [
        { name: "root", element: "div" },
        { name: "badgePart", component: "badge", onChildEvent: { NOPE: "EV" } },
      ],
    });
    const issues = collectCompositionIssues(registry([badge, widget]));
    expect(issues.some((i) => i.rule === "child-event-unknown-key")).toBe(true);
  });

  it("rule: child-event-target-unknown — onChildEvent value isn't an event the referencing spec declares itself", () => {
    const widget = spec({
      name: "widget",
      anatomy: [
        { name: "root", element: "div" },
        { name: "badgePart", component: "badge", onChildEvent: { EV: "NOPE" } },
      ],
    });
    const issues = collectCompositionIssues(registry([badge, widget]));
    expect(issues.some((i) => i.rule === "child-event-target-unknown")).toBe(true);
  });

  it("all eight rules produce distinct, non-empty messages across the broken fixtures", () => {
    // Note: some fixtures legitimately trigger more than one rule at once
    // (e.g. an unfilled required slot on a root-part-native violation) —
    // that's the same "surface everything in one run" philosophy verify.ts
    // already uses, not a bug. This test only checks that each of the eight
    // rule ids is reachable and that no two rules ever produce the same
    // message text.
    const messagesByRule = new Map<string, Set<string>>();
    const cases: ComponentSpec[][] = [
      [spec({ name: "w1", anatomy: [{ name: "root", element: "div" }, { name: "g", component: "nope" }] })],
      [
        spec({ name: "w2a", anatomy: [{ name: "root", element: "div" }, { name: "x", component: "w2b" }] }),
        spec({ name: "w2b", anatomy: [{ name: "root", element: "div" }, { name: "x", component: "w2a" }] }),
      ],
      [badge, spec({ name: "w3", anatomy: [{ name: "root", component: "badge" }] })],
      [badge, spec({ name: "w4", anatomy: [{ name: "root", element: "div" }, { name: "b", component: "badge", slotFill: { nope: { kind: "text", value: "x" } } }] })],
      [badge, spec({ name: "w5", anatomy: [{ name: "root", element: "div" }, { name: "b", component: "badge" }] })],
      [badge, spec({ name: "w6", anatomy: [{ name: "root", element: "div" }, { name: "b", component: "badge", slotFill: { content: { kind: "contextRef", field: "z" } } }] })],
      [badge, spec({ name: "w7", anatomy: [{ name: "root", element: "div" }, { name: "b", component: "badge", onChildEvent: { NOPE: "EV" } }] })],
      [badge, spec({ name: "w8", anatomy: [{ name: "root", element: "div" }, { name: "b", component: "badge", onChildEvent: { EV: "NOPE" } }] })],
    ];
    const allMessages = new Set<string>();
    for (const specs of cases) {
      for (const issue of collectCompositionIssues(registry(specs))) {
        if (!messagesByRule.has(issue.rule)) messagesByRule.set(issue.rule, new Set());
        messagesByRule.get(issue.rule)!.add(issue.message);
        allMessages.add(issue.message);
      }
    }
    expect(new Set(messagesByRule.keys())).toEqual(
      new Set([
        "component-reference-exists",
        "circular-component-reference",
        "root-part-native",
        "slot-fill-unknown-key",
        "slot-fill-missing-required",
        "slot-fill-context-ref-exists",
        "child-event-unknown-key",
        "child-event-target-unknown",
      ]),
    );
    const totalMessages = [...messagesByRule.values()].reduce((n, s) => n + s.size, 0);
    expect(allMessages.size).toBe(totalMessages); // no two rules ever produced the exact same message text
  });

  it("verifyComposition throws VerificationError when any rule is violated", () => {
    const widget = spec({ name: "widget", anatomy: [{ name: "root", element: "div" }, { name: "g", component: "nope" }] });
    expect(() => verifyComposition(registry([widget]))).toThrow(VerificationError);
  });
});
