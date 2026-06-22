import { spawn } from "node:child_process";
import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const astroBin = path.join(webRoot, "node_modules", ".bin", "astro");
const finalDist = path.join(webRoot, "dist");
const chunkRoot = path.join(webRoot, ".astro", "localized-builds");

const chunks = [
  { lang: "en", label: "English articles" },
  { lang: "ja", label: "Japanese articles" },
  { lang: "zh", label: "Chinese articles and root pages" },
];

function runAstroBuild(lang, outDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(astroBin, ["build", "--outDir", outDir], {
      cwd: webRoot,
      env: {
        ...process.env,
        WWDC_ARTICLE_BUILD_LANG: lang,
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
await rm(chunkRoot, { recursive: true, force: true });

for (const chunk of chunks) {
  const outDir = path.join(chunkRoot, chunk.lang);
  console.log(`\nBuilding ${chunk.label} (${chunk.lang})...`);
  await rm(path.join(webRoot, ".astro"), { recursive: true, force: true });
  await runAstroBuild(chunk.lang, outDir);
  await cp(outDir, finalDist, { recursive: true, force: true });
}

await rm(chunkRoot, { recursive: true, force: true });
console.log("\nLocalized Astro build complete.");
