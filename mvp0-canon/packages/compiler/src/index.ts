import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadTokens, SpecValidationError } from "./load.js";
import { discoverSpecs } from "./discover.js";
import { collectCompletenessIssues, VerificationError, type VerificationIssue } from "./verify.js";
import { collectCompositionIssues } from "./verify-composition.js";
import { generate } from "./emit/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

const SPECS_DIR = path.join(root, "spec/components");
const TOKENS_PATH = path.join(root, "tokens/tokens.json");

function verify(): void {
  const registry = discoverSpecs(SPECS_DIR);
  const tokens = loadTokens(TOKENS_PATH);

  const issues: VerificationIssue[] = [];
  for (const { spec } of registry.values()) {
    issues.push(...collectCompletenessIssues(spec, tokens));
  }
  issues.push(...collectCompositionIssues(registry));

  if (issues.length > 0) {
    throw new VerificationError(issues);
  }

  const totalStates = [...registry.values()].reduce((n, d) => n + d.spec.states.length, 0);
  const totalTransitions = [...registry.values()].reduce((n, d) => n + d.spec.transitions.length, 0);
  console.log(
    `✔ ${registry.size} component spec(s) in ${SPECS_DIR} are schema-valid and complete (${totalStates} states, ${totalTransitions} transitions total)`,
  );
}

function run(): void {
  const command = process.argv[2];
  try {
    if (command === "verify") {
      verify();
    } else if (command === "generate") {
      verify();
      const registry = discoverSpecs(SPECS_DIR);
      // Generated files' "Source: ..." header shows a path relative to the
      // repo root (matching the pre-multi-component convention) rather than
      // the absolute path used internally to actually read the spec.
      const relativeRegistry = new Map(
        [...registry].map(([name, d]) => [name, { spec: d.spec, filePath: path.relative(root, d.filePath) }]),
      );
      generate({
        specs: relativeRegistry,
        tokensPath: TOKENS_PATH,
        tokensDisplayPath: path.relative(root, TOKENS_PATH),
        outDir: path.join(root, "packages/ui"),
        storiesDir: path.join(root, "apps/storybook/stories"),
        testsDir: path.join(root, "test/generated"),
      });
      console.log(`✔ generated packages/ui from ${registry.size} component spec(s)`);
    } else {
      console.error(`Unknown command: ${command}. Use "verify" or "generate".`);
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof SpecValidationError || error instanceof VerificationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

run();
