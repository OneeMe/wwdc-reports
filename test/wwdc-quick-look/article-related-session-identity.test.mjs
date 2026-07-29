import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");
const checkerPath = join(
  projectRoot,
  "scripts/check-related-session-links.mjs",
);

function article(title, code) {
  return `---
title: "Fixture"
relatedSessions:
  - title: "${title}"
    code: "${code}"
---

## Related Sessions

- [${title}](/articles/wwdc2024-${code})
`;
}

function createFixture(t) {
  const fixtureRoot = mkdtempSync(
    join(tmpdir(), "wwdc-related-session-check-"),
  );
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));
  mkdirSync(join(fixtureRoot, "scripts"), { recursive: true });
  mkdirSync(join(fixtureRoot, "web/src/content/articles/ja"), {
    recursive: true,
  });
  writeFileSync(
    join(fixtureRoot, "scripts/check-related-session-links.mjs"),
    readFileSync(checkerPath),
  );
  writeFileSync(
    join(fixtureRoot, "web/sessions.json"),
    JSON.stringify({
      s: [
        [
          "2024",
          "10138",
          "Create a custom data store with SwiftData",
          "",
          "",
          "",
        ],
        [
          "2024",
          "10151",
          "Create custom visual effects with SwiftUI",
          "",
          "",
          "",
        ],
        [
          "2024",
          "10144",
          "What’s new in SwiftUI",
          "",
          "",
          "",
        ],
      ],
    }),
  );
  for (const code of ["10138", "10144", "10151"]) {
    writeFileSync(
      join(
        fixtureRoot,
        `web/src/content/articles/wwdc2024-${code}.mdx`,
      ),
      "---\n---\n",
    );
  }
  return fixtureRoot;
}

function runFixture(fixtureRoot) {
  return spawnSync(
    process.execPath,
    [
      join(fixtureRoot, "scripts/check-related-session-links.mjs"),
      "--years=2024",
    ],
    { cwd: fixtureRoot, encoding: "utf8" },
  );
}

describe("article related-session identity", () => {
  it("keeps 2020-2026 recommendation titles aligned with their target sessions", () => {
    const result = spawnSync(
      process.execPath,
      [
        checkerPath,
        "--years=2020,2021,2022,2023,2024,2025,2026",
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

  it("rejects a known session title that targets a different shared-topic session", (t) => {
    const fixtureRoot = createFixture(t);
    writeFileSync(
      join(
        fixtureRoot,
        "web/src/content/articles/wwdc2024-10137.mdx",
      ),
      article(
        "Create a custom data store with SwiftData",
        "10151",
      ),
    );

    const result = runFixture(fixtureRoot);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /wrong-session/);
    assert.match(result.stderr, /expected wwdc2024-10138/);
  });

  it("rejects an unknown newer title that is unrelated to its target session", (t) => {
    const fixtureRoot = createFixture(t);
    writeFileSync(
      join(
        fixtureRoot,
        "web/src/content/articles/wwdc2024-10137.mdx",
      ),
      article("Build complex queries with SwiftData", "10144"),
    );

    const result = runFixture(fixtureRoot);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /unverified-session-title/);
  });

  it("validates a frontmatter item independently of its body label", (t) => {
    const fixtureRoot = createFixture(t);
    writeFileSync(
      join(
        fixtureRoot,
        "web/src/content/articles/wwdc2024-10137.mdx",
      ),
      article(
        "Create a custom data store with SwiftData",
        "10138",
      ).replace(
        '  - title: "Create a custom data store with SwiftData"',
        '  - title: "Create custom visual effects with SwiftUI"',
      ),
    );

    const result = runFixture(fixtureRoot);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /frontmatter-wrong-session/);
    assert.match(result.stderr, /expected wwdc2024-10151/);
  });

  it("rejects a locale-only related-session target mismatch", (t) => {
    const fixtureRoot = createFixture(t);
    const fileName = "wwdc2024-10137.mdx";
    writeFileSync(
      join(fixtureRoot, "web/src/content/articles", fileName),
      article(
        "Create a custom data store with SwiftData",
        "10138",
      ),
    );
    writeFileSync(
      join(fixtureRoot, "web/src/content/articles/ja", fileName),
      article("SwiftData のカスタムデータストア", "10151"),
    );

    const result = runFixture(fixtureRoot);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /ja\/wwdc2024-10137\.mdx/);
    assert.match(result.stderr, /localized-target-mismatch/);
    assert.match(result.stderr, /expected wwdc2024-10138/);
  });

  it("rejects a locale-only body target mismatch when frontmatter is correct", (t) => {
    const fixtureRoot = createFixture(t);
    const fileName = "wwdc2024-10137.mdx";
    writeFileSync(
      join(fixtureRoot, "web/src/content/articles", fileName),
      article(
        "Create a custom data store with SwiftData",
        "10138",
      ),
    );
    writeFileSync(
      join(fixtureRoot, "web/src/content/articles/ja", fileName),
      article("SwiftData のカスタムデータストア", "10138").replace(
        "/articles/wwdc2024-10138",
        "/articles/wwdc2024-10151",
      ),
    );

    const result = runFixture(fixtureRoot);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /ja\/wwdc2024-10137\.mdx/);
    assert.match(result.stderr, /localized-target-mismatch/);
    assert.match(result.stderr, /expected wwdc2024-10138/);
  });
});
