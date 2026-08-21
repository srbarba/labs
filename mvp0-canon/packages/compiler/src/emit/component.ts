import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ComponentSpec, SlotFillValue } from "../../../../spec/schema/component.schema.js";
import { GENERATED_HEADER, pascalCase } from "../naming.js";

function propsType(type: "string" | "number" | "boolean" | "stringList"): string {
  return type === "stringList" ? "string[]" : type;
}

/** The loop-variable expression an onChildEventPayload entry compiles to, inside the .map() callback emitted by repeatedComponentPartJsx below. */
function loopRefExpression(ref: "$item" | "$index"): string {
  return ref === "$item" ? "item" : "index";
}

/**
 * Builds a `component` part's `onEvent` prop — the callback that catches
 * every event the nested instance's own machine processes and, for each one
 * `onChildEvent` maps, forwards this spec's own mapped event. Shared by both
 * a single nested instance and a `repeatOver`-repeated one: `part.onChildEventPayload`
 * is only ever populated on a repeated part (schema-enforced), so on a
 * plain single instance every payload map is empty and this degrades to the
 * bare `{ type: parentEvent }` forward MVP 1/2 already established.
 */
function onEventForwardingProp(part: ComponentSpec["anatomy"][number], componentName: string): string {
  const childEventEntries = Object.entries(part.onChildEvent ?? {});
  if (childEventEntries.length === 0) return "";
  // Delivered through the nested component's own `onEvent` prop (a
  // machine-level `watch` hook, see emit/machine.ts) — a React callback,
  // not a DOM event — so it fires whether or not the nested markup is a DOM
  // descendant of anything, and is unaffected by the stopPropagation() this
  // same file adds to a component's own click handling below.
  //
  // The forwarded send() is deferred one macrotask (setTimeout 0), found
  // necessary by testing, not assumed: calling send() on a DIFFERENT
  // machine instance synchronously — or even microtask-deferred via
  // queueMicrotask — from inside watch()'s callback reliably hung the two
  // machines in an infinite mutual-update loop. A full macrotask tick lets
  // both machines' own reactive flush cycles settle first. See METRICS.md
  // for the isolated repro.
  //
  // `FORWARDED_CHILD_EVENTS.has(event)` guards against a SEPARATE hazard,
  // found (not assumed) building `InputTags`: Zag's `watch` hook re-invokes
  // `prop("onEvent")?.(event.current())` whenever ANY prop passed to
  // `useMachine` changes identity — including this very `onEvent` callback,
  // which this file recreates on every parent render (e.g. one .map() entry
  // per array element, so ANY unrelated parent re-render — typing in an
  // input, another item being added or removed — recreates all of them).
  // `event.current()` keeps returning the SAME object reference for the
  // nested instance's last real event, so without this guard a parent
  // re-render silently REPLAYS that stale event and re-sends its forward —
  // for a `repeatOver` part this corrupts the array (a stale REMOVE_TAG
  // replays against whatever now occupies that array position). The
  // WeakSet is module-scoped (not per-render) so a real send is recorded
  // once and never forwarded twice, for the lifetime of that event object.
  const lines = childEventEntries.map(([childEvent, parentEvent]) => {
    const payloadMap = part.onChildEventPayload?.[childEvent] ?? {};
    const payloadEntries = Object.entries(payloadMap)
      .map(([field, ref]) => `${field}: ${loopRefExpression(ref as "$item" | "$index")}`)
      .join(", ");
    const eventLiteral = `{ type: ${JSON.stringify(parentEvent)}${payloadEntries ? `, ${payloadEntries}` : ""} }`;
    return `          if (event.type === ${JSON.stringify(childEvent)} && !FORWARDED_CHILD_EVENTS.has(event)) {\n            FORWARDED_CHILD_EVENTS.add(event);\n            setTimeout(() => service.send(${eventLiteral} as ${componentName}Schema["event"]), 0);\n          }`;
  });
  return ` onEvent={(event) => {\n${lines.join("\n")}\n        }}`;
}

