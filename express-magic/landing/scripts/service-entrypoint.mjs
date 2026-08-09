import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const landingDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const backendDir = path.resolve(landingDir, "../backend");
const serviceName = String(process.env.RENDER_SERVICE_NAME || "")
  .trim()
  .toLowerCase();
const externalHostname = String(process.env.RENDER_EXTERNAL_HOSTNAME || "")
  .trim()
  .toLowerCase();

const shouldRunBackend =
  serviceName === "fastship-backend" ||
  serviceName === "fastshipindia" ||
  externalHostname === "fastship-backend.onrender.com" ||
  externalHostname === "fastshipindia.onrender.com";

const mode = shouldRunBackend ? "backend" : "landing";
const cwd = shouldRunBackend ? backendDir : landingDir;
const command = shouldRunBackend ? "npm" : process.execPath;
const args = shouldRunBackend
  ? ["start"]
  : [path.join(landingDir, "scripts/serve-dist.mjs")];

if (String(process.env.SERVICE_ENTRYPOINT_DRY_RUN || "") === "true") {
  console.log(JSON.stringify({ mode, cwd, command, args }));
  process.exit(0);
}

console.log(
  `[service-entrypoint] starting ${mode} for ${serviceName || externalHostname || "local"}`,
);

const child = spawn(command, args, {
  cwd,
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error(`[service-entrypoint] failed to start ${mode}`, error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
