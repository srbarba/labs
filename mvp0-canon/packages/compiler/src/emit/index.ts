import { rmSync, mkdirSync } from "node:fs";
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
}

/**
 * The orchestrator: packages/ui is deleted and rebuilt from scratch on
 * every run. Nothing in outDir is meant to survive a regeneration — if it
 * did, it wouldn't belong there.
 */
export function generate(options: GenerateOptions): void {
  const spec = loadSpec(options.specPath);
  const tokens = loadTokens(options.tokensPath);

  rmSync(options.outDir, { recursive: true, force: true });
  mkdirSync(path.join(options.outDir, "src", spec.name), { recursive: true });

  emitMachine(spec, options.outDir);
  emitPandaPreset(spec, tokens, options.outDir);
  emitComponent(spec, options.outDir);
  emitStories(spec, options.outDir);
  emitTests(spec, options.outDir);
}
