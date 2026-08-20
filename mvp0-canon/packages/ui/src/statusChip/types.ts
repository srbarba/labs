// GENERATED — DO NOT EDIT. Source: spec/components/status-chip.spec.json

export interface StatusChipSchema {
  props: {

    id?: string;
    ids?: Record<string, any>;
    getRootNode?: () => ShadowRoot | Document | Node;
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
  | { type: "HIGHLIGHT" }
  | { type: "RESET" };
}
