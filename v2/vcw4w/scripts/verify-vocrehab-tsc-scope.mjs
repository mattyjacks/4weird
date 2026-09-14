import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptPath = fileURLToPath(import.meta.url);
const workdir = path.resolve(path.dirname(scriptPath), "..");

function runTsc() {
  return new Promise((resolve) => {
    exec("npx tsc --noEmit", {
      cwd: workdir,
      timeout: 280000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout ?? "", stderr: stderr ?? "" });
    });
  });
}

const { error, stdout, stderr } = await runTsc();
const combined = `${stdout}\n${stderr}`;
const lines = combined.split(/\r?\n/);

if (error && (error.code === "ENOENT" || /not recognized|not found/i.test(combined.slice(0, 500)))) {
  console.error(`verify-vocrehab-tsc-scope: FAIL tsc binary-not-found (${error.message.split("\n")[0]})`);
  process.exit(1);
}

if (error && (error.killed || error.signal === "SIGTERM" || /timed out|ETIMEDOUT/i.test(error.message))) {
  console.error(`verify-vocrehab-tsc-scope: FAIL tsc timeout (${error.message.split("\n")[0]})`);
  process.exit(1);
}

const hits = lines.filter((l) => l.toLowerCase().includes("vocrehab"));

if (hits.length > 0) {
  for (const line of hits.slice(0, 60)) console.log(line);
  console.log(`verify-vocrehab-tsc-scope: FAIL ${hits.length} vocrehab tsc hit(s)`);
  process.exit(1);
}

console.log("verify-vocrehab-tsc-scope OK: zero vocrehab errors");
process.exit(0);
