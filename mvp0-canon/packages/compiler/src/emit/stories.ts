import { writeFileSync } from "node:fs";
import type { ComponentSpec, TransitionDef } from "../../../../spec/schema/component.schema.js";
import { GENERATED_HEADER, pascalCase } from "../naming.js";
import { reachableStates, shortestPathTo } from "../graph.js";

type Step =
  | { kind: "click" }
  | { kind: "key"; key: string }
  | { kind: "resolve" }
  | { kind: "reject" }
  | { kind: "unsupported"; event: string };

function classify(spec: ComponentSpec, t: TransitionDef): Step {
  const keyEntry = Object.entries(spec.a11y.keyboard).find(([, ev]) => ev === t.event);
  if (keyEntry) return { kind: "key", key: keyEntry[0]! };
  if (t.event === "CLICK") return { kind: "click" };
  if (t.event === "RESOLVE") return { kind: "resolve" };
  if (t.event === "REJECT") return { kind: "reject" };
  return { kind: "unsupported", event: t.event };
}

function stepToPlaySource(step: Step): string {
  switch (step.kind) {
    case "click":
      return `    await userEvent.click(button);`;
    case "key":
      return `    button.focus();\n    await userEvent.keyboard(${JSON.stringify(keyToUserEvent(step.key))});`;
    case "resolve":
    case "reject":
      // Handled by the wrapper's onAction outcome, not a DOM action.
      return `    // (event fires when the pending onAction settles — see the wrapper's resolveNext flag)`;
    case "unsupported":
      return `    // "${step.event}" has no DOM affordance in a11y.keyboard — cannot be driven from a play function.`;
  }
}

function keyToUserEvent(key: string): string {
  if (key === " ") return " ";
  return `{${key}}`;
}

/**
 * Whether this spec has the specific async "click -> pending -> settle via
 * RESOLVE/REJECT" shape action-button was built around (Fase 4-5) — the
 * only shape this emitter knows how to wire a demo settle callback for.
 * Anything else (e.g. statusChip, notificationButton) gets a plain
 * construction-props wrapper with no simulated async outcome.
 */
function hasAsyncPendingPattern(spec: ComponentSpec): boolean {
  return (
    spec.states.some((s) => s.name === "pending") &&
    spec.events.some((e) => e.name === "RESOLVE") &&
    spec.events.some((e) => e.name === "REJECT")
  );
}

/** The even narrower exact shape (idle/success/error + Escape-to-idle) the hardcoded FullGraphWalk story was written for — a generalized graph-walk generator is future work, not this MVP's scope. */
function hasFullGraphWalkShape(spec: ComponentSpec): boolean {
  return (
    hasAsyncPendingPattern(spec) &&
    spec.states.some((s) => s.name === "idle" && s.initial) &&
    spec.states.some((s) => s.name === "success") &&
    spec.states.some((s) => s.name === "error") &&
    spec.a11y.keyboard["Escape"] !== undefined
  );
}

function needsChildrenProp(spec: ComponentSpec): boolean {
  const legacyLabelPart = spec.anatomy.find((p) => p.name === "label" && p.element !== undefined && p.contentSlot === undefined);
  const componentParts = spec.anatomy.filter((p) => p.component !== undefined);
  const usesChildrenForward = componentParts.some((p) => Object.values(p.slotFill ?? {}).some((f) => f.kind === "children"));
  return legacyLabelPart !== undefined || usesChildrenForward;
}

/** Context fields referenced as the `delay` of an AFTER transition get a demo-friendly default (short enough for an interaction test, overridable via the wrapper's own prop) — everything else is a plain passthrough. Matches action-button's original `successDuration={props.successDuration ?? 300}` / `disabled={props.disabled}` split exactly, generalized by construction rather than by field name. */
function wrapperConstructionPropsJsx(spec: ComponentSpec): string {
  const delayFields = new Set(
    spec.transitions.filter((t) => t.event === "AFTER" && spec.context.some((c) => c.name === t.delay)).map((t) => t.delay),
  );
  return spec.context
    .map((c) => `      ${c.name}={props.${c.name}${delayFields.has(c.name) ? " ?? 300" : ""}}`)
    .join("\n");
}

function wrapperRequiredSlotPropsJsx(spec: ComponentSpec): string {
  return spec.anatomy
    .filter((p) => p.contentSlot?.required !== false && p.contentSlot !== undefined)
    .map((p) => `      ${p.name}={${JSON.stringify(`${pascalCase(p.name)} content`)}}`)
    .join("\n");
}

