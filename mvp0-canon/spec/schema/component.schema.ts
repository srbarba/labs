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
 * Loop-variable reference usable only inside an `items` template (see
 * `repeatOver` below): `$item` is the current array element (a string),
 * `$index` its position. Kept as an enum tag, not a free string, so it
 * stays data — never an expression — matching this file's own rule.
 */
const LoopRef = z.enum(["$item", "$index"]);

/**
 * The per-element template rendered once for every entry of the array
 * context field a `repeatOver` part iterates over. Deliberately a smaller,
 * non-recursive sibling of `AnatomyPart` (no `component`, no nested
 * `repeatOver`, no `contentSlot`) — one level of repetition is what this
 * MVP's falsification target needs (see spec/components/input-tags.spec.json),
 * not a general nested-list mechanism; see RESULTS.md for what that leaves out.
 *
 * `itemTextBinding: "$item"` renders the current array element's own string
 * value — the item-template counterpart of `AnatomyPart.textBinding`. `text`
 * is the item-template counterpart of `SlotFillValue`'s `"text"` kind: a
 * fixed literal (e.g. a "×" glyph on a delete-trigger button), never both
 * with `itemTextBinding` on the same item part. `ariaLabel`, similarly a
 * fixed literal, is what gives a glyph-only item part (like that same
 * delete-trigger) an accessible name — found necessary, not assumed: see
 * RESULTS.md.
 *
 * `onClick`/`onClickPayload` mirror `AnatomyPart.onClick`, except the
 * dispatched event's payload is built from the loop variables: each
 * `onClickPayload` entry names one of the target event's declared payload
 * fields and says which loop variable fills it (e.g. `{"index": "$index"}`
 * for a per-item delete button).
 */
const AnatomyItemPart = z
  .object({
    name: identifier,
    element: z.string().min(1),
    itemTextBinding: z.literal("$item").optional(),
    text: z.string().min(1).optional(),
    ariaLabel: z.string().min(1).optional(),
    onClick: z.string().min(1).optional(),
    onClickPayload: z.record(identifier, LoopRef).optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.onClickPayload !== undefined && item.onClick === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["onClickPayload"],
        message: `item part "${item.name}" declares onClickPayload but no "onClick" — onClickPayload only fills the payload of the event onClick dispatches.`,
      });
    }
    if (item.itemTextBinding !== undefined && item.text !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["text"],
        message: `item part "${item.name}" declares both itemTextBinding and text — a part's content can only come from one source.`,
      });
    }
  });

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
 *
 * `repeatOver` + `items` render this native part once per element of a
 * declared `stringList` context field, instead of once — the mechanism a
 * collection-shaped component (e.g. the tags in an input-tags widget) needs
 * to turn "one array in context" into "N independently-interactive DOM
 * nodes." `items` is the per-element template (see `AnatomyItemPart`); a
 * `repeatOver` part is otherwise a plain wrapper element and may not also
 * declare `textBinding`, `contentSlot`, `onClick`, or `component`.
 *
 * `submitOnEnter` marks a native (typically `input`) part as an uncontrolled
 * text field that, on Enter, reads its own current DOM value, dispatches
 * `submitOnEnter.event` with that (trimmed, non-empty) value under payload
 * field `submitOnEnter.payloadField`, and clears itself — the mechanism a
 * free-text entry point needs to feed a value INTO this spec's context via
 * a real dispatched event, as opposed to `textBinding` (context OUT).
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
    ariaLabel: z.string().min(1).optional(),
    repeatOver: identifier.optional(),
    items: z.array(AnatomyItemPart).min(1).optional(),
    submitOnEnter: z.object({ event: z.string().min(1), payloadField: identifier }).strict().optional(),
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
    const hasRepeat = part.repeatOver !== undefined;
    const hasItems = part.items !== undefined;
    if (hasRepeat !== hasItems) {
      ctx.addIssue({
        code: "custom",
        path: ["repeatOver"],
        message: `anatomy part "${part.name}" must declare both "repeatOver" and "items" together, or neither (has ${
          hasRepeat ? "repeatOver only" : "items only"
        }).`,
      });
    }
    if (hasRepeat && hasComponent) {
      ctx.addIssue({
        code: "custom",
        path: ["repeatOver"],
        message: `anatomy part "${part.name}" declares repeatOver but has a "component" reference — a repeated part must be a native element.`,
      });
    }
    if (hasRepeat && (part.textBinding !== undefined || part.contentSlot !== undefined || part.onClick !== undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["repeatOver"],
        message: `anatomy part "${part.name}" declares repeatOver together with textBinding/contentSlot/onClick — a repeated wrapper part can only have "items", nothing else.`,
      });
    }
    if (part.submitOnEnter !== undefined) {
      if (!hasElement) {
        ctx.addIssue({
          code: "custom",
          path: ["submitOnEnter"],
          message: `anatomy part "${part.name}" declares submitOnEnter but has no "element" — submitOnEnter only applies to native parts.`,
        });
      }
      if (hasRepeat || part.textBinding !== undefined || part.contentSlot !== undefined || part.onClick !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["submitOnEnter"],
          message: `anatomy part "${part.name}" declares submitOnEnter together with repeatOver/textBinding/contentSlot/onClick — submitOnEnter is its own, exclusive way of producing content for this part.`,
        });
      }
    }
  });

