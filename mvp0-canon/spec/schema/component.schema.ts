import { z } from "zod";

/**
 * Canon schema for a component specification.
 * This is DATA, not code: every field is a plain value or a reference
 * (token path, event name, state name) — never a function or expression.
 */

const identifier = z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/, "must be a camelCase identifier");

const AnatomyPart = z.object({
  name: identifier,
  element: z.string().min(1),
  role: z.string().optional(),
});

const StateDef = z.object({
  name: identifier,
  description: z.string().min(1),
  initial: z.boolean().optional().default(false),
  final: z.boolean().optional().default(false),
});

const TransitionDef = z.object({
  from: identifier,
  event: z.string().min(1),
  to: identifier,
  guard: z.string().optional(),
  delay: z.string().optional(),
});

const EventDef = z.object({
  name: z.string().min(1),
  payload: z.record(z.string(), z.string()).optional(),
});

const ContextField = z.object({
  name: identifier,
  type: z.enum(["string", "number", "boolean"]),
  default: z.union([z.string(), z.number(), z.boolean()]),
});

/** Token reference in DTCG dot-path form, e.g. "color.actionButton.idle.bg". */
const TokenRef = z.string().regex(/^[a-zA-Z][a-zA-Z0-9.]*$/, "must be a DTCG dot-path token reference");

const VisualProperty = z.enum(["backgroundColor", "color", "borderColor"]);

const PartVisual = z.partialRecord(VisualProperty, TokenRef);

const StateVisual = z.record(identifier, PartVisual);

const A11y = z.object({
  role: z.string().min(1),
  ariaLive: z.enum(["off", "polite", "assertive"]).optional(),
  focusBehaviour: z.record(identifier, z.enum(["retain", "move-to-root", "none"])),
  keyboard: z.record(z.string(), z.string()),
});

export const ComponentSpec = z
  .object({
    name: identifier,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    anatomy: z.array(AnatomyPart).min(1),
    states: z.array(StateDef).min(1),
    transitions: z.array(TransitionDef),
    events: z.array(EventDef).min(1),
    context: z.array(ContextField),
    visual: z.record(identifier, StateVisual),
    a11y: A11y,
  })
  .strict();

export type ComponentSpec = z.infer<typeof ComponentSpec>;
export type StateDef = z.infer<typeof StateDef>;
export type TransitionDef = z.infer<typeof TransitionDef>;
export type AnatomyPart = z.infer<typeof AnatomyPart>;
export type EventDef = z.infer<typeof EventDef>;
export type ContextField = z.infer<typeof ContextField>;
