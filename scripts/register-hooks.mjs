// Registers ts-alias-hooks.mjs so `node --test` can resolve this project's
// "@/..." import alias the same way tsconfig.json's `paths` does for the
// real Next.js build — without this, any src/**/*.test.ts that imports
// (even transitively) a file using "@/..." would fail to resolve under
// plain Node ESM.
import { register } from "node:module";

register("./ts-alias-hooks.mjs", import.meta.url);