export function emitStories(spec: ComponentSpec, storiesFilePath: string, filePath: string): void {
  const componentName = pascalCase(spec.name);
  const reachable = [...reachableStates(spec)];
  const initial = spec.states.find((s) => s.initial)!;
  const async = hasAsyncPendingPattern(spec);
  const withChildren = needsChildrenProp(spec);

  const storyBlocks: string[] = [];

  for (const stateName of reachable) {
    const state = spec.states.find((s) => s.name === stateName)!;
    if (state.initial) {
      storyBlocks.push(`export const ${pascalCase(state.name)}: Story = {};`);
      continue;
    }

    const path = shortestPathTo(spec, state.name) ?? [];
    const steps = path.map((t) => classify(spec, t));
    const hasUnsupported = steps.some((s) => s.kind === "unsupported");

    if (hasUnsupported) {
      const contextField = spec.context.find((c) => c.type === "boolean" && c.name === state.name);
      if (contextField) {
        storyBlocks.push(
          `// "${state.name}" has no play-function path (its transition isn't driven by click or a11y.keyboard) — reached via a construction prop instead, matching context field "${contextField.name}".\nexport const ${pascalCase(state.name)}: Story = {\n  args: { ${contextField.name}: true },\n};`,
        );
      } else {
        storyBlocks.push(
          `// "${state.name}" is reachable per the spec's transition graph but this generator found no click/keyboard/prop path to it automatically.\nexport const ${pascalCase(state.name)}: Story = {};`,
        );
      }
      continue;
    }

    const willReject = steps.some((s) => s.kind === "reject");
    // A target state that IS "pending" itself must not auto-settle — otherwise
    // the wrapper's onAction can resolve before the play function ever
    // observes the intermediate state (the same race the shared machine
    // suite hit in Fase 3 with a too-short successDuration).
    const settleMode = state.name === "pending" ? "never" : willReject ? "reject" : "resolve";
    const argsLine = async ? `\n  args: { settleMode: ${JSON.stringify(settleMode)} },` : "";
    const playLines = steps.map(stepToPlaySource).join("\n");

    storyBlocks.push(
      `export const ${pascalCase(state.name)}: Story = {${argsLine}
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole(${JSON.stringify(spec.a11y.role)});
${playLines}
    await waitFor(() => expect(button).toHaveAttribute("data-state", ${JSON.stringify(state.name)}));
  },
};`,
    );
  }

  const wrapperPropsType = [
    ...(async ? ['settleMode?: "resolve" | "reject" | "never"'] : []),
    ...spec.context.map((c) => `${c.name}?: ${c.type === "stringList" ? "string[]" : c.type}`),
  ].join("; ");

  const onStateChangeBlock = async
    ? `      onStateChange={(state) => {
        if (state === "pending" && props.settleMode !== "never") {
          const settle = props.settleMode === "reject" ? Promise.reject(new globalThis.Error("story error")) : Promise.resolve();
          settle.then(
            () => ref.current?.send({ type: "RESOLVE" }),
            () => ref.current?.send({ type: "REJECT" }),
          );
        }
      }}`
    : "";

  const constructionPropsJsx = wrapperConstructionPropsJsx(spec);
  const slotPropsJsx = wrapperRequiredSlotPropsJsx(spec);
  const wrapperPropLines = [constructionPropsJsx, slotPropsJsx, onStateChangeBlock].filter(Boolean).join("\n");
  const wrapperBody = withChildren ? "Save" : "";
  const wrapperJsx = withChildren
    ? `<${componentName}
      ref={ref}
${wrapperPropLines}
    >
      ${wrapperBody}
    </${componentName}>`
    : `<${componentName}
      ref={ref}
${wrapperPropLines}
    />`;

  const fullGraphWalk = hasFullGraphWalkShape(spec)
    ? `
/** Walks idle -> pending -> success -> idle -> pending -> error -> idle in one continuous interaction. */
export const FullGraphWalk: Story = {
  render: () => {
    const ref = useRef<${componentName}Handle>(null);
    let calls = 0;
    return (
      <${componentName}
        ref={ref}
        successDuration={300}
        onStateChange={(state) => {
          if (state === "pending") {
            calls += 1;
            const settle = calls === 1 ? Promise.resolve() : Promise.reject(new globalThis.Error("story error"));
            settle.then(
              () => ref.current?.send({ type: "RESOLVE" }),
              () => ref.current?.send({ type: "REJECT" }),
            );
          }
        }}
      >
        Save
      </${componentName}>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");

    await expect(button).toHaveAttribute("data-state", "idle");
    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("data-state", "success"));
    await waitFor(() => expect(button).toHaveAttribute("data-state", "idle"), { timeout: 2000 });

    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("data-state", "error"));
    button.focus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(button).toHaveAttribute("data-state", "idle"));
  },
};
`
    : "";

  const source = `${GENERATED_HEADER(filePath)}
import { useRef } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ${componentName}, type ${componentName}Handle } from "../../../packages/ui/src/${spec.name}/${spec.name}";

/**
 * One story per state reachable from "${initial.name}" (BFS over the spec's
 * transitions), plus one story that walks as much of the graph as a single
 * continuous interaction can cover. Regenerate with \`pnpm generate\` after
 * editing the spec — do not edit this file by hand.
 */
function ${componentName}Story(props: { ${wrapperPropsType} }) {
  const ref = useRef<${componentName}Handle>(null);
  return (
    ${wrapperJsx}
  );
}

const meta: Meta<typeof ${componentName}Story> = {
  title: "Generated/${componentName}",
  component: ${componentName}Story,
};

export default meta;
type Story = StoryObj<typeof ${componentName}Story>;

${storyBlocks.join("\n\n")}
${fullGraphWalk}`;

  writeFileSync(storiesFilePath, source);
}
