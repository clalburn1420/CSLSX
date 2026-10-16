import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Every file under dir, as filesystem paths. */
export function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
