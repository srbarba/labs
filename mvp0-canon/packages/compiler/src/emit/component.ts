import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ComponentSpec, SlotFillValue } from "../../../../spec/schema/component.schema.js";
import { GENERATED_HEADER, pascalCase } from "../naming.js";

function slotFillExpression(fill: SlotFillValue): string {
  switch (fill.kind) {
    case "text":
      return JSON.stringify(fill.value);
    case "children":
      return "children";
    case "contextRef":
      // Reads the machine's resolved context value (default applied, live
      // if something later updates it) rather than the raw destructured
      // prop, which is undefined whenever the caller doesn't pass it.
      return `service.context.get(${JSON.stringify(fill.field)})`;
  }
}

export function emitComponent(spec: ComponentSpec, outDir: string, filePath: string): void {
  const componentDir = path.join(outDir, "src", spec.name);
  mkdirSync(componentDir, { recursive: true });

  const componentName = pascalCase(spec.name);
  const stateNames = spec.states.map((s) => JSON.stringify(s.name));
  const rootPart = spec.anatomy.find((p) => p.name === "root");
  if (!rootPart) {
    throw new Error(`emitComponent: anatomy has no part named "root" — the compiler needs one interactive part by convention.`);
  }
  if (!rootPart.element) {
    throw new Error(
      `emitComponent: "root" must be a native element, not a component reference (${filePath}) — this should have been rejected by verifyComposition's root-part-native rule before generation.`,
    );
  }
  const indicatorPart = spec.anatomy.find((p) => p.name === "indicator" && p.element !== undefined);
  const liveRegionPart = indicatorPart ?? rootPart;

  // Legacy convention, preserved only so pre-existing specs (action-button)
  // don't need to change: an anatomy part literally named "label" with no
  // explicit contentSlot still gets the component's `children` prop. Any
  // NEW spec that wants projected content declares `contentSlot` instead.
  const legacyLabelPart = spec.anatomy.find((p) => p.name === "label" && p.element !== undefined && p.contentSlot === undefined);
  const contentSlotParts = spec.anatomy.filter((p) => p.contentSlot !== undefined);
  const componentParts = spec.anatomy.filter((p) => p.component !== undefined);
  const usesChildrenForward = componentParts.some((p) => Object.values(p.slotFill ?? {}).some((f) => f.kind === "children"));
  const needsChildrenProp = legacyLabelPart !== undefined || usesChildrenForward;

  const keyboardEntries = Object.entries(spec.a11y.keyboard)
    .map(([key, eventName]) => `  ${JSON.stringify(key)}: ${JSON.stringify(eventName)},`)
    .join("\n");

  const nestedImports = [...new Set(componentParts.map((p) => p.component!))]
    .map((name) => `import { ${pascalCase(name)} } from "../${name}/${name}";`)
    .join("\n");
  const nestedImportsLine = nestedImports ? `\n${nestedImports}` : "";
  const reactNodeImport = contentSlotParts.length > 0 ? `\nimport type { ReactNode } from "react";` : "";

  const partsJsx = spec.anatomy
    .filter((p) => p.name !== "root")
    .map((part) => {
      if (part.component !== undefined) {
        const nestedComponentName = pascalCase(part.component);
        const fillProps = Object.entries(part.slotFill ?? {})
          .map(([slotName, fill]) => `${slotName}={${slotFillExpression(fill)}}`)
          .join(" ");
        return `      <${nestedComponentName}${fillProps ? ` ${fillProps}` : ""} />`;
      }
      const liveAttr = part.name === liveRegionPart.name && spec.a11y.ariaLive ? ` aria-live=${JSON.stringify(spec.a11y.ariaLive)}` : "";
      // contentSlot is the general mechanism; the "label"-name convention is a legacy fallback kept for pre-existing specs (see legacyLabelPart above).
      const children = part.contentSlot !== undefined ? `{props.${part.name}}` : part.name === "label" && legacyLabelPart ? "{children}" : "";
      return `      <${part.element} className={classes.${part.name}}${liveAttr}>${children}</${part.element}>`;
    })
    .join("\n");

  const contextFieldNames = spec.context.map((c) => c.name);
  const destructuredNames = [...(needsChildrenProp ? ["children"] : []), ...contextFieldNames, "onStateChange"];
  const machineProps = contextFieldNames.length > 0 ? `{ ${contextFieldNames.join(", ")} }` : "{}";

  const hasClickEvent = spec.events.some((e) => e.name === "CLICK");
  const hasPendingState = spec.states.some((s) => s.name === "pending");
  const hasDisabledState = spec.states.some((s) => s.name === "disabled");

  const propsFields = [
    needsChildrenProp ? "  children: string;" : "",
    ...contentSlotParts.map((p) => `  ${p.name}${p.contentSlot!.required ? "" : "?"}: ReactNode;`),
    ...spec.context.map((c) => `  ${c.name}?: ${c.type};`),
  ]
    .filter(Boolean)
    .join("\n");

  const ariaBusyLine = hasPendingState ? '      aria-busy={state === "pending"}\n' : "";
  const disabledAttrLine = hasDisabledState ? '      disabled={state === "disabled"}\n' : "";
  const onClickLine = hasClickEvent
    ? `      onClick={() => service.send({ type: "CLICK" } as ${componentName}Schema["event"])}\n`
    : "";

  const source = `${GENERATED_HEADER(filePath)}
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";${reactNodeImport}
import { useMachine } from "@zag-js/react";
import { ${spec.name} as ${spec.name}Recipe } from "styled-system/recipes";
import { ${spec.name}Machine } from "./machine";
import type { ${componentName}Schema } from "./types";${nestedImportsLine}

const STATES = [${stateNames.join(", ")}] as const;

const KEYBOARD_MAP: Record<string, string> = {
${keyboardEntries}
};

export interface ${componentName}Props {
${propsFields}
  /** Fires whenever the underlying state changes — the extension point business logic (e.g. wiring an async action) hooks into, since the spec has no way to express "call this callback and feed its result back as an event." */
  onStateChange?: (state: ${componentName}Schema["state"]) => void;
}

export interface ${componentName}Handle {
  send: (event: ${componentName}Schema["event"]) => void;
}

export const ${componentName} = forwardRef<${componentName}Handle, ${componentName}Props>(function ${componentName}(props, ref) {
  const { ${destructuredNames.join(", ")} } = props;
  const service = useMachine(${spec.name}Machine, ${machineProps} as Partial<${componentName}Schema["props"]>);

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
${ariaBusyLine}${disabledAttrLine}${onClickLine}      onKeyDown={handleKeyDown}
    >
${partsJsx}
    </${rootPart.element}>
  );
});
`;

  writeFileSync(path.join(componentDir, `${spec.name}.tsx`), source);

  const indexSource = `${GENERATED_HEADER(filePath)}
export { ${componentName}, type ${componentName}Props, type ${componentName}Handle } from "./${spec.name}";
export { ${spec.name}Machine } from "./machine";
export type { ${componentName}Schema } from "./types";
`;
  writeFileSync(path.join(componentDir, "index.ts"), indexSource);
}
