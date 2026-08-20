import type { ComponentSpec } from "../../../spec/schema/component.schema.js";
import { VerificationError, type VerificationIssue } from "./verify.js";
import { buildComponentGraph, findCycle } from "./component-graph.js";
import type { DiscoveredSpec } from "./discover.js";

/**
 * Cross-spec completeness rules for component composition and
 * content-projection slots — a second rule family alongside `verify.ts`'s
 * six single-spec rules, kept in its own file because every rule here needs
 * the *whole registry*, not just one spec. `element`/`component` mutual
 * exclusivity is already enforced at the schema level (component.schema.ts's
 * `superRefine`) and isn't re-checked here.
 */
export function collectCompositionIssues(registry: Map<string, DiscoveredSpec>): VerificationIssue[] {
  const specs = new Map<string, ComponentSpec>([...registry].map(([name, d]) => [name, d.spec]));
  return [
    ...checkComponentReferenceExists(specs),
    ...checkCircularComponentReference(specs),
    ...checkRootPartNative(specs),
    ...checkSlotFillUnknownKey(specs),
    ...checkSlotFillMissingRequired(specs),
    ...checkSlotFillContextRefExists(specs),
  ];
}

export function verifyComposition(registry: Map<string, DiscoveredSpec>): void {
  const issues = collectCompositionIssues(registry);
  if (issues.length > 0) {
    throw new VerificationError(issues);
  }
}

/** Rule: every anatomy part's `component` reference must name a spec present in the registry. */
function checkComponentReferenceExists(specs: Map<string, ComponentSpec>): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const [name, spec] of specs) {
    for (const part of spec.anatomy) {
      if (part.component !== undefined && !specs.has(part.component)) {
        issues.push({
          rule: "component-reference-exists",
          path: `${name}.anatomy.${part.name}.component`,
          message: `anatomy part "${part.name}" references component "${part.component}", which isn't declared in the registry — known components are: ${[...specs.keys()].join(", ")}.`,
        });
      }
    }
  }
  return issues;
}

/** Rule: no component may (transitively) nest itself. */
function checkCircularComponentReference(specs: Map<string, ComponentSpec>): VerificationIssue[] {
  const cycle = findCycle(buildComponentGraph(specs));
  if (!cycle) return [];
  return [
    {
      rule: "circular-component-reference",
      path: cycle.join(" -> "),
      message: `circular component reference: ${cycle.join(" -> ")} — a component cannot (transitively) nest itself.`,
    },
  ];
}

/** Rule: the part named "root" must be a native element — it carries the DOM-event wiring (onClick/onKeyDown/role/...), which assumes a native element. */
function checkRootPartNative(specs: Map<string, ComponentSpec>): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const [name, spec] of specs) {
    const root = spec.anatomy.find((p) => p.name === "root");
    if (root?.component !== undefined) {
      issues.push({
        rule: "root-part-native",
        path: `${name}.anatomy.root`,
        message: `"root" cannot be a component reference (found component: "${root.component}") — root carries this component's own DOM-event wiring and must be a native element.`,
      });
    }
  }
  return issues;
}

/** Rule: every slotFill key must be the name of a part the referenced component declares as a contentSlot. */
function checkSlotFillUnknownKey(specs: Map<string, ComponentSpec>): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const [name, spec] of specs) {
    for (const part of spec.anatomy) {
      if (part.component === undefined || !part.slotFill) continue;
      const referenced = specs.get(part.component);
      if (!referenced) continue; // reported by checkComponentReferenceExists
      const declaredSlots = new Set(referenced.anatomy.filter((p) => p.contentSlot !== undefined).map((p) => p.name));
      for (const key of Object.keys(part.slotFill)) {
        if (!declaredSlots.has(key)) {
          issues.push({
            rule: "slot-fill-unknown-key",
            path: `${name}.anatomy.${part.name}.slotFill.${key}`,
            message: `slotFill key "${key}" isn't a contentSlot declared by "${part.component}" — declared contentSlots are: ${[...declaredSlots].join(", ") || "(none)"}.`,
          });
        }
      }
    }
  }
  return issues;
}

/** Rule: every required contentSlot on the referenced component must have a matching slotFill entry. */
function checkSlotFillMissingRequired(specs: Map<string, ComponentSpec>): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const [name, spec] of specs) {
    for (const part of spec.anatomy) {
      if (part.component === undefined) continue;
      const referenced = specs.get(part.component);
      if (!referenced) continue; // reported by checkComponentReferenceExists
      const filled = new Set(Object.keys(part.slotFill ?? {}));
      for (const slotPart of referenced.anatomy.filter((p) => p.contentSlot?.required !== false && p.contentSlot !== undefined)) {
        if (!filled.has(slotPart.name)) {
          issues.push({
            rule: "slot-fill-missing-required",
            path: `${name}.anatomy.${part.name}.slotFill.${slotPart.name}`,
            message: `"${part.component}" declares required contentSlot "${slotPart.name}" but anatomy part "${part.name}" (in "${name}") does not fill it — add slotFill.${slotPart.name}.`,
          });
        }
      }
    }
  }
  return issues;
}

/** Rule: every contextRef slot fill must reference a field declared in the REFERENCING spec's own context (not the nested component's). */
function checkSlotFillContextRefExists(specs: Map<string, ComponentSpec>): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const [name, spec] of specs) {
    const contextFields = new Set(spec.context.map((c) => c.name));
    for (const part of spec.anatomy) {
      if (!part.slotFill) continue;
      for (const [slotName, fill] of Object.entries(part.slotFill)) {
        if (fill.kind === "contextRef" && !contextFields.has(fill.field)) {
          issues.push({
            rule: "slot-fill-context-ref-exists",
            path: `${name}.anatomy.${part.name}.slotFill.${slotName}.field`,
            message: `slotFill.${slotName} references context field "${fill.field}", which isn't declared in "${name}"'s own context — declared context fields are: ${[...contextFields].join(", ") || "(none)"}.`,
          });
        }
      }
    }
  }
  return issues;
}
