import type { ComponentSpec } from "../../../spec/schema/component.schema.js";
import { reachableStates } from "./graph.js";

export interface VerificationIssue {
  rule: string;
  path: string;
  message: string;
}

export class VerificationError extends Error {
  constructor(public readonly issues: VerificationIssue[]) {
    super(
      [
        `Spec is schema-valid but incomplete (${issues.length} issue${issues.length === 1 ? "" : "s"}):`,
        ...issues.map((issue) => `  - [${issue.rule}] ${issue.path}: ${issue.message}`),
      ].join("\n"),
    );
    this.name = "VerificationError";
  }
}

/**
 * Completeness rules the schema alone cannot express (Fase 7). Each rule
 * returns zero or more issues; all issues from all rules are collected and
 * reported together so a single run surfaces every problem, not just the
 * first one.
 */
export function collectCompletenessIssues(spec: ComponentSpec, _tokens: Record<string, unknown>): VerificationIssue[] {
  return [
    ...checkVisualCoverage(spec),
    ...checkTransitionTargets(spec),
    ...checkReachability(spec),
    ...checkDeadEnds(spec),
    ...checkKeyboardEvents(spec),
    ...checkFocusBehaviour(spec),
    ...checkTransitionActionFields(spec),
    ...checkTextBindingFields(spec),
    ...checkPartClickEvents(spec),
  ];
}

export function verifyCompleteness(spec: ComponentSpec, tokens: Record<string, unknown>): void {
  const issues = collectCompletenessIssues(spec, tokens);
  if (issues.length > 0) {
    throw new VerificationError(issues);
  }
}

/** Rule: every state must style every anatomy part with at least one visual property. */
function checkVisualCoverage(spec: ComponentSpec): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const state of spec.states) {
    const stateVisual = spec.visual[state.name];
    if (!stateVisual) {
      issues.push({
        rule: "visual-coverage",
        path: `visual.${state.name}`,
        message: `state "${state.name}" has no visual treatment at all — add visual.${state.name} for each anatomy part.`,
      });
      continue;
    }
    // A "component"-typed part has no style-slot of its own in this recipe —
    // its styling lives entirely inside its own generated recipe (see
    // emit/panda-preset.ts), so it's excluded from this spec's coverage.
    for (const part of spec.anatomy.filter((p) => p.element !== undefined)) {
      const partVisual = stateVisual[part.name];
      if (!partVisual || Object.keys(partVisual).length === 0) {
        issues.push({
          rule: "visual-coverage",
          path: `visual.${state.name}.${part.name}`,
          message: `state "${state.name}" does not style part "${part.name}" — every anatomy part needs at least one visual property per state.`,
        });
      }
    }
  }
  return issues;
}

/** Rule: transitions must reference states that exist in the spec. */
function checkTransitionTargets(spec: ComponentSpec): VerificationIssue[] {
  const stateNames = new Set(spec.states.map((s) => s.name));
  const issues: VerificationIssue[] = [];
  spec.transitions.forEach((transition, index) => {
    if (!stateNames.has(transition.from)) {
      issues.push({
        rule: "transition-target",
        path: `transitions[${index}].from`,
        message: `transition references unknown state "${transition.from}" — declared states are: ${[...stateNames].join(", ")}.`,
      });
    }
    if (!stateNames.has(transition.to)) {
      issues.push({
        rule: "transition-target",
        path: `transitions[${index}].to`,
        message: `transition references unknown state "${transition.to}" — declared states are: ${[...stateNames].join(", ")}.`,
      });
    }
  });
  return issues;
}

/** Rule: every state must be reachable from the initial state via some transition path. */
function checkReachability(spec: ComponentSpec): VerificationIssue[] {
  const initial = spec.states.find((s) => s.initial);
  if (!initial) return [];

  const visited = reachableStates(spec);

  return spec.states
    .filter((s) => !visited.has(s.name))
    .map((s) => ({
      rule: "reachability",
      path: `states[?].name`,
      message: `state "${s.name}" is unreachable from the initial state "${initial.name}" — no chain of transitions leads to it.`,
    }));
}

