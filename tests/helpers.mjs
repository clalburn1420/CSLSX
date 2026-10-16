import { execSync } from "node:child_process";

let built = false;

// Builds the site once per test process; later callers reuse the output.
export function build() {
  if (built) return;
  execSync("npx @11ty/eleventy --quiet", { stdio: "pipe" });
  built = true;
}
