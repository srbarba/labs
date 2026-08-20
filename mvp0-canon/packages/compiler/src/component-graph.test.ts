import { describe, expect, it } from "vitest";
import { ComponentCycleError, buildComponentGraph, findCycle, topologicalOrder } from "./component-graph.js";
import { ComponentSpec } from "../../../spec/schema/component.schema.js";

function minimalSpec(name: string, anatomy: { name: string; element?: string; component?: string }[]): ComponentSpec {
  return ComponentSpec.parse({
    name,
    version: "0.1.0",
    anatomy: anatomy.map((p) => (p.component ? { name: p.name, component: p.component } : { name: p.name, element: p.element ?? "div" })),
    states: [{ name: "s", description: "s", initial: true }],
    transitions: [],
    events: [{ name: "EV" }],
    context: [],
    visual: { s: Object.fromEntries(anatomy.filter((p) => p.element).map((p) => [p.name, { backgroundColor: "color.x.bg" }])) },
    a11y: { role: "generic", focusBehaviour: { s: "none" }, keyboard: {} },
  });
}

describe("component-graph", () => {
  it("buildComponentGraph collects deduplicated component references per spec", () => {
    const a = minimalSpec("a", [{ name: "root" }, { name: "x", component: "b" }, { name: "y", component: "b" }]);
    const b = minimalSpec("b", [{ name: "root" }]);
    const graph = buildComponentGraph(new Map([["a", a], ["b", b]]));
    expect(graph.get("a")).toEqual(["b"]);
    expect(graph.get("b")).toEqual([]);
  });

  it("findCycle returns null for an acyclic graph", () => {
    const graph = new Map([["a", ["b"]], ["b", []]]);
    expect(findCycle(graph)).toBeNull();
  });

  it("findCycle detects a direct self-reference", () => {
    const graph = new Map([["a", ["a"]]]);
    expect(findCycle(graph)).toEqual(["a", "a"]);
  });

  it("findCycle detects an indirect cycle and reports the chain", () => {
    const graph = new Map([["a", ["b"]], ["b", ["c"]], ["c", ["a"]]]);
    const cycle = findCycle(graph);
    expect(cycle).not.toBeNull();
    expect(cycle![0]).toBe(cycle![cycle!.length - 1]);
    expect(new Set(cycle)).toEqual(new Set(["a", "b", "c"]));
  });

  it("topologicalOrder puts dependencies before dependents", () => {
    const graph = new Map([["a", ["b"]], ["b", ["c"]], ["c", []]]);
    const order = topologicalOrder(graph);
    expect(order.indexOf("c")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("a"));
  });

  it("topologicalOrder throws ComponentCycleError on a cyclic graph", () => {
    const graph = new Map([["a", ["b"]], ["b", ["a"]]]);
    expect(() => topologicalOrder(graph)).toThrow(ComponentCycleError);
  });
});
