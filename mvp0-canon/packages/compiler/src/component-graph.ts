import type { ComponentSpec } from "../../../spec/schema/component.schema.js";

/**
 * The *component*-reference graph, built from every spec's
 * `anatomy[].component` links across the whole registry — distinct from
 * `graph.ts`, which is the *state* graph inside a single spec.
 */

export class ComponentCycleError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`circular component reference: ${cycle.join(" -> ")}`);
    this.name = "ComponentCycleError";
  }
}

/** Adjacency list: component name -> the (deduplicated) component names its anatomy references. */
export function buildComponentGraph(specs: Map<string, ComponentSpec>): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const [name, spec] of specs) {
    const refs = spec.anatomy
      .filter((p): p is typeof p & { component: string } => p.component !== undefined)
      .map((p) => p.component);
    adjacency.set(name, [...new Set(refs)]);
  }
  return adjacency;
}

/** DFS with white/gray/black coloring. Returns the exact cycle chain (e.g. ["a","b","a"]) or null if acyclic. */
export function findCycle(adjacency: Map<string, string[]>): string[] | null {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const name of adjacency.keys()) color.set(name, WHITE);

  const stack: string[] = [];

  function visit(node: string): string[] | null {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      const nextColor = color.get(next);
      if (nextColor === GRAY) {
        const cycleStart = stack.indexOf(next);
        return [...stack.slice(cycleStart), next];
      }
      if (nextColor === undefined || nextColor === WHITE) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(node, BLACK);
    return null;
  }

  for (const name of adjacency.keys()) {
    if (color.get(name) === WHITE) {
      const found = visit(name);
      if (found) return found;
    }
  }
  return null;
}

/** Leaf-first order (a component's dependencies always come before it). Throws ComponentCycleError if the graph has a cycle. */
export function topologicalOrder(adjacency: Map<string, string[]>): string[] {
  const cycle = findCycle(adjacency);
  if (cycle) throw new ComponentCycleError(cycle);

  const visited = new Set<string>();
  const order: string[] = [];

  function visit(node: string): void {
    if (visited.has(node)) return;
    visited.add(node);
    for (const next of adjacency.get(node) ?? []) {
      visit(next);
    }
    order.push(node);
  }

  for (const name of adjacency.keys()) visit(name);
  return order;
}
