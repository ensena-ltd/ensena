// Runs `next <command>` with a larger HTTP header limit (64KB instead of
// Node's 16KB default), so a browser carrying lots of cookies gets Ensena's
// /session-reset page (see src/proxy.ts) instead of "HTTP ERROR 431".
//
// The limit has to go through NODE_OPTIONS: `next dev` runs the real server
// in a child process and forwards NODE_OPTIONS to it, but not command-line
// node flags. Setting it here keeps `npm run dev` working on Windows, macOS
// and Linux without extra packages.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const HEADER_FLAG = "--max-http-header-size=65536";
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const existing = process.env.NODE_OPTIONS ?? "";
const nodeOptions = existing.includes("--max-http-header-size") ? existing : `${existing} ${HEADER_FLAG}`.trim();

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
