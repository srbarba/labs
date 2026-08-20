import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadTokens } from "../load.js";
import type { DiscoveredSpec } from "../discover.js";
import { buildComponentGraph, topologicalOrder } from "../component-graph.js";
import { emitMachine } from "./machine.js";
import { emitComponent } from "./component.js";
import { emitPandaPreset } from "./panda-preset.js";
import { emitStories } from "./stories.js";
import { emitTests } from "./tests.js";

export interface GenerateOptions {
  specs: Map<string, DiscoveredSpec>;
  tokensPath: string;
  /** Path shown in generated files' "Source: ..." header — may differ from tokensPath (e.g. relative vs. absolute). */
  tokensDisplayPath: string;
  outDir: string;
  storiesDir: string;
  testsDir: string;
}

/**
 * The orchestrator: packages/ui is deleted and rebuilt from scratch on every
 * run — package.json and tsconfig.json included, per the plan's own rule
 * ("si algo no se puede regenerar, no pertenece ahí") — for EVERY component
 * in the registry, not just one. Components are generated leaf-first
 * (topological order over `anatomy[].component` references) so a nested
 * component's generated module always exists on disk before the component
 * that imports it; `emitComponent` only ever reads *specs* from the
 * registry to know a nested component's slots, never its generated output,
 * so this ordering isn't strictly load-bearing for correctness today — it's
 * done anyway because the cycle-detection machinery already has to exist
 * for `verifyComposition`, and it keeps output deterministic.
 *
 * Stories and tests are emitted one file per component into `storiesDir`/
 * `testsDir` (outside outDir — they live alongside hand-written siblings),
 * so only those exact files are overwritten, never a whole tree.
 */
export function generate(options: GenerateOptions): void {
  const tokens = loadTokens(options.tokensPath);
  const specsByName = new Map([...options.specs].map(([name, d]) => [name, d.spec]));
  const order = topologicalOrder(buildComponentGraph(specsByName));

  rmSync(options.outDir, { recursive: true, force: true });
  mkdirSync(options.outDir, { recursive: true });
  emitPackageScaffold(options.outDir);

  for (const name of order) {
    const discovered = options.specs.get(name)!;
    const { spec, filePath } = discovered;
    mkdirSync(path.join(options.outDir, "src", spec.name), { recursive: true });

    emitMachine(spec, options.outDir, filePath);
    emitPandaPreset(spec, tokens, options.outDir, filePath, options.tokensDisplayPath);
    emitComponent(spec, options.outDir, filePath);
    emitStories(spec, path.join(options.storiesDir, `${spec.name}-generated.stories.tsx`), filePath);
    emitTests(spec, path.join(options.testsDir, `${spec.name}.generated.test.tsx`), filePath);
  }
}

/** package.json/tsconfig.json for the package as a whole — fixed shape, not spec-derived, but still emitted so nothing hand-written has to survive a delete-and-rebuild. */
function emitPackageScaffold(outDir: string): void {
  const packageJson = {
    name: "@mvp0/ui",
    private: true,
    version: "0.0.0",
    type: "module",
    main: "./src/index.ts",
    types: "./src/index.ts",
    scripts: {
      typecheck: "tsc --noEmit -p .",
    },
    dependencies: {
      "@zag-js/core": "1.43.1",
      "@zag-js/react": "1.43.1",
      react: "19.2.8",
      "react-dom": "19.2.8",
    },
    devDependencies: {
      "@types/react": "19.2.18",
      "@types/react-dom": "19.2.4",
      typescript: "7.0.2",
    },
  };
  writeFileSync(
    path.join(outDir, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );

  const tsconfig = {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      paths: {
        "styled-system/*": ["../../styled-system/*"],
      },
    },
    include: ["src"],
  };
  writeFileSync(path.join(outDir, "tsconfig.json"), `${JSON.stringify(tsconfig, null, 2)}\n`);
}
