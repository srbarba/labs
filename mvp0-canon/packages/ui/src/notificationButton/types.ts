// GENERATED — DO NOT EDIT. Source: spec/components/notification-button.spec.json

export interface NotificationButtonSchema {
  props: {
    statusBadgeText?: string;
    id?: string;
    ids?: Record<string, any>;
    getRootNode?: () => ShadowRoot | Document | Node;
    [key: string]: any;
  };
  context: {
    statusBadgeText: string;
  };
  refs: Record<string, never>;
  computed: Record<string, never>;
  state: "default" | "active";
  tag: never;
  guard: never;
  action: never;
  effect: never;
  event:
  | { type: "CLICK" };
}
