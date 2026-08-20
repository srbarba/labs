import { readFileSync } from "node:fs";
import { z } from "zod";
import { ComponentSpec } from "../../../spec/schema/component.schema.js";
import type { ComponentSpec as ComponentSpecType } from "../../../spec/schema/component.schema.js";

export class SpecValidationError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly issues: z.ZodIssue[],
  ) {
    super(formatIssues(filePath, issues));
    this.name = "SpecValidationError";
  }
}

function formatIssues(filePath: string, issues: z.ZodIssue[]): string {
  const lines = issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `  - ${filePath} → ${path}: ${issue.message}`;
  });
  return [`Spec validation failed for ${filePath}:`, ...lines].join("\n");
}

/** Reads and parses a component spec file, throwing SpecValidationError on any schema violation. */
export function loadSpec(filePath: string): ComponentSpecType {
  const raw = readFileSync(filePath, "utf-8");
  const json = JSON.parse(raw);
  const result = ComponentSpec.safeParse(json);
  if (!result.success) {
    throw new SpecValidationError(filePath, result.error.issues);
  }
  return result.data;
}

/** Reads and parses the DTCG token file (no schema beyond well-formed JSON — tokens are consumed structurally). */
export function loadTokens(filePath: string): Record<string, unknown> {
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}
