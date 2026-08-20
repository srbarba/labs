import { writeFileSync } from "node:fs";
import type { ComponentSpec } from "../../../../spec/schema/component.schema.js";
import { GENERATED_HEADER, pascalCase } from "../naming.js";
import { shortestPathTo } from "../graph.js";

const SPEC_PATH = "spec/components/action-button.spec.json";

/** Sequence of `act(() => result.current.send({...}))` lines to walk from the initial state to `state`. */
function pathToSendLines(spec: ComponentSpec, state: string): string {
  const path = shortestPathTo(spec, state) ?? [];
  return path
    .filter((t) => t.event !== "AFTER")
    .map((t) => `      act(() => result.current.send({ type: ${JSON.stringify(t.event)} } as any));`)
    .join("\n");
}

function componentPathToSendLines(spec: ComponentSpec, state: string): string {
  const path = shortestPathTo(spec, state) ?? [];
  return path
    .filter((t) => t.event !== "AFTER")
    .map((t) => `    act(() => ref.current?.send({ type: ${JSON.stringify(t.event)} } as any));`)
    .join("\n");
}

export function emitTests(spec: ComponentSpec, filePath: string): void {
  const componentName = pascalCase(spec.name);
  const initial = spec.states.find((s) => s.initial)!;

  const validTests = spec.transitions
    .filter((t) => t.event !== "AFTER")
    .map((t, i) => {
      const reach = pathToSendLines(spec, t.from);
      return `  it(${JSON.stringify(`[valid #${i}] ${t.from} --${t.event}--> ${t.to}`)}, async () => {
    const { result } = renderHook(() => useMachine(${spec.name}Machine, { successDuration: 500 } as any));
${reach}
    act(() => result.current.send({ type: ${JSON.stringify(t.event)} } as any));
    await waitFor(() => expect(result.current.state.matches(${JSON.stringify(t.to)} as any)).toBe(true));
  });`;
    })
    .join("\n\n");

  const delayed = spec.transitions.filter((t) => t.event === "AFTER");
  const delayedTests = delayed
    .map((t, i) => {
      const reach = pathToSendLines(spec, t.from);
      return `  it(${JSON.stringify(`[delayed #${i}] ${t.from} --AFTER(${t.delay})--> ${t.to}`)}, async () => {
    const { result } = renderHook(() => useMachine(${spec.name}Machine, { successDuration: 300 } as any));
${reach}
    await waitFor(() => expect(result.current.state.matches(${JSON.stringify(t.to)} as any)).toBe(true), { timeout: 2000 });
  });`;
    })
    .join("\n\n");

  const invalidTests: string[] = [];
  for (const state of spec.states) {
    const validEventsFromState = new Set(
      spec.transitions.filter((t) => t.from === state.name && t.event !== "AFTER").map((t) => t.event),
    );
    for (const event of spec.events) {
      if (validEventsFromState.has(event.name)) continue;
      const reach = pathToSendLines(spec, state.name);
      invalidTests.push(
        `  it(${JSON.stringify(`[invalid] ${event.name} in ${state.name} is a no-op`)}, async () => {
    const { result } = renderHook(() => useMachine(${spec.name}Machine, { successDuration: 5000 } as any));
${reach}
    act(() => result.current.send({ type: ${JSON.stringify(event.name)} } as any));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state.matches(${JSON.stringify(state.name)} as any)).toBe(true);
  });`,
      );
    }
  }

  const a11yTests = spec.states
    .map((state) => {
      const reach = componentPathToSendLines(spec, state.name);
      return `  it(${JSON.stringify(`[a11y] ${state.name} has no obvious accessibility violations`)}, async () => {
    const ref = { current: null as ${componentName}Handle | null };
    const { container } = render(<${componentName} ref={ref} successDuration={5000}>Save</${componentName}>);
    await waitFor(() => expect(ref.current).not.toBeNull());
${reach}
    await waitFor(() => expect(container.querySelector(${JSON.stringify(`[data-state="${state.name}"]`)})).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });`;
    })
    .join("\n\n");

  const source = `${GENERATED_HEADER(SPEC_PATH)}
// One test per declared transition (valid), one per undeclared (state, event)
// pair (invalid — proving it's a no-op is as important as proving the real
// ones work), one per AFTER-delayed transition, and one accessibility check
// per state. Regenerate with \`pnpm generate\` after editing the spec.
import { describe, expect, it } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { useMachine } from "@zag-js/react";
import { axe } from "vitest-axe";
import { ${spec.name}Machine } from "../../packages/ui/src/${spec.name}/machine";
import { ${componentName}, type ${componentName}Handle } from "../../packages/ui/src/${spec.name}/${spec.name}";

describe("${componentName} (generated) — valid transitions", () => {
${validTests}
});

describe("${componentName} (generated) — delayed transitions", () => {
${delayedTests}
});

describe("${componentName} (generated) — invalid transitions are no-ops", () => {
${invalidTests.join("\n\n")}
});

describe("${componentName} (generated) — accessibility per state", () => {
${a11yTests}
});
`;

  writeFileSync(filePath, source);
}
