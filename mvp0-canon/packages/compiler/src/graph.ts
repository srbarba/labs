import type { ComponentSpec, TransitionDef } from "../../../spec/schema/component.schema.js";

/** States reachable from the initial state via some chain of transitions (BFS). */
export function reachableStates(spec: ComponentSpec): Set<string> {
  const initial = spec.states.find((s) => s.initial);
  if (!initial) return new Set();

  const adjacency = new Map<string, TransitionDef[]>();
  for (const t of spec.transitions) {
    if (!adjacency.has(t.from)) adjacency.set(t.from, []);
    adjacency.get(t.from)!.push(t);
  }

  const visited = new Set<string>([initial.name]);
  const queue = [initial.name];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const t of adjacency.get(current) ?? []) {
      if (!visited.has(t.to)) {
        visited.add(t.to);
        queue.push(t.to);
      }
    }
  }
  return visited;
}

/** Shortest chain of transitions from the initial state to `target` (BFS, excludes AFTER-marked transitions — those fire on their own, a story can't trigger them). */
export function shortestPathTo(spec: ComponentSpec, target: string): TransitionDef[] | null {
  const initial = spec.states.find((s) => s.initial);
  if (!initial) return null;
  if (initial.name === target) return [];

  const adjacency = new Map<string, TransitionDef[]>();
  for (const t of spec.transitions) {
    if (t.event === "AFTER") continue;
    if (!adjacency.has(t.from)) adjacency.set(t.from, []);
    adjacency.get(t.from)!.push(t);
  }

  const cameFrom = new Map<string, TransitionDef>();
  const visited = new Set<string>([initial.name]);
  const queue = [initial.name];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const t of adjacency.get(current) ?? []) {
      if (visited.has(t.to)) continue;
      visited.add(t.to);
      cameFrom.set(t.to, t);
      if (t.to === target) {
        const path: TransitionDef[] = [];
        let node = target;
        while (cameFrom.has(node)) {
          const edge = cameFrom.get(node)!;
          path.unshift(edge);
          node = edge.from;
        }
        return path;
      }
      queue.push(t.to);
    }
  }
  return null;
}
