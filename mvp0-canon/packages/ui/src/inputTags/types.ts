// GENERATED — DO NOT EDIT. Source: spec/components/input-tags.spec.json

export interface InputTagsSchema {
  props: {
    tags?: string[];
    id?: string;
    ids?: Record<string, any>;
    getRootNode?: () => ShadowRoot | Document | Node;
    /** Fires with the raw event object whenever this machine processes ANY event (via Zag's `watch` hook) — the general-purpose escape hatch a composing parent's onChildEvent wiring (component.ts) uses to react to a nested component's own events, decoupled from the DOM. */
    onEvent?: (event: { type: string } & Record<string, any>) => void;
    [key: string]: any;
  };
  context: {
    tags: string[];
  };
  refs: Record<string, never>;
  computed: Record<string, never>;
  state: "active";
  tag: never;
  guard: never;
  action: "pushTags" | "removeAtTags";
  effect: never;
  event:
  | { type: "ADD_TAG"; value: string; }
  | { type: "REMOVE_TAG"; index: number; };
}
