import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ComponentSpec } from "../../../../spec/schema/component.schema.js";
import { GENERATED_HEADER, guardName, pascalCase, timeoutEffectName, timeoutEventName } from "../naming.js";

function tsLiteral(value: string | number | boolean): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function tsType(type: "string" | "number" | "boolean"): string {
  return type;
}

/** Every AFTER-marked transition, keyed by the state it fires from. */
function delayedTransitions(spec: ComponentSpec) {
  return spec.transitions.filter((t) => t.event === "AFTER");
}

function emitTypes(spec: ComponentSpec, filePath: string): string {
  const componentName = pascalCase(spec.name);
  const stateUnion = spec.states.map((s) => JSON.stringify(s.name)).join(" | ");

  const dispatchableEvents = spec.events.map((e) => `{ type: ${JSON.stringify(e.name)} }`);
  const timeoutEvents = delayedTransitions(spec).map((t) => `{ type: ${JSON.stringify(timeoutEventName(t.from))} }`);
  const eventUnion = [...dispatchableEvents, ...timeoutEvents].join("\n  | ");

  const guardNames = [...new Set(spec.transitions.filter((t) => t.guard).map((t) => guardName(t.guard!)))];
  const guardUnion = guardNames.length > 0 ? guardNames.map((g) => JSON.stringify(g)).join(" | ") : "never";

  const effectNames = [...new Set(delayedTransitions(spec).map((t) => timeoutEffectName(t.from)))];
  const effectUnion = effectNames.length > 0 ? effectNames.map((e) => JSON.stringify(e)).join(" | ") : "never";

  const contextFields = spec.context.map((c) => `    ${c.name}: ${tsType(c.type)};`).join("\n");
  const propsFields = spec.context.map((c) => `    ${c.name}?: ${tsType(c.type)};`).join("\n");

  return `${GENERATED_HEADER(filePath)}
export interface ${componentName}Schema {
  props: {
${propsFields}
    id?: string;
    ids?: Record<string, any>;
    getRootNode?: () => ShadowRoot | Document | Node;
    /** Fires with the raw event object whenever this machine processes ANY event (via Zag's \`watch\` hook) — the general-purpose escape hatch a composing parent's onChildEvent wiring (component.ts) uses to react to a nested component's own events, decoupled from the DOM. */
    onEvent?: (event: { type: string } & Record<string, any>) => void;
    [key: string]: any;
  };
  context: {
${contextFields}
  };
  refs: Record<string, never>;
  computed: Record<string, never>;
  state: ${stateUnion};
  tag: never;
  guard: ${guardUnion};
  action: never;
  effect: ${effectUnion};
  event:
  | ${eventUnion};
}
`;
}

function emitMachineSource(spec: ComponentSpec, filePath: string): string {
  const componentName = pascalCase(spec.name);
  const delayed = delayedTransitions(spec);
  const delayedByFrom = new Map(delayed.map((t) => [t.from, t]));

  const contextInit = spec.context
    .map((c) => `      ${c.name}: bindable(() => ({ defaultValue: prop(${JSON.stringify(c.name)}) ?? ${tsLiteral(c.default)} })),`)
    .join("\n");

  const initialState = spec.states.find((s) => s.initial);
  if (!initialState) {
    throw new Error(`emitMachine: no state is marked "initial: true" in ${filePath}`);
  }

  const statesSource = spec.states
    .map((state) => {
      const outgoing = spec.transitions.filter((t) => t.from === state.name && t.event !== "AFTER");
      const onLines = outgoing.map((t) => {
        const guard = t.guard ? `, guard: ${JSON.stringify(guardName(t.guard))}` : "";
        return `        ${t.event}: { target: ${JSON.stringify(t.to)}${guard} },`;
      });

      const delayedOut = delayedByFrom.get(state.name);
      const effectsLine = delayedOut ? `      effects: [${JSON.stringify(timeoutEffectName(delayedOut.from))}],\n` : "";
      if (delayedOut) {
        onLines.push(`        ${timeoutEventName(delayedOut.from)}: { target: ${JSON.stringify(delayedOut.to)} },`);
      }

      const onBlock = onLines.length > 0 ? `      on: {\n${onLines.join("\n")}\n      },\n` : "";
      return `    ${state.name}: {\n${effectsLine}${onBlock}    },`;
    })
    .join("\n");

  const guardNames = [...new Set(spec.transitions.filter((t) => t.guard).map((t) => guardName(t.guard!)))];
  const guardImpls = guardNames
    .map((g) => {
      const src = spec.transitions.find((t) => t.guard && guardName(t.guard!) === g)!.guard!;
      const negated = src.startsWith("!");
      const field = negated ? src.slice(1) : src;
      return `      ${g}: ({ context }) => ${negated ? "!" : ""}context.get(${JSON.stringify(field)}),`;
    })
    .join("\n");

  const effectImpls = delayed
    .map((t) => {
      const name = timeoutEffectName(t.from);
      const delayField = t.delay ?? "0";
      const delayExpr = spec.context.some((c) => c.name === t.delay) ? `context.get(${JSON.stringify(delayField)})` : delayField;
      return `      ${name}: ({ context, send }) => {
        const id = setTimeout(() => send({ type: ${JSON.stringify(timeoutEventName(t.from))} }), ${delayExpr});
        return () => clearTimeout(id);
      },`;
    })
    .join("\n");

  const implementationsBlock = [
    guardNames.length > 0 ? `    guards: {\n${guardImpls}\n    },` : "",
    delayed.length > 0 ? `    effects: {\n${effectImpls}\n    },` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${GENERATED_HEADER(filePath)}
import { setup } from "@zag-js/core";
import type { ${componentName}Schema } from "./types";

const { createMachine } = setup<${componentName}Schema>();

export const ${spec.name}Machine = createMachine({
  context({ prop, bindable }) {
    return {
${contextInit}
    };
  },
  initialState() {
    return ${JSON.stringify(initialState.name)};
  },
  states: {
${statesSource}
  },
  watch({ prop, event }) {
    prop("onEvent")?.(event.current());
  },
  implementations: {
${implementationsBlock}
  },
});
`;
}

export function emitMachine(spec: ComponentSpec, outDir: string, filePath: string): void {
  const componentDir = path.join(outDir, "src", spec.name);
  mkdirSync(componentDir, { recursive: true });
  writeFileSync(path.join(componentDir, "types.ts"), emitTypes(spec, filePath));
  writeFileSync(path.join(componentDir, "machine.ts"), emitMachineSource(spec, filePath));
}
