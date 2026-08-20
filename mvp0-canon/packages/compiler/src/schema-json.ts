import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ComponentSpec } from "../../../spec/schema/component.schema.js";

/** Publishes the canon schema as a plain JSON Schema document — useful for editors/IDEs, not consumed by the compiler itself. */
const here = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(here, "../../../spec/schema/component.schema.json");

const jsonSchema = z.toJSONSchema(ComponentSpec);
writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2) + "\n");
console.log(`✔ wrote ${outPath}`);
