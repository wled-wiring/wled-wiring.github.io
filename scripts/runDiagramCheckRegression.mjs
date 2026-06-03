import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repoRoot, "diagram-check-regression-tmp");
const outFile = path.join(outDir, `runner-${process.pid}-${Date.now()}.mjs`);

await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [path.join(repoRoot, "scripts", "diagramCheckRegression.ts")],
  outfile: outFile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  logLevel: "silent",
});

await import(pathToFileURL(outFile).href);
