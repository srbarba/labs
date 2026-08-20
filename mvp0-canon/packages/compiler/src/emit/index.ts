import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadSpec, loadTokens } from "../load.js";
import { emitMachine } from "./machine.js";
import { emitComponent } from "./component.js";
import { emitPandaPreset } from "./panda-preset.js";
import { emitStories } from "./stories.js";
import { emitTests } from "./tests.js";

export interface GenerateOptions {
  specPath: string;
  tokensPath: string;
  outDir: string;
  storiesFilePath: string;
  testsFilePath: string;
}

/**
 * The orchestrator: packages/ui is deleted and rebuilt from scratch on
 * every run — package.json and tsconfig.json included, per the plan's own
 * rule ("si algo no se puede regenerar, no pertenece ahí"). Stories and
 * tests are emitted to specific, clearly-named files outside outDir (they
 * live alongside hand-written siblings), so only those exact files are
 * overwritten, never a whole tree.
 */
export function generate(options: GenerateOptions): void {
  const spec = loadSpec(options.specPath);
  const tokens = loadTokens(options.tokensPath);

  rmSync(options.outDir, { recursive: true, force: true });
  mkdirSync(path.join(options.outDir, "src", spec.name), { recursive: true });

  emitPackageScaffold(options.outDir);
  emitMachine(spec, options.outDir);
  emitPandaPreset(spec, tokens, options.outDir);
  emitComponent(spec, options.outDir);
  emitStories(spec, options.storiesFilePath);
  emitTests(spec, options.testsFilePath);
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
