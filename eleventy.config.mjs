import { HtmlBasePlugin } from "@11ty/eleventy";
import { renderPlayer } from "./lib/player.mjs";

const toDate = (d) => (d instanceof Date ? d : new Date(String(d).length === 4 ? `${d}-01-01` : d));

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });

  // "30.07.2021"; a bare year ("2012") stays a year.
  eleventyConfig.addFilter("dateFmt", (d) => {
    if (/^\d{4}$/.test(String(d))) return String(d);
    const x = toDate(d);
    return [x.getUTCDate(), x.getUTCMonth() + 1].map((n) => String(n).padStart(2, "0")).join(".") + "." + x.getUTCFullYear();
  });
  eleventyConfig.addFilter("pad2", (n) => String(n).padStart(2, "0"));
  eleventyConfig.addFilter("isoDate", (d) => toDate(d).toISOString().slice(0, 10));

  eleventyConfig.addShortcode("player", renderPlayer);
}

export const config = {
  dir: { input: "src", output: "_site" },
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
  pathPrefix: process.env.PATH_PREFIX || "/",
};
