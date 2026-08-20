export type ActionButtonState = "idle" | "pending" | "success" | "error" | "disabled";

export type ActionButtonEvent =
  | { type: "CLICK" }
  | { type: "RESOLVE" }
  | { type: "REJECT" }
  | { type: "DISMISS" }
  | { type: "DISABLE" }
  | { type: "ENABLE" }
  | { type: "SUCCESS_TIMEOUT" };

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
  state: ActionButtonState;
  tag: never;
  guard: "isEnabled";
  action: never;
  effect: "successTimeout";
  event: ActionButtonEvent;
}
