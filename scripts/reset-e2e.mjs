// Starts every test run from an empty database.
import { rmSync } from "node:fs";

rmSync("data/e2e-pg", { recursive: true, force: true });
