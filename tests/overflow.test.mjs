import { test, before } from "node:test";
import assert from "node:assert/strict";
import { build } from "./helpers.mjs";
import { findOverflow } from "../scripts/check-overflow.mjs";

before(build);

test("no page scrolls sideways at 320px or 375px", { timeout: 120000 }, async () => {
  assert.deepEqual(await findOverflow("_site", [320, 375]), []);
});
