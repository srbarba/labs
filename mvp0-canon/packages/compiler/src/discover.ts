import { readdirSync } from "node:fs";
import path from "node:path";
import { loadSpec } from "./load.js";
import type { ComponentSpec } from "../../../spec/schema/component.schema.js";

export interface DiscoveredSpec {
  spec: ComponentSpec;
  filePath: string;
}

/**
 * Loads every `*.spec.json` in `specsDir` (flat directory, no subfolders —
 * matches the current `spec/components/` layout) and returns them keyed by
 * `spec.name`. `filePath` is the real on-disk path, threaded through to the
 * emitters instead of a guessed one — the filename (kebab-case, e.g.
 * `action-button.spec.json`) doesn't match `spec.name` (camelCase,
 * `actionButton`), so it can't be reconstructed from the name alone.
 */
export function discoverSpecs(specsDir: string): Map<string, DiscoveredSpec> {
  const files = readdirSync(specsDir)
    .filter((f) => f.endsWith(".spec.json"))
    .sort();

  const registry = new Map<string, DiscoveredSpec>();
  for (const file of files) {
    const filePath = path.join(specsDir, file);
    const spec = loadSpec(filePath);
    const existing = registry.get(spec.name);
    if (existing) {
      throw new Error(
        `discoverSpecs: duplicate component name "${spec.name}" — declared in both ${existing.filePath} and ${filePath}.`,
      );
    }
    registry.set(spec.name, { spec, filePath });
  }
  return registry;
}
