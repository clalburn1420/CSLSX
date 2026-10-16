import { HtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });
}

export const config = {
  dir: { input: "src", output: "_site" },
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
  pathPrefix: process.env.PATH_PREFIX || "/",
};
