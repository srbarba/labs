// GENERATED — DO NOT EDIT. Source: spec/components/status-chip.spec.json

export interface StatusChipSchema {
  props: {

    id?: string;
    ids?: Record<string, any>;
    getRootNode?: () => ShadowRoot | Document | Node;
    /** Fires with the raw event object whenever this machine processes ANY event (via Zag's `watch` hook) — the general-purpose escape hatch a composing parent's onChildEvent wiring (component.ts) uses to react to a nested component's own events, decoupled from the DOM. */
    onEvent?: (event: { type: string } & Record<string, any>) => void;
    [key: string]: any;
  };
  context: {

  };
  refs: Record<string, never>;
  computed: Record<string, never>;
  state: "default" | "highlighted";
  tag: never;
  guard: never;
  action: never;
  effect: never;
  event:
  | { type: "CLICK" };
}
