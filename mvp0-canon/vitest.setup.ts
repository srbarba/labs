import "@testing-library/jest-dom/vitest";
import * as matchers from "vitest-axe/matchers";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";

expect.extend(matchers);
afterEach(cleanup);
