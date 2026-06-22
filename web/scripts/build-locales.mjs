import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const astroBin = path.join(webRoot, "node_modules", ".bin", "astro");
const finalDist = path.join(webRoot, "dist");

const chunks = [
  { lang: "en", label: "English articles" },
  { lang: "ja", label: "Japanese articles" },
  { lang: "zh", label: "Chinese articles and root pages" },
];

const buildWorkspaceLinkedDirectories = ["node_modules", "public"];
const buildWorkspaceCopiedDirectories = ["src"];
const buildWorkspaceFiles = [
  "astro.config.mjs",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
];

async function createBuildWorkspace(buildRoot) {
  await mkdir(buildRoot, { recursive: true });

  await Promise.all([
    ...buildWorkspaceLinkedDirectories.map((directory) =>
      symlink(path.join(webRoot, directory), path.join(buildRoot, directory), "dir")
    ),
    ...buildWorkspaceCopiedDirectories.map((directory) =>
      cp(path.join(webRoot, directory), path.join(buildRoot, directory), { recursive: true })
    ),
    ...buildWorkspaceFiles.map((file) =>
      cp(path.join(webRoot, file), path.join(buildRoot, file))
    ),
  ]);
}

function runAstroBuild(lang, buildRoot, outDir, cacheDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(astroBin, ["build", "--outDir", outDir], {
      cwd: buildRoot,
      env: {
        ...process.env,
        WWDC_ARTICLE_BUILD_LANG: lang,
        WWDC_ASTRO_CACHE_DIR: cacheDir,
      },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Astro build failed for ${lang} with exit code ${code}`));
      }
    });
  });
}

await rm(finalDist, { recursive: true, force: true });
const chunkRoot = await mkdtemp(path.join(tmpdir(), "wwdc-quick-look-localized-build-"));

try {
  for (const chunk of chunks) {
    const buildRoot = path.join(chunkRoot, "workspaces", chunk.lang);
    const outDir = path.join(chunkRoot, "dist", chunk.lang);
    const cacheDir = path.join(chunkRoot, "cache", chunk.lang);

    console.log(`\nBuilding ${chunk.label} (${chunk.lang})...`);
    await createBuildWorkspace(buildRoot);
    await runAstroBuild(chunk.lang, buildRoot, outDir, cacheDir);
    await cp(outDir, finalDist, { recursive: true, force: true });
  }
} finally {
  await rm(chunkRoot, { recursive: true, force: true });
}

console.log("\nLocalized Astro build complete.");
