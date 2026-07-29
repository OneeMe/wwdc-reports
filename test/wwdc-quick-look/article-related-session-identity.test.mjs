import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");

describe("article related-session identity", () => {
  it("keeps 2024-2026 recommendation titles aligned with their target sessions", () => {
    const result = spawnSync(
      process.execPath,
      [
        join(projectRoot, "scripts/check-related-session-links.mjs"),
        "--years=2024,2025,2026",
      ],
      {
        cwd: projectRoot,
        encoding: "utf8",
      },
    );

    assert.equal(
      result.status,
      0,
      [result.stdout, result.stderr].filter(Boolean).join("\n"),
    );
  });
});
