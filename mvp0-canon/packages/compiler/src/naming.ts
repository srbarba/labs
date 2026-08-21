/** Naming conventions shared by every emitter, so generated identifiers are consistent across destinations. */

export function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Internal event fired when a delayed (AFTER) transition out of `fromState` elapses. */
export function timeoutEventName(fromState: string): string {
  return `${fromState.toUpperCase()}_TIMEOUT`;
}

/** Effect implementation key for the delayed transition out of `fromState`. */
export function timeoutEffectName(fromState: string): string {
  return `${fromState}Timeout`;
}

/** Guard implementation key for a guard expression like "!disabled" or "disabled". */
export function guardName(expression: string): string {
  const negated = expression.startsWith("!");
  const field = negated ? expression.slice(1) : expression;
  return negated ? `not${pascalCase(field)}` : field;
}

/** Action implementation key for a transition's context mutation, e.g. {field:"count",op:"increment"} -> "incrementCount". */
export function contextActionName(action: { field: string; op: "increment" | "decrement" | "push" | "removeAt" }): string {
  return `${action.op}${pascalCase(action.field)}`;
}

export const GENERATED_HEADER = (sourcePath: string): string =>
  `// GENERATED — DO NOT EDIT. Source: ${sourcePath}\n`;
