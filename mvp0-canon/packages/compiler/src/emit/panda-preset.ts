import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ComponentSpec } from "../../../../spec/schema/component.schema.js";
import { GENERATED_HEADER } from "../naming.js";

/** DTCG top-level category name -> Panda theme.tokens category name. */
const DTCG_TO_PANDA_CATEGORY: Record<string, string> = {
  color: "colors",
  radius: "radii",
  space: "spacing",
  fontSize: "fontSizes",
};

function isTokenLeaf(node: unknown): node is { $value: unknown; $type?: string } {
  return typeof node === "object" && node !== null && "$value" in node;
}

/** Recursively converts a DTCG subtree into Panda's { value } leaf shape. */
function convertDtcgNode(node: unknown): unknown {
  if (isTokenLeaf(node)) {
    return { value: node.$value };
  }
  if (typeof node === "object" && node !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith("$")) continue;
      out[key] = convertDtcgNode(value);
    }
    return out;
  }
  return node;
}

/** Converts the whole DTCG token document into a Panda theme.tokens fragment. */
function convertTokens(tokens: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [dtcgCategory, subtree] of Object.entries(tokens)) {
    if (dtcgCategory.startsWith("$")) continue;
    const pandaCategory = DTCG_TO_PANDA_CATEGORY[dtcgCategory];
    if (!pandaCategory) {
      throw new Error(
        `emitPandaPreset: DTCG category "${dtcgCategory}" has no Panda mapping — add one to DTCG_TO_PANDA_CATEGORY in emit/panda-preset.ts.`,
      );
    }
    out[pandaCategory] = convertDtcgNode(subtree);
  }
  return out;
}

export function emitPandaPreset(
  spec: ComponentSpec,
  tokens: Record<string, unknown>,
  outDir: string,
  filePath: string,
  tokensPath: string,
): void {
  const componentDir = path.join(outDir, "src", spec.name);
  mkdirSync(componentDir, { recursive: true });

  const pandaTokens = convertTokens(tokens);
  const source = `${GENERATED_HEADER(tokensPath)}
/** Panda theme.tokens fragment, mechanically converted from the DTCG token document. Register it in panda.config.ts's theme.extend.tokens. */
export const ${spec.name}Tokens = ${JSON.stringify(pandaTokens, null, 2)} as const;
`;
  writeFileSync(path.join(componentDir, "tokens.ts"), source);

  const recipeSource = emitRecipe(spec, filePath);
  writeFileSync(path.join(componentDir, "recipe.ts"), recipeSource);
}

/** Strips the leading DTCG category segment (e.g. "color.") from a token dot-path, leaving the Panda shorthand reference. */
function toPandaTokenRef(dtcgRef: string): string {
  return dtcgRef.split(".").slice(1).join(".");
}

function emitRecipe(spec: ComponentSpec, filePath: string): string {
  // A "component"-typed part (nests another generated component) has no
  // style-slot of its own here — its styling lives entirely inside its own
  // recipe. Only native ("element") parts get a Panda slot in this recipe.
  const styledParts = spec.anatomy.filter((p) => p.element !== undefined);
  const slots = styledParts.map((p) => JSON.stringify(p.name)).join(", ");

  const variantEntries = spec.states
    .map((state) => {
      const stateVisual = spec.visual[state.name] ?? {};
      const partEntries = styledParts
        .map((part) => {
          const partVisual = stateVisual[part.name] ?? {};
          const propLines = Object.entries(partVisual)
            .map(([prop, ref]) => `          ${prop}: ${JSON.stringify(toPandaTokenRef(ref))},`)
            .join("\n");
          return `        ${part.name}: {\n${propLines}\n        },`;
        })
        .join("\n");
      return `      ${state.name}: {\n${partEntries}\n      },`;
    })
    .join("\n");

  const initial = spec.states.find((s) => s.initial)?.name ?? spec.states[0]!.name;

  return `${GENERATED_HEADER(filePath)}
import { defineSlotRecipe } from "@pandacss/dev";

/**
 * Only the state-varying color properties (backgroundColor/color/borderColor)
 * come from the spec's visual block. Layout (padding, radius, gap, font
 * size, cursor) is NOT modeled in the spec — the schema's VisualProperty
 * enum only covers color — so the compiler supplies a fixed generic base
 * here, parametrized by this component's own token namespace (spec.name)
 * so two components never collide on the same "<name>.gap" token. See
 * METRICS.md, Fase 4, for why layout itself isn't spec-derived.
 */
export const ${spec.name}Recipe = defineSlotRecipe({
  className: ${JSON.stringify(`${spec.name}-generated`)},
  slots: [${slots}],
  base: {
    root: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: ${JSON.stringify(`${spec.name}.gap`)},
      paddingInline: ${JSON.stringify(`${spec.name}.paddingX`)},
      paddingBlock: ${JSON.stringify(`${spec.name}.paddingY`)},
      borderRadius: ${JSON.stringify(spec.name)},
      fontSize: ${JSON.stringify(spec.name)},
      fontWeight: "medium",
      borderWidth: "1px",
      borderStyle: "solid",
      cursor: "pointer",
      transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
      _disabled: { cursor: "not-allowed" },
    },
  },
  variants: {
    state: {
${variantEntries}
    },
  },
  defaultVariants: {
    state: ${JSON.stringify(initial)},
  },
});
`;
}
