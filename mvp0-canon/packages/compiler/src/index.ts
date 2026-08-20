import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadSpec, loadTokens, SpecValidationError } from "./load.js";
import { verifyCompleteness, VerificationError } from "./verify.js";
import { generate } from "./emit/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

const SPEC_PATH = path.join(root, "spec/components/action-button.spec.json");
const TOKENS_PATH = path.join(root, "tokens/tokens.json");

function verify(): void {
  const spec = loadSpec(SPEC_PATH);
  const tokens = loadTokens(TOKENS_PATH);
  verifyCompleteness(spec, tokens);
  console.log(`✔ ${SPEC_PATH} is schema-valid and complete (${spec.states.length} states, ${spec.transitions.length} transitions)`);
}

function run(): void {
  const command = process.argv[2];
  try {
    if (command === "verify") {
      verify();
    } else if (command === "generate") {
      verify();
      generate({
        specPath: SPEC_PATH,
        tokensPath: TOKENS_PATH,
        outDir: path.join(root, "packages/ui"),
        storiesFilePath: path.join(root, "apps/storybook/stories/action-button-generated.stories.tsx"),
        testsFilePath: path.join(root, "test/generated/action-button.generated.test.tsx"),
      });
      console.log("✔ generated packages/ui from the spec");
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
