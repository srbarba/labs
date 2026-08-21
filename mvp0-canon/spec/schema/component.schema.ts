import { z } from "zod";

/**
 * Canon schema for a component specification.
 * This is DATA, not code: every field is a plain value or a reference
 * (token path, event name, state name) — never a function or expression.
 */

const identifier = z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/, "must be a camelCase identifier");

/**
 * How a `component`-typed anatomy part fills one of the referenced
 * component's declared `contentSlot` parts. Kept as plain data (a tagged
 * literal, a forwarding marker, or a reference to this spec's own context
 * field) — never an expression — matching this file's own rule that a spec
 * is data, not code.
 */
const SlotFillValue = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), value: z.string() }).strict(),
  z.object({ kind: z.literal("children") }).strict(),
  z.object({ kind: z.literal("contextRef"), field: identifier }).strict(),
]);

/**
 * A part is either a native DOM element (`element`) or an instance of
 * another component spec (`component`) — never both, never neither
 * (enforced below, since Zod's object model has no built-in XOR).
 *
 * `contentSlot` marks a native part as a content-projection point (what
 * gets rendered inside it is decided by whoever uses this component) — not
 * to be confused with PandaCSS's "slot recipe" (style-slots), a completely
 * different, purely-visual concept used elsewhere in this compiler.
 *
 * `slotFill` is only meaningful on a `component` part: it says what fills
 * each `contentSlot` the referenced component declares.
 *
 * `onChildEvent` is the mirror-image of `slotFill`, going the other
 * direction: a `component` part can map one of the referenced component's
 * own declared event names to one of THIS spec's own event names — "when
 * the nested instance processes event X, send my own event Y." It's
 * delivered through a machine-level hook (see emit/machine.ts's `watch`),
 * not the DOM, so it works whether or not the nested markup happens to be
 * a DOM descendant of anything that would otherwise catch a bubbled click.
 *
 * `onClick` is the general mechanism for a native part *other than* `root`
 * to dispatch one of this spec's own declared events on click — `root`
 * keeps its own separate, older convention (a bare `CLICK` event wired
 * automatically whenever the spec declares one; see emit/component.ts).
 * Needed once a component has more than one independently-clickable part
 * (e.g. two buttons), which `root`'s single implicit handler can't express.
 *
 * `textBinding` marks a native part's rendered content as the live,
 * stringified value of one of this spec's own `context` fields — the
 * general mechanism for a component to display its own state, as opposed
 * to `contentSlot` (content decided by the caller) or `slotFill`'s
 * `contextRef` (this spec's context forwarded into a NESTED component).
 */
const AnatomyPart = z
  .object({
    name: identifier,
    element: z.string().min(1).optional(),
    component: identifier.optional(),
    role: z.string().optional(),
    contentSlot: z.object({ required: z.boolean().optional().default(true) }).optional(),
    slotFill: z.record(identifier, SlotFillValue).optional(),
    onChildEvent: z.record(z.string().min(1), z.string().min(1)).optional(),
    onClick: z.string().min(1).optional(),
    textBinding: identifier.optional(),
  })
  .strict()
  .superRefine((part, ctx) => {
    const hasElement = part.element !== undefined;
    const hasComponent = part.component !== undefined;
    if (hasElement === hasComponent) {
      ctx.addIssue({
        code: "custom",
        path: ["element"],
        message: `anatomy part "${part.name}" must declare exactly one of "element" or "component" (has ${
          hasElement && hasComponent ? "both" : "neither"
        }).`,
      });
    }
    if (hasElement && part.slotFill !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["slotFill"],
        message: `anatomy part "${part.name}" declares slotFill but has no "component" reference — slotFill only applies to component parts.`,
      });
    }
    if (hasElement && part.onChildEvent !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["onChildEvent"],
        message: `anatomy part "${part.name}" declares onChildEvent but has no "component" reference — onChildEvent only applies to component parts.`,
      });
    }
    if (hasComponent && part.contentSlot !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["contentSlot"],
        message: `anatomy part "${part.name}" cannot be both a component reference and a declared contentSlot — nested-slot forwarding isn't supported.`,
      });
    }
    if (hasComponent && part.textBinding !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["textBinding"],
        message: `anatomy part "${part.name}" declares textBinding but has a "component" reference — textBinding only applies to native parts.`,
      });
    }
    if (part.contentSlot !== undefined && part.textBinding !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["textBinding"],
        message: `anatomy part "${part.name}" declares both contentSlot and textBinding — a part's content can only come from one source.`,
      });
    }
    if (part.name === "root" && part.onClick !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["onClick"],
        message: `anatomy part "root" cannot declare onClick — root uses the implicit CLICK-on-click convention instead (see emit/component.ts).`,
      });
    }
  });

const StateDef = z.object({
  name: identifier,
  description: z.string().min(1),
  initial: z.boolean().optional().default(false),
  final: z.boolean().optional().default(false),
});

/**
 * A transition-level mutation of one of this spec's own numeric `context`
 * fields — kept as plain data (a field reference plus one of two fixed
 * operations), never a function, matching this file's own rule that a spec
 * is data, not code. This is what lets a transition (e.g. a self-loop like
 * `active --INCREMENT--> active`) do more than just move between named
 * states: context so far could only be read (by a `guard`) or set once at
 * construction — never written by an event.
 */
const ContextAction = z
  .object({
    field: identifier,
    op: z.enum(["increment", "decrement"]),
  })
  .strict();

const TransitionDef = z.object({
  from: identifier,
  event: z.string().min(1),
  to: identifier,
  guard: z.string().optional(),
  delay: z.string().optional(),
  action: ContextAction.optional(),
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
export type SlotFillValue = z.infer<typeof SlotFillValue>;
export type ContextAction = z.infer<typeof ContextAction>;
