import { writeFileSync } from "node:fs";
import type { ComponentSpec } from "../../../../spec/schema/component.schema.js";
import { GENERATED_HEADER, pascalCase } from "../naming.js";
import { shortestPathTo } from "../graph.js";

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

function defaultPropValue(type: "string" | "number" | "boolean"): string {
  switch (type) {
    case "number":
      // Deliberately huge: keeps any AFTER-delayed transition (e.g.
      // action-button's successDuration) from firing mid-test, without
      // this emitter needing to know which context field is a duration.
      return "999999";
    case "boolean":
      return "false";
    case "string":
      return '""';
  }
}

/** Constructs a JSX open/close pair that satisfies this component's Props at the type level, regardless of which context fields, contentSlots, or the legacy `children` shim it happens to declare. */
function jsxForRender(spec: ComponentSpec, componentName: string, attrs: string): string {
  const legacyLabelPart = spec.anatomy.find((p) => p.name === "label" && p.element !== undefined && p.contentSlot === undefined);
  const componentParts = spec.anatomy.filter((p) => p.component !== undefined);
  const usesChildrenForward = componentParts.some((p) => Object.values(p.slotFill ?? {}).some((f) => f.kind === "children"));
  const needsChildrenProp = legacyLabelPart !== undefined || usesChildrenForward;

  // Only override NUMBER context fields (e.g. a duration driving an
  // AFTER-delayed transition) — large enough that no timer fires mid-test.
  // Everything else is left at the spec's own declared default, same as
  // the machine would use anyway.
  const contextProps = spec.context.filter((c) => c.type === "number").map((c) => `${c.name}={${defaultPropValue(c.type)}}`);
  const requiredSlotProps = spec.anatomy
    .filter((p) => p.contentSlot?.required !== false && p.contentSlot !== undefined)
    .map((p) => `${p.name}={${JSON.stringify("content")}}`);
  const allAttrs = [attrs, ...contextProps, ...requiredSlotProps].filter(Boolean).join(" ");

  return needsChildrenProp ? `<${componentName} ${allAttrs}>Save</${componentName}>` : `<${componentName} ${allAttrs} />`;
}

export function emitTests(spec: ComponentSpec, outFilePath: string, filePath: string): void {
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
    const { container } = render(${jsxForRender(spec, componentName, "ref={ref}")});
    await waitFor(() => expect(ref.current).not.toBeNull());
${reach}
    await waitFor(() => expect(container.querySelector(${JSON.stringify(`[data-state="${state.name}"]`)})).not.toBeNull());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });`;
    })
    .join("\n\n");

  // A describe() block with zero it()s inside fails at run time ("No test
  // found in suite") — not every spec has a delayed (AFTER) transition or
  // an undeclared (state, event) pair (e.g. a small toggle where every
  // event is valid from every state), so each block is only emitted when
  // it actually has at least one test. Found while generating statusChip
  // (no AFTER transitions) and notificationButton (no invalid pairs) — the
  // action-button spec happens to have at least one of each, which is why
  // this went unnoticed until a second and third component existed.
  const blocks = [
    { title: "valid transitions", body: validTests },
    { title: "delayed transitions", body: delayedTests },
    { title: "invalid transitions are no-ops", body: invalidTests.join("\n\n") },
    { title: "accessibility per state", body: a11yTests },
  ]
    .filter((b) => b.body.trim().length > 0)
    .map((b) => `describe(${JSON.stringify(`${componentName} (generated) — ${b.title}`)}, () => {\n${b.body}\n});`)
    .join("\n\n");

  const source = `${GENERATED_HEADER(filePath)}
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

${blocks}
`;

  writeFileSync(outFilePath, source);
}
