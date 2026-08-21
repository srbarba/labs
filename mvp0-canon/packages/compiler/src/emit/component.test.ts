import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ComponentSpec } from "../../../../spec/schema/component.schema.js";
import { emitComponent } from "./component.js";

function spec(overrides: Record<string, unknown>): ComponentSpec {
  return ComponentSpec.parse({
    name: "widget",
    version: "0.1.0",
    anatomy: [{ name: "root", element: "div" }],
    states: [{ name: "s", description: "s", initial: true }],
    transitions: [],
    events: [{ name: "EV" }],
    context: [],
    visual: {},
    a11y: { role: "generic", focusBehaviour: { s: "none" }, keyboard: {} },
    ...overrides,
  });
}

const tmpDirs: string[] = [];
function emitAndRead(s: ComponentSpec): string {
  const outDir = mkdtempSync(path.join(tmpdir(), "mvp0-canon-component-test-"));
  tmpDirs.push(outDir);
  emitComponent(s, outDir, `spec/components/${s.name}.spec.json`);
  return readFileSync(path.join(outDir, "src", s.name, `${s.name}.tsx`), "utf-8");
}

afterEach(() => {
  while (tmpDirs.length > 0) rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

describe("emitComponent — anatomy composition and content-projection slots", () => {
  it("element-only anatomy renders a plain native tag with no slot/component machinery", () => {
    const source = emitAndRead(spec({ anatomy: [{ name: "root", element: "div" }, { name: "icon", element: "span" }] }));
    expect(source).toContain('<span className={classes.icon}></span>');
    expect(source).not.toContain("ReactNode");
  });

  it("a contentSlot part becomes a ReactNode prop, rendered via props.<name>", () => {
    const source = emitAndRead(
      spec({
        anatomy: [{ name: "root", element: "div" }, { name: "label", element: "span", contentSlot: { required: true } }],
      }),
    );
    expect(source).toContain("import type { ReactNode } from \"react\";");
    expect(source).toContain("label: ReactNode;");
    expect(source).toContain("<span className={classes.label}>{props.label}</span>");
  });

  it("an optional contentSlot part becomes an optional ReactNode prop", () => {
    const source = emitAndRead(
      spec({
        anatomy: [{ name: "root", element: "div" }, { name: "label", element: "span", contentSlot: { required: false } }],
      }),
    );
    expect(source).toContain("label?: ReactNode;");
  });

  it("legacy shim: a 'label' part with NO contentSlot still gets {children}, matching pre-existing specs", () => {
    const source = emitAndRead(spec({ anatomy: [{ name: "root", element: "button" }, { name: "label", element: "span" }] }));
    expect(source).toContain("children: string;");
    expect(source).toContain("<span className={classes.label}>{children}</span>");
    expect(source).not.toContain("ReactNode");
  });

  it("a component part with a 'text' slotFill imports the nested component and passes a literal prop", () => {
    const source = emitAndRead(
      spec({
        anatomy: [
          { name: "root", element: "div" },
          { name: "badgePart", component: "badge", slotFill: { content: { kind: "text", value: "New" } } },
        ],
      }),
    );
    expect(source).toContain('import { Badge } from "../badge/badge";');
    expect(source).toContain('<Badge content={"New"} />');
  });

  it("a component part with a 'children' slotFill forwards the parent's own children prop and declares it", () => {
    const source = emitAndRead(
      spec({
        anatomy: [
          { name: "root", element: "div" },
          { name: "badgePart", component: "badge", slotFill: { content: { kind: "children" } } },
        ],
      }),
    );
    expect(source).toContain("children: string;");
    expect(source).toContain("const { children, onStateChange, onEvent } = props;");
    expect(source).toContain("<Badge content={children} />");
  });

  it("a component part with a 'contextRef' slotFill reads the machine's resolved context (default applied, not the raw possibly-undefined prop)", () => {
    const source = emitAndRead(
      spec({
        context: [{ name: "count", type: "number", default: 0 }],
        anatomy: [
          { name: "root", element: "div" },
          { name: "badgePart", component: "badge", slotFill: { content: { kind: "contextRef", field: "count" } } },
        ],
      }),
    );
    // `count` is still destructured from props — it feeds useMachine's construction props — but the
    // JSX itself reads service.context.get("count"), which has the spec's default already applied.
    expect(source).toContain("const { count, onStateChange, onEvent } = props;");
    expect(source).toContain('<Badge content={service.context.get("count")} />');
  });

  it("two parts referencing the same component produce two independent JSX instances and one deduplicated import", () => {
    const source = emitAndRead(
      spec({
        anatomy: [
          { name: "root", element: "div" },
          { name: "badgeA", component: "badge", slotFill: { content: { kind: "text", value: "A" } } },
          { name: "badgeB", component: "badge", slotFill: { content: { kind: "text", value: "B" } } },
        ],
      }),
    );
    expect(source.match(/import \{ Badge \}/g)?.length).toBe(1);
    expect(source).toContain('<Badge content={"A"} />');
    expect(source).toContain('<Badge content={"B"} />');
  });

  it("omits onClick/aria-busy/disabled when the spec has no CLICK event or pending/disabled states", () => {
    const source = emitAndRead(spec({ anatomy: [{ name: "root", element: "div" }] }));
    expect(source).not.toContain("onClick");
    expect(source).not.toContain("aria-busy");
    expect(source).not.toContain('disabled={state ===');
  });
});