/**
 * Renders a `repeatOver` part: one instance of the referenced component per
 * element of the array context field it names — the mechanism a collection
 * (e.g. the tags in an input-tags widget) needs to go from "one array in
 * context" to "N independently-interactive, separately-composed component
 * instances," which no other anatomy part kind can express (every other
 * kind renders exactly once). Each instance gets the current loop element
 * via `slotFill`'s `"loopItem"` kind and, via `onChildEventPayload`, can
 * tell the parent which position in the array raised a forwarded event.
 */
function repeatedComponentPartJsx(part: ComponentSpec["anatomy"][number], componentName: string): string {
  const nestedComponentName = pascalCase(part.component!);
  const fillProps = Object.entries(part.slotFill ?? {})
    .map(([slotName, fill]) => `${slotName}={${slotFillExpression(fill)}}`)
    .join(" ");
  const onEventProp = onEventForwardingProp(part, componentName);
  return `      {(service.context.get(${JSON.stringify(part.repeatOver)}) as string[]).map((item: string, index: number) => (
        <${nestedComponentName} key={index}${fillProps ? ` ${fillProps}` : ""}${onEventProp} />
      ))}`;
}

/**
 * Renders a `submitOnEnter` part: an uncontrolled text input that, on Enter,
 * reads its own current DOM value directly (no controlled React state, no
 * context field for the in-progress draft), dispatches the declared event
 * with that value under the declared payload field, and clears itself.
 * Trimming + the non-empty guard are a fixed compiler convention (like the
 * base layout in panda-preset.ts) — the spec has no field for either.
 */
