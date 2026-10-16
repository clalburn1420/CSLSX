import { HtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });

  // Click-to-load embed; the link works on its own when JS or the embed is unavailable.
  eleventyConfig.addShortcode("player", (provider, id, url, title = "") =>
    `<figure class="player" data-provider="${provider}" data-id="${id}"><a href="${url}">${title || "Play on " + provider}</a></figure>`);
}

export const config = {
  dir: { input: "src", output: "_site" },
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
  pathPrefix: process.env.PATH_PREFIX || "/",
};
