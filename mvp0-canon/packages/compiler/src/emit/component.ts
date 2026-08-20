import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ComponentSpec } from "../../../../spec/schema/component.schema.js";
import { GENERATED_HEADER, pascalCase } from "../naming.js";

const SPEC_PATH = "spec/components/action-button.spec.json";

export function emitComponent(spec: ComponentSpec, outDir: string): void {
  const componentDir = path.join(outDir, "src", spec.name);
  mkdirSync(componentDir, { recursive: true });

  const componentName = pascalCase(spec.name);
  const stateNames = spec.states.map((s) => JSON.stringify(s.name));
  const rootPart = spec.anatomy.find((p) => p.name === "root");
  if (!rootPart) {
    throw new Error(`emitComponent: anatomy has no part named "root" — the compiler needs one interactive part by convention.`);
  }
  const indicatorPart = spec.anatomy.find((p) => p.name === "indicator");
  const liveRegionPart = indicatorPart ?? rootPart;

  const keyboardEntries = Object.entries(spec.a11y.keyboard)
    .map(([key, eventName]) => `  ${JSON.stringify(key)}: ${JSON.stringify(eventName)},`)
    .join("\n");

  const partsJsx = spec.anatomy
    .filter((p) => p.name !== "root")
    .map((part) => {
      const liveAttr = part.name === liveRegionPart.name && spec.a11y.ariaLive ? ` aria-live=${JSON.stringify(spec.a11y.ariaLive)}` : "";
      // Convention: the part named "label" carries the button's text content.
      const children = part.name === "label" ? "{children}" : "";
      return `      <${part.element} className={classes.${part.name}}${liveAttr}>${children}</${part.element}>`;
    })
    .join("\n");

  const source = `${GENERATED_HEADER(SPEC_PATH)}
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useMachine } from "@zag-js/react";
import { ${spec.name} as ${spec.name}Recipe } from "styled-system/recipes";
import { ${spec.name}Machine } from "./machine";
import type { ${componentName}Schema } from "./types";

const STATES = [${stateNames.join(", ")}] as const;

const KEYBOARD_MAP: Record<string, string> = {
${keyboardEntries}
};

export interface ${componentName}Props {
  children: string;
  disabled?: boolean;
  successDuration?: number;
  /** Fires whenever the underlying state changes — the extension point business logic (e.g. wiring an async action) hooks into, since the spec has no way to express "call this callback and feed its result back as an event." */
  onStateChange?: (state: ${componentName}Schema["state"]) => void;
}

export interface ${componentName}Handle {
  send: (event: ${componentName}Schema["event"]) => void;
}

export const ${componentName} = forwardRef<${componentName}Handle, ${componentName}Props>(function ${componentName}(props, ref) {
  const { children, disabled, successDuration, onStateChange } = props;
  const service = useMachine(${spec.name}Machine, { disabled, successDuration } as Partial<${componentName}Schema["props"]>);

  useImperativeHandle(ref, () => ({ send: service.send }), [service]);

  const state = STATES.find((s) => service.state.matches(s))!;

  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current !== state) {
      prevState.current = state;
      onStateChange?.(state);
    }
  }, [state, onStateChange]);

  const classes = ${spec.name}Recipe({ state });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const eventName = KEYBOARD_MAP[event.key];
    if (eventName) service.send({ type: eventName } as ${componentName}Schema["event"]);
  };

  return (
    <${rootPart.element}
${rootPart.element === "button" ? '      type="button"\n' : ""}      className={classes.root}
      role={${JSON.stringify(spec.a11y.role)}}
      data-state={state}
      aria-busy={state === "pending"}
      disabled={state === "disabled"}
      onClick={() => service.send({ type: "CLICK" } as ${componentName}Schema["event"])}
      onKeyDown={handleKeyDown}
    >
${partsJsx}
    </${rootPart.element}>
  );
});
`;

  writeFileSync(path.join(componentDir, `${spec.name}.tsx`), source);

  const indexSource = `${GENERATED_HEADER(SPEC_PATH)}
export { ${componentName}, type ${componentName}Props, type ${componentName}Handle } from "./${spec.name}";
export { ${spec.name}Machine } from "./machine";
export type { ${componentName}Schema } from "./types";
`;
  writeFileSync(path.join(componentDir, "index.ts"), indexSource);
}
