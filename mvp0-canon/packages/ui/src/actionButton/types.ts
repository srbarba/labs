// GENERATED — DO NOT EDIT. Source: spec/components/action-button.spec.json

export interface ActionButtonSchema {
  props: {
    disabled?: boolean;
    successDuration?: number;
    id?: string;
    ids?: Record<string, any>;
    getRootNode?: () => ShadowRoot | Document | Node;
    /** Fires with the raw event object whenever this machine processes ANY event (via Zag's `watch` hook) — the general-purpose escape hatch a composing parent's onChildEvent wiring (component.ts) uses to react to a nested component's own events, decoupled from the DOM. */
    onEvent?: (event: { type: string } & Record<string, any>) => void;
    [key: string]: any;
  };
  context: {
    disabled: boolean;
    successDuration: number;
  };
  refs: Record<string, never>;
  computed: Record<string, never>;
  state: "idle" | "pending" | "success" | "error" | "retrying" | "disabled";
  tag: never;
  guard: "notDisabled";
  action: never;
  effect: "successTimeout";
  event:
  | { type: "CLICK" }
  | { type: "RESOLVE" }
  | { type: "REJECT" }
  | { type: "DISMISS" }
  | { type: "DISABLE" }
  | { type: "ENABLE" }
  | { type: "SUCCESS_TIMEOUT" };
}
