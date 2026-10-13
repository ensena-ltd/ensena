// Node module-resolution hook: maps the "@/..." specifier (tsconfig.json's
// `paths: {"@/*": ["./src/*"]}`) to a real file under src/, trying the same
// extensions TypeScript would. Node's ESM resolver has no concept of
// tsconfig path mapping on its own, so `node --test` needs this to import
// any source file that itself imports via "@/...".
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcRoot = path.resolve(fileURLToPath(import.meta.url), "../../src");

function resolveWithExtension(filePath) {
  const candidates = [filePath, `${filePath}.ts`, `${filePath}.tsx`, path.join(filePath, "index.ts")];
  return candidates.find((candidate) => existsSync(candidate));
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = resolveWithExtension(path.join(srcRoot, specifier.slice(2)));
    if (resolved) {
      return nextResolve(pathToFileURL(resolved).href, context);
    }
  }
  return nextResolve(specifier, context);
}
