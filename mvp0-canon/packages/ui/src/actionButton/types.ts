// GENERATED — DO NOT EDIT. Source: spec/components/action-button.spec.json

export interface ActionButtonSchema {
  props: {
    disabled?: boolean;
    successDuration?: number;
    id?: string;
    ids?: Record<string, any>;
    getRootNode?: () => ShadowRoot | Document | Node;
    [key: string]: any;
  };
  context: {
    disabled: boolean;
    successDuration: number;
  };
  refs: Record<string, never>;
  computed: Record<string, never>;
  state: "idle" | "pending" | "success" | "error" | "disabled";
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