function submitOnEnterPartJsx(part: ComponentSpec["anatomy"][number], componentName: string): string {
  const { event: eventName, payloadField } = part.submitOnEnter!;
  const ariaLabelAttr = part.ariaLabel !== undefined ? `\n        aria-label=${JSON.stringify(part.ariaLabel)}` : "";
  return `      <${part.element}
        className={classes.${part.name}}${ariaLabelAttr}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const value = event.currentTarget.value.trim();
          if (!value) return;
          service.send({ type: ${JSON.stringify(eventName)}, ${payloadField}: value } as ${componentName}Schema["event"]);
          event.currentTarget.value = "";
        }}
      />`;
}

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
    case "loopItem":
      // Only valid (schema-enforced) inside the .map() callback repeatedComponentPartJsx emits, where "item" is the current array element.
      return "item";
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
  const textBindingPart = spec.anatomy.find((p) => p.textBinding !== undefined);
  const liveRegionPart = indicatorPart ?? textBindingPart ?? rootPart;

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
  // See onEventForwardingProp's own comment for why this exists: without
  // it, a parent re-render that merely recreates a nested instance's
  // onEvent callback (unavoidable for a repeatOver part rendered via
  // .map()) replays that instance's last real event again.
  const hasChildEventForwarding = componentParts.some((p) => p.onChildEvent !== undefined);
  const forwardedChildEventsLine = hasChildEventForwarding ? "\nconst FORWARDED_CHILD_EVENTS = new WeakSet<object>();\n" : "";

  const partsJsx = spec.anatomy
    .filter((p) => p.name !== "root")
    .map((part) => {
      if (part.repeatOver !== undefined) {
        return repeatedComponentPartJsx(part, componentName);
      }
      if (part.submitOnEnter !== undefined) {
        return submitOnEnterPartJsx(part, componentName);
      }
      if (part.component !== undefined) {
        const nestedComponentName = pascalCase(part.component);
        const fillProps = Object.entries(part.slotFill ?? {})
          .map(([slotName, fill]) => `${slotName}={${slotFillExpression(fill)}}`)
          .join(" ");
        const onEventProp = onEventForwardingProp(part, componentName);
        return `      <${nestedComponentName}${fillProps ? ` ${fillProps}` : ""}${onEventProp} />`;
      }
      const liveAttr = part.name === liveRegionPart.name && spec.a11y.ariaLive ? ` aria-live=${JSON.stringify(spec.a11y.ariaLive)}` : "";
      const ariaLabelAttr = part.ariaLabel !== undefined ? ` aria-label=${JSON.stringify(part.ariaLabel)}` : "";
      const typeAttr = part.element === "button" ? ' type="button"' : "";
      // The general per-part click mechanism (see AnatomyPart.onClick in the
      // schema) — needed once a component has more than one independently
      // clickable part, which root's own implicit CLICK handler can't
      // express. stopPropagation matches root's own onClick below, for the
      // same reason (isolates this click from an ancestor this component
      // might be nested inside).
      const onClickAttr = part.onClick
        ? ` onClick={(event) => {\n        event.stopPropagation();\n        service.send({ type: ${JSON.stringify(part.onClick)} } as ${componentName}Schema["event"]);\n      }}`
        : "";
      // contentSlot is the general mechanism for caller-provided content;
      // textBinding renders this spec's OWN live context value instead; the
      // "label"-name convention is a legacy fallback kept for pre-existing specs.
      const children =
        part.contentSlot !== undefined
          ? `{props.${part.name}}`
          : part.textBinding !== undefined
            ? `{String(service.context.get(${JSON.stringify(part.textBinding)}))}`
            : part.name === "label" && legacyLabelPart
              ? "{children}"
              : "";
      return `      <${part.element}${typeAttr}${ariaLabelAttr} className={classes.${part.name}}${liveAttr}${onClickAttr}>${children}</${part.element}>`;
    })
    .join("\n");

  const contextFieldNames = spec.context.map((c) => c.name);
  const destructuredNames = [...(needsChildrenProp ? ["children"] : []), ...contextFieldNames, "onStateChange", "onEvent"];
  const machinePropEntries = [...contextFieldNames, "onEvent"];
  const machineProps = `{ ${machinePropEntries.join(", ")} }`;

  const hasClickEvent = spec.events.some((e) => e.name === "CLICK");
  const hasPendingState = spec.states.some((s) => s.name === "pending");
  const hasDisabledState = spec.states.some((s) => s.name === "disabled");

  const propsFields = [
    needsChildrenProp ? "  children: string;" : "",
    ...contentSlotParts.map((p) => `  ${p.name}${p.contentSlot!.required ? "" : "?"}: ReactNode;`),
    ...spec.context.map((c) => `  ${c.name}?: ${propsType(c.type)};`),
  ]
    .filter(Boolean)
    .join("\n");

  const ariaBusyLine = hasPendingState ? '      aria-busy={state === "pending"}\n' : "";
  const disabledAttrLine = hasDisabledState ? '      disabled={state === "disabled"}\n' : "";
  // stopPropagation isolates this component's own click handling from any
  // ancestor's unrelated onClick (e.g. a parent this component might be
  // nested inside) — a composing parent that wants to react to THIS click
  // must opt in explicitly via onChildEvent (see the onEvent wiring above),
  // not rely on an accidental DOM bubble.
  const onClickLine = hasClickEvent
    ? `      onClick={(event) => {
        event.stopPropagation();
        service.send({ type: "CLICK" } as ${componentName}Schema["event"]);
      }}
`
    : "";

  const source = `${GENERATED_HEADER(filePath)}
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";${reactNodeImport}
import { useMachine } from "@zag-js/react";
import { ${spec.name} as ${spec.name}Recipe } from "styled-system/recipes";
import { ${spec.name}Machine } from "./machine";
import type { ${componentName}Schema } from "./types";${nestedImportsLine}
${forwardedChildEventsLine}
const STATES = [${stateNames.join(", ")}] as const;

const KEYBOARD_MAP: Record<string, string> = {
${keyboardEntries}
};

export interface ${componentName}Props {
${propsFields}
  /** Fires whenever the underlying state changes — the extension point business logic (e.g. wiring an async action) hooks into, since the spec has no way to express "call this callback and feed its result back as an event." */
  onStateChange?: (state: ${componentName}Schema["state"]) => void;
  /** Fires with the raw event object whenever this component's machine processes ANY event — the general escape hatch a composing parent's onChildEvent wiring uses to react to this component's own events without relying on DOM bubbling. */
  onEvent?: (event: { type: string } & Record<string, any>) => void;
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