const StateDef = z.object({
  name: identifier,
  description: z.string().min(1),
  initial: z.boolean().optional().default(false),
  final: z.boolean().optional().default(false),
});

/**
 * Where a `push`/`removeAt` action's value comes from: the ONE payload field
 * of the event that triggered this transition (`increment`/`decrement` need
 * no source — their step is a fixed ±1 — so this is only ever set alongside
 * the other two ops; enforced below). Kept as a tagged reference, not an
 * expression, for the same reason every other field here is: a spec is
 * data, never code.
 */
const ContextActionSource = z.object({ kind: z.literal("payloadField"), field: identifier }).strict();

/**
 * A transition-level mutation of one of this spec's own `context` fields —
 * kept as plain data (a field reference plus one of a fixed set of
 * operations, plus where the value comes from), never a function, matching
 * this file's own rule that a spec is data, not code. This is what lets a
 * transition (e.g. a self-loop like `active --INCREMENT--> active`) do more
 * than just move between named states: context so far could only be read
 * (by a `guard`) or set once at construction — never written by an event.
 *
 * `increment`/`decrement` apply only to a "number" field (step is a fixed
 * ±1, no `source`). `push`/`removeAt` apply only to a "stringList" field and
 * require a `source` — `push` appends the payload value found there,
 * `removeAt` drops the array element at the (numeric) payload value found
 * there. Field-type and source-presence/absence are cross-checked in
 * verify.ts (against both this spec's `context[]` and the triggering
 * transition's own declared event `payload`), not here — same division of
 * labor as the rest of this schema's "shape here, cross-reference in verify".
 */
const ContextAction = z
  .object({
    field: identifier,
    op: z.enum(["increment", "decrement", "push", "removeAt"]),
    source: ContextActionSource.optional(),
  })
  .strict()
  .superRefine((action, ctx) => {
    const needsSource = action.op === "push" || action.op === "removeAt";
    if (needsSource && action.source === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["source"],
        message: `action targeting "${action.field}" with op "${action.op}" must declare "source" — push/removeAt need to know which payload field carries the value.`,
      });
    }
    if (!needsSource && action.source !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["source"],
        message: `action targeting "${action.field}" with op "${action.op}" must not declare "source" — increment/decrement always step by a fixed 1.`,
      });
    }
  });

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
  payload: z.record(z.string(), z.enum(["string", "number", "boolean"])).optional(),
});

const ContextField = z.object({
  name: identifier,
  type: z.enum(["string", "number", "boolean", "stringList"]),
  default: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
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
export type ContextActionSource = z.infer<typeof ContextActionSource>;
export type AnatomyItemPart = z.infer<typeof AnatomyItemPart>;
export type LoopRef = z.infer<typeof LoopRef>;