/** Rule: a state with no outgoing transitions must be explicitly marked final. */
function checkDeadEnds(spec: ComponentSpec): VerificationIssue[] {
  const hasOutgoing = new Set(spec.transitions.map((t) => t.from));
  return spec.states
    .filter((s) => !hasOutgoing.has(s.name) && !s.final)
    .map((s) => ({
      rule: "dead-end",
      path: `states.${s.name}`,
      message: `state "${s.name}" has no outgoing transitions and is not marked final — either add a transition out of it or set final: true.`,
    }));
}

/** Rule: every event referenced from a11y.keyboard must be declared in the top-level events list. */
function checkKeyboardEvents(spec: ComponentSpec): VerificationIssue[] {
  const eventNames = new Set(spec.events.map((e) => e.name));
  const issues: VerificationIssue[] = [];
  for (const [key, eventName] of Object.entries(spec.a11y.keyboard)) {
    if (!eventNames.has(eventName)) {
      issues.push({
        rule: "keyboard-event",
        path: `a11y.keyboard.${key}`,
        message: `keyboard mapping "${key}" -> "${eventName}" references an event that isn't declared in events[] — declared events are: ${[...eventNames].join(", ")}.`,
      });
    }
  }
  return issues;
}

/** Rule: a transition's `action.field` must reference a declared, numeric context field — increment/decrement is only meaningful on a number. */
function checkTransitionActionFields(spec: ComponentSpec): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  spec.transitions.forEach((transition, index) => {
    if (!transition.action) return;
    const field = spec.context.find((c) => c.name === transition.action!.field);
    if (!field) {
      issues.push({
        rule: "transition-action-field-exists",
        path: `transitions[${index}].action.field`,
        message: `transition's action references context field "${transition.action.field}", which isn't declared in context[] — declared fields are: ${spec.context.map((c) => c.name).join(", ") || "(none)"}.`,
      });
    } else if (field.type !== "number") {
      issues.push({
        rule: "transition-action-field-exists",
        path: `transitions[${index}].action.field`,
        message: `transition's action (${transition.action.op}) targets context field "${field.name}", which is type "${field.type}" — increment/decrement only apply to a "number" field.`,
      });
    }
  });
  return issues;
}

/** Rule: an anatomy part's `textBinding` must reference a declared context field. */
function checkTextBindingFields(spec: ComponentSpec): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const part of spec.anatomy) {
    if (part.textBinding === undefined) continue;
    if (!spec.context.some((c) => c.name === part.textBinding)) {
      issues.push({
        rule: "text-binding-field-exists",
        path: `anatomy.${part.name}.textBinding`,
        message: `part "${part.name}" binds to context field "${part.textBinding}", which isn't declared in context[] — declared fields are: ${spec.context.map((c) => c.name).join(", ") || "(none)"}.`,
      });
    }
  }
  return issues;
}

/** Rule: an anatomy part's `onClick` must reference a declared event. */
function checkPartClickEvents(spec: ComponentSpec): VerificationIssue[] {
  const eventNames = new Set(spec.events.map((e) => e.name));
  const issues: VerificationIssue[] = [];
  for (const part of spec.anatomy) {
    if (part.onClick === undefined) continue;
    if (!eventNames.has(part.onClick)) {
      issues.push({
        rule: "part-click-event-exists",
        path: `anatomy.${part.name}.onClick`,
        message: `part "${part.name}" declares onClick "${part.onClick}", which isn't declared in events[] — declared events are: ${[...eventNames].join(", ") || "(none)"}.`,
      });
    }
  }
  return issues;
}

/** Rule: every state must declare its focus behaviour. */
function checkFocusBehaviour(spec: ComponentSpec): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const state of spec.states) {
    if (!(state.name in spec.a11y.focusBehaviour)) {
      issues.push({
        rule: "focus-behaviour",
        path: `a11y.focusBehaviour.${state.name}`,
        message: `state "${state.name}" does not declare a focus behaviour — add a11y.focusBehaviour.${state.name}.`,
      });
    }
  }
  return issues;
}
