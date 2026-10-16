import { test } from "node:test";
import assert from "node:assert/strict";
import { renderPlayer } from "../lib/player.mjs";

const href = (html) => html.match(/class="player__link[^"]*" href="([^"]+)"/)[1];

test("SoundCloud: a public URL passed by the author is kept", () => {
  assert.equal(href(renderPlayer("soundcloud", "123456", "https://soundcloud.com/cslsx/new-track")), "https://soundcloud.com/cslsx/new-track");
});

test("SoundCloud: an API URL for a known track becomes its public page", () => {
  assert.equal(href(renderPlayer("soundcloud", "991250071", "https://api.soundcloud.com/tracks/991250071")), "https://soundcloud.com/cslsx/everything-is-alright");
});

test("SoundCloud: an API URL for an unknown track falls back to the artist page", () => {
  assert.equal(href(renderPlayer("soundcloud", "1", "https://api.soundcloud.com/tracks/1")), "https://soundcloud.com/cslsx");
});

test("the Play button names what it plays", () => {
  assert.match(renderPlayer("youtube", "r221_Qz7aZ4", "https://www.youtube.com/watch?v=r221_Qz7aZ4", "Holy Hell"), /<button [^>]*aria-label="Play Holy Hell"/);
});
